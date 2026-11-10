---
title: "GOFR: Glitchy's Opinionated Fedora Remix"
description: A working, experimental Fedora 45 remix featuring Unified Kernel Images (UKIs) via systemd-boot, the CachyOS performance kernel, RustyUKI lifecycle management, and a Netinstall-first delivery architecture.
category: Operating Systems
status: Prototype
tags:
  - Fedora
  - Systemd
  - Rust
  - Linux Kernel
  - Open Source
date: 2026-10-24
art: code
featured: true
draft: false
visual: dither
visualAccent: "#739cda"
visualLabel: Fedora remix · In Development
visualAnimate: false
drawing: gofr
engineering:
  question: "Can an opinionated Fedora remix eliminate bootloader bottlenecks and deliver modern performance defaults while maintaining complete upstream compatibility?"
  approach: "Combine a lightweight Netinstall-first ISO with systemd-boot, Type #2 Unified Kernel Images managed by RustyUKI, the CachyOS performance kernel, and a 4 GiB ESP on Btrfs."
  constraint: "x86_64 UEFI-only. Experimental installer delivery; requires active network for Netinstall package resolution."
  evidence: "Functional Netinstall hybrid UEFI ISO (< 1 GiB), reproducible QEMU/OVMF boot verification, automated release pipeline with incremental build tags (45.x), and local disk image builders."
  nextCheck: "Validate bare-metal Anaconda Netinstall flow and Secure Boot MOK enrollment workflow."
  methods: ["Netinstall ISO", "CachyOS kernel", "systemd-boot", "RustyUKI", "Btrfs subvolumes", "Brush shell"]
---
# GOFR: Glitchy's Opinionated Fedora Remix

**GOFR** (pronounced *Gopher*) is an opinionated **Fedora 45** remix designed around a straightforward objective: take the rock-solid foundation of Fedora Workstation and modernize its boot subsystem, kernel scheduling, command-line defaults, and delivery architecture.

What began as a theoretical exploration of modern Linux defaults has evolved into a **working, albeit experimental, operating system distribution**. GOFR now possesses functional build pipelines, custom RPM packages, bootable hybrid UEFI Netinstall ISOs, virtual disk images, and automated QEMU/OVMF verification harnesses.

The goal is not to fork Fedora or reinvent the Linux desktop. Instead, GOFR preserves upstream package compatibility and SELinux enforcement while adopting **Unified Kernel Images (UKIs)** via `systemd-boot`, the **CachyOS performance kernel**, **RustyUKI** lifecycle management, and a **Netinstall-first delivery architecture**.

*(As a brief heads-up: I frequently use the handle **Glitchy** or **GlitchSlayed** online, which is where the remix's name originates).*

---

## The Netinstall-First Delivery Architecture

Rather than distributing monolithic multi-gigabyte live images that quickly grow stale, GOFR is engineered around a **Netinstall-first delivery model**:

- **Ultra-Compact ISO (< 1 GiB):** The primary bootable hybrid UEFI ISO weighs under 100 MiB (~84 MiB). It downloads in seconds and fits comfortably within GitHub Releases asset constraints.
- **Always Up to Date:** At installation time, packages stream dynamically from official Fedora 45 and CachyOS mirrors. You install the latest software and security updates directly, completely eliminating the tedious post-install multi-gigabyte `dnf upgrade` ritual.
- **Modular Profile Deployment:** Because packages are resolved dynamically via Kickstart and Anaconda, deployments can target different workstation personas—ranging from standard GNOME on Wayland to minimal window managers (Sway, COSMIC) or specialized engineering toolchains.
- **Pure UKI & systemd-boot Provisioning:** During installation, GOFR automatically formats a dedicated **4 GiB FAT32 ESP at `/efi`** and configures a **Btrfs root filesystem with `@` and `@home` subvolumes**, generating the initial UKI using RustyUKI without legacy GRUB scaffolding.

For instant virtualization and cloud testing without running the interactive installer, the build system also produces pre-installed QCOW2 virtual machine disk images (~3.0 GiB), sliced deterministically into 1800MB chunks (`.part00`, `.part01`) to comply with GitHub's 2.0 GiB file limit.

---

## Technical Specifications & Architecture

| Component | Upstream Fedora 45 Default | GOFR Implementation | Status |
|---|---|---|---|
| **Base Distribution** | Fedora Workstation 45 (`x86_64`) | Fedora Workstation 45 (`x86_64`) | Verified |
| **Desktop Environment** | GNOME 49 / Wayland | GNOME 49 / Wayland | Verified |
| **Package Management** | DNF5 / RPM | DNF5 / RPM | Verified |
| **Kernel** | Stock upstream Fedora kernel | [CachyOS Kernel](https://github.com/CachyOS/linux-cachyos) (`kernel-cachyos`) | Verified |
| **CPU Scheduler** | EEVDF | BORE (Burst-Oriented Response Enhancer) | Verified |
| **Bootloader** | GRUB 2 (`grub2-efi`) | `systemd-boot` | Verified |
| **Boot Artifact** | Kernel + Initramfs + BLS Type #1 | BLS Type #2 Unified Kernel Image (PE32+) | Verified |
| **UKI Orchestration** | None (manual scripts or experimental dracut) | [RustyUKI](https://github.com/GlitchSlayed/RustyUKI) + `gofr-rustyuki-integration` | Verified |
| **EFI System Partition** | 500 MiB – 1 GiB (`/boot/efi`) | **4 GiB FAT32** mounted at `/efi` | Verified |
| **Filesystem Layout** | Btrfs (`root`, `home`) with `/boot` partition | Btrfs (`@`, `@home`), **no separate `/boot`** | Verified |
| **Swap** | zram-generator | zram-generator | Verified |
| **Default User Shell** | `/bin/bash` | [Brush](https://github.com/reubeno/brush) (Rust, Bash-compatible) | Verified |
| **Command-Line Tools** | GNU coreutils | `zoxide`, `uutils-coreutils`, `ripgrep`, `fd-find`, `bat`, `eza`, `btop` | Verified |
| **Repositories** | Fedora Base, Updates | Base, Updates, RPM Fusion Free & Nonfree, CachyOS COPR | Verified |
| **Security** | SELinux Enforcing | SELinux Enforcing | Verified |
| **Target Platform** | x86_64 UEFI | x86_64 UEFI (v3 microarchitecture recommended) | Verified |

---

## Boot Subsystem & Storage Topology

GOFR discards the legacy partition hierarchy—specifically the traditional separation between `/boot` and `/boot/efi`—in favor of a unified UEFI standard.

```
[ UEFI Firmware ]
       │
       ▼
[ /efi (4 GiB FAT32 ESP) ]
       ├── EFI/BOOT/BOOTX64.EFI          (systemd-boot boot manager)
       ├── loader/loader.conf            (timeout, default entries)
       └── EFI/Linux/                    (BLS Type #2 Unified Kernel Images)
             ├── gofr-cachyos.efi        (Active CachyOS UKI)
             └── gofr-cachyos.prev.efi   (Fallback slot)
       │
       ▼
[ /dev/disk/by-uuid/... (Btrfs Root) ]
       ├── Subvolume @                   (Mounted at /)
       └── Subvolume @home               (Mounted at /home)
```

### Why a 4 GiB ESP at `/efi`?

Standard Linux distributions typically allocate 512 MiB to 1 GiB for the ESP. In a pure Unified Kernel Image model, each self-contained UKI binary bundles the Linux kernel, uncompressed or Zstandard-compressed Dracut initramfs, CPU microcode updates, kernel command line, and boot splash into a single PE executable (typically 80–120 MiB per kernel version).

A 4 GiB ESP guarantees reliable headroom for:
1. Multiple rolling CachyOS kernel generations during active development.
2. Automatic fallback slots (`.prev.efi`) preserved during updates.
3. Recovery environments and diagnostic PE binaries.
4. Firmware updates deployed via `fwupd` capsules without the danger of partition exhaustion.

---

## Performance Kernel Subsystem

GOFR integrates the **CachyOS Linux kernel** via its maintained Fedora COPR repository (`bieszczaders/kernel-cachyos`).

Key characteristics include:
- **BORE CPU Scheduler:** Designed to prioritize interactive desktop responsiveness, lower dispatch latency, and mitigate stutter during heavy background computational tasks.
- **Compiler Optimizations:** Built with advanced compiler flags tailored for modern x86-64 microarchitectures (x86-64-v3 instructions).
- **Filesystem & Memory Tuning:** Tuned sysctl defaults, optimized Btrfs writeback paths, and low-latency memory management.

Because GOFR relies on standard RPM packaging, the CachyOS kernel receives automated upstream patches alongside standard Fedora updates.

---

## RustyUKI Lifecycle Management

The core engineering mechanism enabling GOFR's boot experience is its integration with [RustyUKI](https://github.com/GlitchSlayed/RustyUKI), an independent Rust toolchain designed specifically for managing UKI lifecycles.

GOFR provides a glue package, `gofr-rustyuki-integration`, which binds RustyUKI into Fedora's `kernel-install` framework:

1. **Kernel Installation Hook (`90-rustyuki.install`):** When DNF5 installs or upgrades a kernel, RustyUKI triggers automatically, assembling a new BLS Type #2 UKI into `/efi/EFI/Linux/gofr-cachyos.efi`.
2. **Fallback Retention (`.prev.efi`):** Before writing a new image, RustyUKI safely rotates the existing functional UKI to `gofr-cachyos.prev.efi`. If an updated kernel triggers a kernel panic or regressions, the fallback entry remains immediately selectable from the `systemd-boot` menu.
3. **Trial Boot Safety:** Support for one-shot boot verification via `rustyuki-boot-confirm.service`. If the new image fails to reach userspace target confirmation, the bootloader automatically reverts to the proven previous slot on next boot.
4. **Offline Sysroot Support:** RustyUKI provides full `--sysroot` support, allowing GOFR's ISO and disk image build scripts to synthesize bootable UKIs inside isolated containers without altering the host system.

---

## Custom RPM Packaging Suite

To maintain clean separation and avoid brittle post-installation shell scripts, GOFR's customizations are compiled into native Fedora 45 RPM packages:

```
packaging/
├── gofr-release/
│   └── Sets distribution identity, /etc/os-release, and repo configurations
├── gofr-defaults/
│   └── Configures Brush shell, environment variables, zoxide, and modern CLI tools
├── gofr-boot/
│   └── Manages systemd-boot installation, loader.conf templates, and ESP structure
└── gofr-rustyuki-integration/
    └── Delivers kernel-install hooks, cmdline templates, and /usr/sbin/gofr-uki-reconcile
```

Each package is built in a clean `fedora:45` container environment using native RPM build tools and DNF5.

---

## Modern Command-Line Environment

GOFR experiments with modern terminal ergonomics while strictly guarding system script compatibility:

- **Brush as Default Login Shell:** Newly provisioned user accounts have their interactive shell set to [Brush](https://github.com/reubeno/brush) via `useradd -D -s /usr/bin/brush`. Brush is an active Rust project implementing Bash syntax. System scripts, root operations, and cron tasks continue running under standard GNU Bash (`/bin/bash`).
- **Smart Directory Navigation:** `zoxide` is initialized automatically across interactive shell sessions via `/etc/profile.d/gofr-defaults.sh`.
- **Modern CLI Replacements:** Interactive environments provide `ripgrep` (`rg`), `fd-find` (`fd`), `bat`, `eza`, `btop`, and selective user-space aliases for `uutils-coreutils`, demonstrating memory-safe Unix utilities without displacing core system tooling.

---

## Build Automation & Continuous Integration

GOFR maintains an automated, reproducible build pipeline orchestrated via a unified `Makefile`:

```bash
# Verify build environment prerequisites
make deps

# Build GOFR custom RPM packages in clean Fedora 45 container
make rpms

# Build bootable hybrid UEFI Netinstall ISO (< 1 GiB)
make iso

# Build bootable QEMU/OVMF GPT disk image (4 GiB ESP + Btrfs root)
make disk-image

# Run automated QEMU/OVMF UEFI ISO boot verification
make test-iso

# Run automated QEMU/OVMF UEFI disk image boot verification
make test-vm

# Run kernel update lifecycle and rollback test
make test-lifecycle
```

### GitHub Actions Release Pipeline

The project features a continuous integration and release pipeline (`.github/workflows/release.yml`):
- Runs entirely inside pristine `registry.fedoraproject.org/fedora:45` containers with privileged capabilities for loopback partitioning and Btrfs subvolume layout.
- Calculates automatic incremental version tags (`45.1`, `45.2`, etc.) keyed to the Fedora major version.
- Compiles the RPM package suite, synthesizes the hybrid UEFI Netinstall ISO, formats disk images, and computes `SHA256SUMS` alongside a structured `manifest.json` SBOM.

---

## Current Status & Experimental Boundaries

| Dimension | Current State | Notes |
|---|---|---|
| **Product Maturity** | **Working Prototype / In Development** | Core boot path, ISO generation, and image tooling function end-to-end. |
| **QEMU/OVMF Boot** | Verified Functional | Boots cleanly from firmware to desktop via `systemd-boot` and Type #2 UKIs. |
| **Netinstall ISO** | Verified Functional | Bootable hybrid ISO generates valid installation environments. |
| **Kernel Rollback** | Verified Functional | Multi-generation rotation preserves `.prev.efi` fallback slot. |
| **Hardware Scope** | x86_64 UEFI | Requires UEFI 2.4+ firmware; x86-64-v3 microarchitecture recommended for CachyOS. |
| **Secure Boot** | Documented Specification | Requires custom MOK enrollment; native signing key infrastructure currently in development. |

---

## What's Next?

With the fundamental boot architecture, custom RPM packaging, Netinstall ISO generation, and VM testing proven functional, development is focused on:

1. **Bare-Metal Installation Validation:** Stress-testing the Anaconda Netinstall kickstart across diverse physical UEFI firmware implementations and NVMe storage controllers.
2. **Secure Boot MOK Integration:** Finalizing a straightforward local Machine Owner Key (MOK) enrollment flow so users can run GOFR under Secure Boot with custom-signed UKIs.
3. **Hardware Driver Profiles:** Streamlining proprietary NVIDIA kernel module compilation against the CachyOS kernel during the Netinstall phase.

GOFR has moved beyond an initial whiteboard concept. It is now a functioning, testable Linux remix that demonstrates the power of pairing Fedora's robust engineering with contemporary bootloader and kernel innovations.
