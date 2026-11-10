---
title: "GOFR: Why I'm Planning My Own Fedora Remix"
description: "The inspiration, design philosophy, and early plans behind GOFR, my attempt at a slightly more opinionated Fedora Workstation."
date: 2026-10-24
tags: ["Linux", "Fedora", "Open Source", "Projects"]
sample: false
featured: true
---

I've been using Fedora as my primary Linux distribution for a while now, and overall, I've grown to really appreciate it. It's modern, relatively up to date, stable enough for everyday use, and generally strikes a good balance between adopting new Linux technologies and maintaining a reliable desktop experience.

But like most people who spend enough time tinkering with Linux, I've accumulated a list of things I wish were just a little different.

Nothing particularly revolutionary. A different kernel, a more modern boot setup, some alternative command-line utilities, and a few default configurations that better suit how I use my computer.

Of course, I could just keep making those changes manually every time I install Fedora. But that got me thinking:

**What if I took Fedora Workstation, kept almost everything I already liked about it, and built my own slightly opinionated version?**

That's where GOFR comes in.

## Introducing GOFR

GOFR stands for **Glitchy's Opinionated Fedora Remix**, pronounced *Gopher*.

The name is pretty literal. This isn't supposed to be some groundbreaking replacement for Fedora, nor am I interested in maintaining an entirely separate operating system ecosystem.

It's Fedora, with my opinions baked in.

The idea is to create a Fedora Workstation remix that stays relatively close to upstream while introducing a few carefully selected changes to the kernel, boot infrastructure, software repositories, and command-line environment.

I'm intentionally keeping the scope limited. I don't want to rebuild the desktop, redesign GNOME, create a new package manager, or introduce changes just for the sake of making something different.

Instead, I want to explore how much can be improved or modernized through a relatively small set of architectural decisions.

## Why Fedora?

Fedora already does a lot of things right.

It has a relatively fast release cycle, generally adopts newer Linux technologies early, and provides a polished GNOME experience without the excessive customization found in some other distributions.

It also has a strong relationship with upstream Linux projects, which makes it a particularly interesting foundation for experimentation.

Most importantly, I actually enjoy using it.

I don't want GOFR to become a distribution where every component has been replaced just because an alternative exists. I want to preserve Fedora's strengths and focus on the specific areas where I think another approach could be interesting.

That philosophy is probably the most important part of this project.

## Rethinking the Boot Process

One of the first things I wanted to change was the boot infrastructure.

Fedora traditionally uses GRUB for its standard Workstation installations. GRUB is mature, capable, and extremely flexible, but for a modern UEFI-only system, I've become interested in a simpler approach built around systemd-boot and Unified Kernel Images.

UKIs are particularly interesting because they package the Linux kernel, initramfs, and associated boot information into a single EFI executable.

Rather than relying on the more traditional arrangement of separate kernel and initramfs files with bootloader configuration, the system can boot an integrated image.

The basic idea for GOFR is:

**UEFI → systemd-boot → Unified Kernel Image → Linux**

This also influenced another decision: increasing the default EFI System Partition to 4 GiB.

That is substantially larger than what many typical Linux installations allocate, but the idea is to provide plenty of room for multiple UKIs, kernel updates, and recovery images without worrying about running out of space.

I also want to investigate whether a separate `/boot` partition is even necessary for this configuration.

Of course, making the system boot once is only part of the challenge. Making sure kernel updates, recovery options, and bootloader maintenance continue working automatically is where things get more interesting.

## Why the CachyOS Kernel?

Another major component I'm interested in is the CachyOS kernel.

CachyOS has gained attention for its performance-oriented approach to Linux, particularly around kernel configuration, CPU optimizations, and responsiveness.

What interests me isn't necessarily switching to CachyOS as an entire distribution, but exploring the possibility of incorporating its kernel into an otherwise fairly standard Fedora system.

Fortunately, a Fedora COPR packaging effort exists for the CachyOS kernel, providing a potential starting point.

There are still plenty of questions worth investigating.

How much of a difference does the kernel actually make in everyday desktop workloads? Are there meaningful improvements in responsiveness or performance? What compatibility tradeoffs come with the alternative configuration?

And perhaps most importantly, how well can it integrate with a UKI-based boot process?

I don't want to assume that a performance-focused kernel is automatically better in every situation. Ideally, this is something I can eventually test and benchmark rather than simply take for granted.

## Modernizing the Terminal Experience

The command-line environment is another area where I've been interested in trying newer tools.

Linux has an enormous collection of mature utilities that have existed for decades, but there are also newer projects experimenting with different implementations, programming languages, and usability improvements.

Three in particular caught my attention.

### Brush

Brush is a shell written in Rust that aims to provide Bash-compatible functionality.

The idea of using a newer shell implementation while retaining much of the familiar Bash experience is appealing, especially compared with switching to something that requires an entirely different scripting language.

My current plan is to use Brush as GOFR's default user shell while keeping Bash available for compatibility.

### zoxide

zoxide is a smarter alternative to manually navigating directories with `cd`.

It remembers frequently visited directories and makes jumping between them much easier.

It's a relatively small change, but exactly the kind of quality-of-life improvement I'd like GOFR to include by default.

### uutils coreutils

uutils is an effort to reimplement traditional Unix core utilities in Rust.

I find this project particularly interesting because of the engineering involved in recreating tools that so much existing software depends on.

That said, replacing foundational system utilities isn't something to do casually.

For GOFR, I'm leaning toward introducing uutils in a way that benefits interactive use while preserving the GNU implementations for compatibility-critical system operations.

The goal is to experiment with modern alternatives, not break a perfectly functional operating system.

## Why Not Just Use a Setup Script?

This is probably the most reasonable question about the entire project.

Almost everything I've described could, at least individually, be configured on an existing Fedora installation.

So why build a remix?

Partly because I want the end result to be something that can be installed with those defaults already in place.

But the bigger reason is that **building the distribution is itself part of the project**.

There's a lot more involved in creating a reliable Linux remix than installing a few packages.

I want to learn how Fedora images are built, how RPM packages can manage distribution-specific configurations, how installers interact with partitioning and boot infrastructure, and how kernel updates can be integrated into a custom boot pipeline.

I also want to explore automated testing and release engineering, particularly the possibility of generating installation images and validating them in virtual machines.

In other words, GOFR isn't just about the resulting operating system. It's also an excuse to explore the engineering behind Linux distributions.

## Where Things Stand Right Now

At the time of writing, GOFR is still very much in the **conceptual and planning stage**.

I've outlined the intended architecture, identified the main components, and started thinking through the tooling and integration work required to turn the idea into something usable.

The next major milestone is getting a basic prototype running in a virtual machine.

My initial priority is proving that Fedora, the CachyOS kernel, systemd-boot, and automatically generated UKIs can work together reliably.

From there, the plan is to integrate the other defaults, develop the required packaging, and eventually produce an installable ISO.

There's still plenty that could change along the way. Some ideas might prove more complicated than expected, some might not be worth the tradeoffs, and others could evolve as I learn more about Fedora's internal tooling.

That's part of the reason I want to document the project from the beginning.

## What's Next?

My rough plan is to approach development in stages, starting with research and a working virtual machine image before worrying about a polished installer or public release.

Once the boot architecture is working reliably, I can start integrating the rest of the system, building out automation, and testing whether the decisions I've made actually hold up in practice.

Eventually, I'd like GOFR to become a genuinely installable and maintainable Fedora remix rather than just a collection of configuration scripts.

But even if it remains a personal experiment, I think there's a lot to learn from the process.

**The end goal isn't to make Fedora unrecognizable. It's to see what happens when I take a distribution I already like and push a few of its defaults in a direction I find interesting.**

And that's really the entire idea behind GOFR.

---

> **Update:** GOFR has since progressed from an initial concept into a working, albeit experimental, distribution. It now features an ultra-compact Netinstall-first ISO (< 1 GiB), pure systemd-boot with Type #2 UKIs managed by RustyUKI, CachyOS kernel integration, and automated CI/CD builds. For the full technical breakdown, storage blueprints, and build instructions, read the [GOFR Engineering Monograph](/projects/GOFR).
