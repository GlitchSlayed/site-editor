---
title: "NASA Spent Billions Bringing Back Samples. What Happens to the Data?"
description: "What I learned from Dr. Kerstin Lehnert's lecture at Hofstra about Apollo, Bennu, AstroMat, and why preserving scientific data matters as much as collecting the samples."
date: 2026-11-05
tags: ["Aerospace", "NASA", "Open Science", "AIAA"]
draft: false
sample: false
featured: true
---

NASA has spent billions of dollars bringing material back from the Moon and asteroids so scientists can study it here on Earth. Getting those samples home is already an enormous engineering challenge. What I had not really considered before tonight was what happens to all the research data *after* the samples reach a laboratory, or how easily decades of that work can disappear.

Tonight, our Hofstra AIAA chapter co-hosted a lecture with the AIAA Long Island Section featuring Dr. Kerstin Lehnert of Columbia University's Lamont-Doherty Earth Observatory. Her talk, *NASA's Billion Dollar Samples Meet Open Science*, was about that less visible side of space exploration: preserving, organizing, and sharing the scientific results produced from material that took so much effort to collect.

I went in expecting to hear about lunar and asteroid samples. I came away thinking a lot more about the infrastructure behind scientific research, and how much useful work can be lost when nobody plans for the data to outlive the original experiment.

## Why bring samples back in the first place?

Spacecraft can do some remarkable science without ever returning to Earth. But there is a fundamental difference between sending a set of instruments to a distant object and bringing a piece of that object into a laboratory. On Earth, researchers can use equipment that would be impractical to fly, apply new analytical techniques, and revisit the same material years or even decades later.

Apollo is a particularly good example. More than fifty years after those missions, lunar material is still being studied, and newer instruments can answer questions the original researchers could not have investigated. Dr. Lehnert discussed how later work revealed evidence of water in lunar samples, changing what scientists understood about material that had been sitting in collections for decades.

She also described the sheer scale of NASA's astromaterials collections at Johnson Space Center, with roughly a quarter of a million cataloged samples and more than 50,000 unique lunar samples. According to the figures she presented, around 150 scientists worldwide are still working with Apollo material. These are not simply historical artifacts sitting in storage. They remain an active scientific resource.

There are practical reasons for doing this work beyond understanding the history of the solar system. The composition and physical properties of asteroids matter for planetary defense, future exploration, and potentially the commercial use of space resources. But what interests me most is that the value of a returned sample is not fixed when the mission ends. It can keep increasing as our instruments and research questions improve.

## The part we almost forgot to preserve

The surprising part of the lecture was that, for much of this history, there was no comprehensive system for preserving the analytical data produced by researchers studying these samples.

A sample might be safely stored in a controlled facility for decades, while its measurements end up scattered across old publications, personal computers, laboratory records, or storage media that nobody can read anymore. Some of the context needed to interpret the data may exist only in the memories of researchers who have since retired. Once that information is lost, recovering it is not always possible, even if the physical sample still exists.

Dr. Lehnert put the funding problem into perspective with a comparison that stuck with me: billions spent collecting samples, millions spent researching them, and essentially nothing set aside to preserve the resulting data.

That is a pretty strange imbalance when you think about it. We spend years designing missions, building spacecraft, and managing the risks of bringing a tiny amount of material home. Then the measurements made from that material can become inaccessible because the data infrastructure was treated as an afterthought.

It also raises a distinction I had not appreciated enough before: **preserving a physical sample is not the same thing as preserving the science done with it.** A future researcher needs more than a published conclusion. They need the measurements, the sample identification, and enough information about the analytical method to understand what those measurements actually mean.

## From PetDB to AstroMat

A major part of Dr. Lehnert's career has been building systems to solve exactly this problem. She described starting at Lamont-Doherty about thirty years ago as a laboratory technician and completing her PhD along the way, eventually working on some of the major databases used in geochemistry and astromaterials research.

One of those early efforts was **PetDB**, which made geochemical measurements from published research searchable as actual data rather than leaving them buried in journal articles. That distinction matters. Finding a paper about a particular rock is useful, but being able to locate and compare its reported chemical measurements across studies is something else entirely.

For lunar material, that work developed into **MoonDB**, which brought together historical Apollo sample data covering research from 1970 through 2016. The effort expanded beyond lunar samples in 2018 and eventually became **AstroMat**, the Astromaterials Data System.

AstroMat is now part of NASA's infrastructure for preserving research data from returned extraterrestrial materials. Dr. Lehnert explained that, since 2024, its role has been formalized in NASA's research-data requirements. It also supports data associated with newer missions such as OSIRIS-REx.

The interesting engineering problem here is not just storing a large number of files. Different laboratories measure different properties using different instruments, methods, formats, and conventions. If that information cannot be connected to the correct sample and interpreted consistently, putting everything online does not automatically make it useful.

A well-organized archive gives researchers a way to find measurements, understand where they came from, and compare work performed by people who may never have collaborated directly. That is especially important when samples are rare, tightly controlled, and distributed to only a small number of laboratories.

## Bennu and the value of sharing the results

Dr. Lehnert also discussed findings from **OSIRIS-REx**, NASA's mission that returned material from the asteroid Bennu in 2023.

The chemistry is fascinating. She described analyses identifying all five nucleobases used in DNA and RNA, along with 14 amino acids associated with proteins and sugars in the returned material. These are some of the molecular ingredients relevant to the chemistry of life, although finding them on an asteroid is not the same as finding evidence of life.

What makes these results especially interesting is the combination of sample-return engineering and laboratory science. A spacecraft had to travel to an asteroid, collect material, and bring it back without compromising the scientific value of the sample. Researchers could then examine that material with instruments far more capable than anything the spacecraft could reasonably carry.

But there is a third part to that chain: making the resulting measurements accessible so other researchers can investigate them, compare them with meteorites or other samples, and potentially ask questions the original analysis team did not consider.

I think that last part is easy to overlook because it is less visually impressive than a spacecraft touching an asteroid. It is still what helps turn a successful mission into a scientific resource that can be used for years.

## Open science is more than publishing a paper

The broader argument of the talk was about **open science**, and particularly open research data.

Dr. Lehnert discussed how federal policy has increasingly pushed publicly funded research toward wider access, including the 2013 Holdren memorandum and the 2022 Nelson memorandum. The latter called for federally funded research results to be made publicly accessible without an embargo period, with implementation requirements developed by individual agencies.

There is a difference between being able to read a paper and being able to work with the data behind it. A paper tells you what its authors concluded. Access to the underlying measurements gives other researchers a chance to check, compare, reuse, or reinterpret those results. That does not mean every dataset is automatically easy to use, or that all data can be released without restrictions. Good documentation, consistent identifiers, and usable metadata are still necessary.

For NASA sample-return missions, though, the principle seems straightforward to me. If public money funded the mission and the research, the scientific value should not be limited to the handful of institutions that received physical material.

## I asked about the samples still sitting on Mars

During the Q&A, I asked Dr. Lehnert about **Mars Sample Return**, specifically whether she thought the samples collected by Perseverance would realistically make it back to Earth within the next few years or remain on Mars for a much longer time.

Her answer was not especially optimistic about the timeline. In short, she thought it was still far off.

That is frustrating, because the whole point of collecting and sealing those samples is to eventually study them using Earth-based laboratories. Perseverance has already gathered valuable measurements with its onboard instruments, but those instruments cannot replace everything researchers could do with the actual material in hand.

The cost and complexity of bringing the samples home have become major obstacles. Dr. Lehnert discussed how estimates for the return effort had grown from roughly $4 billion to around $11 billion, contributing to delays and uncertainty about the mission's future.

She did point out a reason to remain hopeful. European partners have invested in the scientific infrastructure and planning needed to work with returned Martian samples, so there is international interest in seeing the effort through. She suggested that stronger cooperation between agencies could be part of making that happen.

I found that answer useful because it separated what we want scientifically from what is realistically achievable through the current mission architecture and funding situation. Collecting samples is only one stage. Returning them, analyzing them, and preserving the results all have to work for the original scientific objective to be fulfilled.

## An old example of open science

Toward the end, Dr. Lehnert brought up something I did not expect in a lecture about NASA data archives: the eighteenth-century transits of Venus.

In 1761 and 1769, observers traveled to different parts of the world to record Venus crossing the Sun. By combining observations made from widely separated locations, astronomers could estimate the Earth-Sun distance and improve their understanding of the scale of the solar system.

The point was that scientific collaboration and sharing observations are not new ideas. People were coordinating measurements across enormous distances centuries before digital databases existed. What has changed is the amount of information we produce and the infrastructure required to preserve and use it.

I liked that example because it connected a modern technical problem to a much older scientific principle. No individual observer had the complete picture. The value came from combining their work.

## What I took away from the lecture

The part I keep coming back to is what all of this means for students and smaller research groups.

Realistically, I am probably never going to hold a piece of Bennu, and neither are most people interested in studying it. Physical access to returned extraterrestrial material is necessarily limited. But that does not mean the research itself has to be limited to the institutions storing the samples.

With systems like AstroMat, a student can access real measurements from material collected by missions such as Apollo and OSIRIS-REx, explore the chemistry and mineralogy, and potentially build an investigation around data that would otherwise be completely out of reach. Of course, having access to data is not the same as having the expertise to interpret it correctly, but it removes one major barrier to getting started.

As someone interested in aerospace engineering, I usually think about these missions from the spacecraft side: propulsion, structures, mechanisms, navigation, and the challenge of getting something to another world and back. This lecture was a good reminder that the engineering achievement is not the entire mission outcome. The scientific work continues long after the spacecraft is retired, sometimes for generations.

NASA can keep the physical samples protected in Houston. The measurements and knowledge produced from them should be preserved and made useful to as many researchers as possible. After hearing Dr. Lehnert explain how much data was nearly lost, that seems less like an optional benefit of open science and more like part of doing the mission properly.
