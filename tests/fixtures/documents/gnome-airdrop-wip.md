---
title: "I built an AirDrop integration for GNOME Shell"
description: "Why I am building a GNOME Shell extension for real AirDrop transfers, what owlyd actually does, and the walls I keep hitting, most of them Intel related."
date: 2026-11-02
tags: ["Linux", "GNOME", "Rust", "Open Source", "Projects"]
sample: false
featured: false
---

## Why I am building this

My laptop runs Fedora with GNOME. My phone is an iPhone. Day to day that is fine, right up until I want to move a photo or a PDF from one to the other. Then I end up emailing files to myself, which feels like something I should have stopped doing years ago.

There are already good tools for this. Warpinator and LocalSend both work well. The problem is that neither of them speaks AirDrop, so my iPhone cannot see my laptop in the share sheet the way it sees other Apple devices. AirDrop runs on Apple's own wireless protocol, AWDL. If I want a Linux machine to show up as a real AirDrop target, something on the Linux side has to speak AWDL.

That part already exists. It is a project called [Owly](https://github.com/t4t5/owly), by t4t5, and it handles the radio side on Linux. What it does not have is a proper GNOME interface. So I started building one: **airdrop-gnome**, a GNOME Shell extension that puts AirDrop in Quick Settings. I created the repo today, so this post is a status update, not a release announcement.

## What the project looks like

There are three pieces:

1. **The GNOME Shell extension**, written in TypeScript and compiled to GJS. It adds a Quick Settings tile and menu that lists nearby Apple devices, sends files through the normal file picker, and asks me before accepting anything that comes in.
2. **airdrop-bridge**, a small Rust program I am writing that runs as a normal user service. It holds the radio lease, runs the `owly` command line tool for discovery and transfers, keeps track of state, and gives the extension one clean D-Bus interface to talk to.
3. **Owly itself**, used as it is, with no changes. I decided early on to write a bridge instead of forking Owly, and I wrote that decision down in the repo. Forking it would mean maintaining a radio stack myself, and I do not have time for that.

Receiving has three modes, because being discoverable is a choice I want control over: Off, Everyone for 10 Minutes, and Always On. Even with Always On, every incoming transfer still needs me to accept it first. That part is staying.

## What owlyd is and what it does

Owly comes in two parts, and the split explains most of my design.

**owlyd** is a system service that runs as root. It owns the Wi-Fi radio. When a program asks it for access, it sets up a network interface called `awdl0`, puts the card on the right channel, and tracks nearby AWDL devices. It hands out leases, which are basically time slots with the radio. When the program holding a lease exits, owlyd takes the radio back on its own. That automatic cleanup matters more than it sounds.

**The owly command line tool** is the regular user space part. It takes a lease from owlyd and then does the actual AirDrop work over `awdl0`: finding devices with mDNS, talking to the AirDrop endpoints, and moving the files.

The important thing is what owlyd does not do. It does not find devices, it does not transfer files, and it has no interface. It is radio only. So my bridge sits in the middle. It talks to owlyd on the system bus, runs the owly tool for transfers, and serves the extension on the session bus.

## The walls I have hit so far

**My Wi-Fi card is the big one.** My laptop has an Intel AX200. On Intel cards, Owly has to run in exclusive mode. While AirDrop is active, the card sits on channel 6 doing AWDL and does nothing else, which means my normal Wi-Fi disconnects. I open a receiving window, my internet drops, the transfer finishes, and my Wi-Fi comes back. This is not a bug in my code. It is how the card and driver behave. So the design has to be honest about it: ask for permission before taking the adapter, remember that permission only for that card and mode, and restore Wi-Fi properly when the lease ends. Some MediaTek and Realtek cards can share the radio instead. Intel cards cannot, at least for now. This is the biggest limit on the whole project and it is not one I can fix myself.

**GNOME Shell has strict rules for extensions.** Extensions cannot block the shell, do network work, or read files directly. Everything has to go through asynchronous D-Bus calls to a separate program. It is a sensible rule, and it is the main reason the bridge exists at all.

**Testing is annoying.** Every real hardware test means disconnecting my own Wi-Fi on purpose. So the bridge has a mock mode, started with `AIRDROP_MOCK=1`, which fakes the backend so I can work on the interface without cutting my own connection. There is also a test script that checks the D-Bus contract between the bridge and the extension, because with three programs involved, "it worked once" is not good enough.

**Scope is a wall too.** For now this targets Fedora and Ubuntu with GNOME Shell 50 and 51, and one pinned Owly version, 0.4.2. Packaging, firewall rules for the `awdl0` interface, and SELinux checks all still need proper testing before I call any of this a beta.

## Where it stands

Honest status: early and unfinished. The bridge and the extension exist, the D-Bus interface between them is defined and tested, the receiving modes and the accept prompt are built into the design, and the main decisions are written down in the repo. What is not done is the long part: repeated hardware testing, packaging for Fedora and Ubuntu, and general cleanup. The milestone list in the repo goes from the backend contract up to release checks, and I am near the start of it.

The repo is public if you want to look: [Gnome-Airdrop](https://github.com/GlitchSlayed/Gnome-Airdrop). Mock mode means you can try the interface without losing your Wi-Fi. For now, that is the safest way to use it, and I am fine saying so.
