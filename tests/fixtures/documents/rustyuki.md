---
title: RustyUKI
description: A reliable, distribution-independent Unified Kernel Image lifecycle manager for Linux, featuring a decoupled three-stage pipeline, dual boot backends, and fail-safe trial boots.
date: 2026-11-05
tags:
  - Linux
  - Fedora
  - Rust
  - Systems
status: Released
art: code
featured: false
draft: false
sample: false
visual: dither
visualAccent: "#e58a58"
visualLabel: Fedora · UEFI · UKI · Rust
visualAnimate: false
drawing: uki
engineering:
  question: "Can maintaining a direct UKI boot path on Fedora be made manageable and recoverable?"
  approach: "Decouple generation, FAT32 staging, and boot activation with dual backends (systemd-boot and Direct UEFI) and late-userspace trial boots."
  constraint: "UEFI firmware only. FAT32 non-transactional filesystem limits require explicit cluster sync and fallback slot preservation."
  evidence: "v0.2.0 architecture, containerized CI, QEMU UEFI boot validation, and automated nightly Fedora RPM packages."
  nextCheck: "Measure physical firmware handover duration vs kernel early initialization across varied vendor motherboards."
  methods: ["Rust CLI", "dracut + ukify", "systemd-boot + Direct UEFI", "Trial boot state machine", "UEFI BootNext"]
---

I built RustyUKI as a Rust command-line tool and lifecycle manager for creating, installing, and safely booting [Unified Kernel Images (UKIs)](https://uapi-group.org/specifications/specs/unified_kernel_image/) on Fedora and other modern Linux distributions.

The project started from a simple frustration: even on fast NVMe storage, system startup can feel sluggish. While inspecting where that time was actually going, I noticed how much of the boot path happens before the Linux kernel even starts executing. That led me to UKIs, which combine the Linux kernel (`vmlinuz`), the initramfs (`dracut`), the kernel command line (`cmdline`), and OS release metadata into a single PE/COFF executable that UEFI firmware can load directly without an intermediate bootloader.

However, moving from an experimental proof-of-concept into real-world use on my daily Fedora workstation quickly revealed the real challenge: **managing the boot path is fundamentally a reliability and recovery problem.** If a tool modifies the EFI System Partition (ESP) or motherboard NVRAM in a fragile way, a single bad kernel update or sudden power loss can render a machine unbootable.

In version 0.2.0, I thoroughly rehabilitated RustyUKI from a prototype script into a decoupled, fail-safe lifecycle manager with atomic staging, late-userspace health assessment, and dual pluggable boot backends.

---

## The Three-Stage Decoupled Pipeline

Early prototype scripts often combine initramfs generation, binary assembly, partition writing, and NVRAM updates into one monolithic procedure. If anything fails halfway through—such as `dracut` running out of memory, or a misconfigured kernel argument—the system can be left with a truncated, unbootable binary on the ESP.

RustyUKI resolves this by enforcing a strict **three-stage decoupled pipeline** where failure at any stage leaves prior working boot entries untouched:

### Stage 1: Isolated Generation & Verification
Everything happens in an isolated staging directory (e.g. `/tmp/rustyuki-staging/`) without touching the ESP or firmware variables:
1. `dracut` compiles the initramfs with all required storage drivers (LUKS, LVM, btrfs subvolumes).
2. `ukify` packages the kernel binary, initramfs, normalized command line, `os-release`, and optional boot splash into a PE/COFF image.
3. If Secure Boot is configured, RustyUKI invokes `pesign` (via NSS database tokens) or `sbsign` (via PEM certificates).
4. Before proceeding, RustyUKI validates the generated PE binary: checking DOS `MZ` headers, verifying reasonable file size, and recording a cryptographic SHA-256 hash.

### Stage 2: Durable ESP Installation & Fallback Preservation
Writing to an EFI System Partition requires navigating the quirks of FAT32, which is an unjournaled, non-transactional filesystem:
- **Preflight Checks**: Verifies that the ESP is mounted read-write and has at least 50 MB of free storage.
- **Durable Staging**: The new UKI is written to a temporary sibling file (`.linux-<version>.efi.tmp`) and explicitly committed to flash media using `File::sync_all()`.
- **Fallback Slot Preservation**: If an existing `linux-<version>.efi` is present, it is moved to `linux-<version>.prev.efi` before replacement.
- **Atomic Rename**: The temporary file is renamed over the target path, and the parent directory is synchronized via `sync_directory_entry()` (handling VFAT driver `EINVAL`/`ENOTSUP` limitations while catching genuine I/O errors).
- **Provenance Manifests**: A sidecar `linux-<version>.efi.manifest.json` is generated, recording generator metadata, hashes, and distribution flavor.

### Stage 3: Boot Activation
The verified image is activated using one of two pluggable backends.

---

## Pluggable Dual Boot Backends

Rather than forcing a single boot philosophy, RustyUKI supports two first-class backends configured via `/etc/rustyuki/config.toml`:

### 1. `systemd-boot` (Default Production Priority)
For standard production workstations, `systemd-boot` provides the cleanest and safest experience:
- Places UKIs under `/EFI/Linux/` following the Type #2 UKI specification.
- Runs `bootctl update` to synchronize bootloader binaries.
- Supports multi-kernel selection menus out of the box.
- Avoids creating per-kernel NVRAM entries, preventing NVRAM storage exhaustion on motherboards with constrained firmware chipsets.
- Arms one-shot trial boots using `bootctl set-oneshot <entry>` and manages permanent defaults via `bootctl set-default`.

### 2. Direct UEFI Backend (First-Class Architecture)
For systems where firmware executes the UKI directly without any intermediate bootloader code:
- Resolves the underlying block device and ESP partition number automatically via `findmnt` and `lsblk`.
- Deduplicates existing entries to avoid accumulating stale boot variables across kernel updates.
- Arms one-shot trial booting using UEFI `BootNext`, leaving the permanent `BootOrder` untouched until confirmed.
- Monitors motherboard NVRAM capacity and reports firmware quirks.

---

## Boot Safety & Late-Userspace Health Assessment

The most dangerous pitfall in automated boot tools is **premature confirmation**. Traditional boot managers often consider a boot "successful" the moment systemd starts (`After=local-fs.target`). But if a graphic driver crashes, a display server fails to initialize, or the root filesystem drops into an emergency shell, the machine is completely unusable—yet an unbootable kernel would have been permanently promoted.

RustyUKI implements a fail-safe trial boot workflow:

1. **Trial Boot Armed**: During kernel installation or trial boot (`rustyuki install`), the new UKI is armed exclusively as a one-shot boot (`BootNext` or `bootctl set-oneshot`). The permanent default remains pointing to your existing, known-good bootloader entry.
2. **Late-Userspace Health Evaluation**:
   The confirmation service (`rustyuki-boot-confirm.service`) is ordered strictly late in the boot process:
   ```ini
   After=multi-user.target graphical.target systemd-user-sessions.service
   ```
3. **State Assessment**:
   When `rustyuki confirm` runs, it queries `systemctl is-system-running`:
   - If the system is `running` (or cleanly `degraded`), confirmation succeeds. The entry is promoted to permanent default and `BootNext` is cleared.
   - If the system dropped into `emergency`, `rescue`, or `maintenance` mode, **confirmation is aborted immediately**. The trial entry is not promoted.
4. **Automatic Fallback**:
   If the machine panics, freezes, or fails to reach graphical/multi-user targets, simply resetting or power-cycling the machine causes the firmware to fall back automatically to the prior working boot entry.

---

## Automatic Rollback & Foreign UKI Protection

If an updated kernel introduces subtle bugs after confirmation, recovery does not require manual initramfs rebuilding:
```bash
sudo rustyuki rollback --kernel <version>
```
This moves the preserved `linux-<version>.prev.efi` back into the active slot. RustyUKI stages the rollback through a temporary file before renaming, keeping the backup slot intact so repeated recovery attempts remain safe.

Furthermore, RustyUKI inspects sidecar `.manifest.json` files during cleanup and reconciliation. Any UKI on the ESP that lacks a RustyUKI manifest is treated as an unmanaged or foreign UKI (such as an image installed by another distribution or tool) and will **never** be pruned or deleted.

---

## Automated Kernel Hook & Packaging

To make UKI maintenance zero-touch during routine system updates:

- **`kernel-install` Plugin (`90-rustyuki.install`)**:
  Integrated into the distribution kernel lifecycle. When `dnf` installs or removes a kernel, RustyUKI automatically builds or cleans up the corresponding UKI.
- **Failure Registry**:
  If a build fails (e.g. disk full), the error is recorded persistently under `/var/lib/uki-build/pending-failures/` without failing the RPM scriptlet, preventing broken package manager transactions.
- **Offline Building (`--sysroot`)**:
  Supports generating UKIs into chroots or disk images without probing or leaking host `/proc`, `/sys`, or host UEFI NVRAM.
- **RPM Packaging & CI Infrastructure**:
  Packaged as an RPM targeting Fedora 44 and Fedora 45. The codebase is tested continuously via GitHub Actions using containerized checks, unit tests, and real QEMU UEFI VM integration tests. Nightly RPM releases are automatically published on every commit to `main`.

---

## Project Links

- [RustyUKI GitHub Repository](https://github.com/GlitchSlayed/RustyUKI)
- [Architecture & Pipeline Documentation](https://github.com/GlitchSlayed/RustyUKI/blob/main/docs/architecture.md)
- [Boot Safety & Trial Workflow Guide](https://github.com/GlitchSlayed/RustyUKI/blob/main/docs/boot-flow-and-safety.md)
- [Unified Kernel Image Specification](https://uapi-group.org/specifications/specs/unified_kernel_image/)
