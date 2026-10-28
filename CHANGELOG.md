# Changelog

Each version lists what changed for the person who uses Emi. The version is `expo.version` in `apps/mobile/app.json`. The store build number goes up by itself on each build, and a released version names the build it shipped as.

## 0.2.1 (28 October 2026)

Fixes from the beta feedback of 18 to 26 October 2026.

### Fixed

- A tap on a row of the year, cycle or period length wheel saves that row. Before, it could save a row two places away, and a skipped year was saved. https://github.com/atlantic-blue/emi/issues/338
- The calendar rings a forecast period only near the expected start, so the months ahead show the fertile days again. https://github.com/atlantic-blue/emi/issues/372
- The day entry header shows the cycle day and phase of the date that is open, not of today. https://github.com/atlantic-blue/emi/issues/376
- Edit my period opens with every saved period day ticked, also a day after a gap. A period day can be removed from the calendar day in one press. https://github.com/atlantic-blue/emi/issues/390
- Symptoms, moods and appetite saved from a calendar day show in About this phase, and the other way round. The keyboard opens only when she taps a field. https://github.com/atlantic-blue/emi/issues/375
- The first forecast says the period is late when its window has passed. https://github.com/atlantic-blue/emi/issues/353
- Skip in the first run keeps the name she typed, and Continue stays above the keyboard. https://github.com/atlantic-blue/emi/issues/352
- The calendar day card shows sex, and a heart marks the day in the calendar. https://github.com/atlantic-blue/emi/issues/404 https://github.com/atlantic-blue/emi/issues/374
- Each past period row has a name by its place, and the period sheet scrolls so the length wheel sits above Done. https://github.com/atlantic-blue/emi/issues/385
- Text grows to at most 1.3 times its size, tab and tile labels keep whole words, and Russian text uses one typeface that holds Cyrillic. https://github.com/atlantic-blue/emi/issues/386
- The phase after the period starts on the day after the period, not on day 1. https://github.com/atlantic-blue/emi/issues/393
- Each arc on the ring is wide enough for its name. A tap on an arc opens a card with the phase name, its days and a link to the phase guide. https://github.com/atlantic-blue/emi/issues/394

### Changed

- The app icon shows EMI inside the open ring, so it is easier to recognise among other apps. https://github.com/atlantic-blue/emi/issues/331

## 0.2.0 (21 October 2026)

The changes from the beta feedback of 16 and 17 October 2026.

### Added

- Home says when her period is late, and how many days late. The link It started opens the period editor on today. https://github.com/atlantic-blue/emi/issues/318
- The Period page asks Started on another day?, so a period can start yesterday. https://github.com/atlantic-blue/emi/issues/317
- Each period row in History has an Edit action. https://github.com/atlantic-blue/emi/issues/317
- In the first run, the newest period can be Still going. https://github.com/atlantic-blue/emi/issues/317
- One page, Who can see my records?, says where her records are kept, who can read them and what happens when she sends a file. https://github.com/atlantic-blue/emi/issues/325
- With two or more periods, the first run opens the cycle and period wheels on the lengths from her dates. https://github.com/atlantic-blue/emi/issues/326
- Sweet and Salty are new symptoms. https://github.com/atlantic-blue/emi/issues/329
- The log explains spotting and links to other discharge. https://github.com/atlantic-blue/emi/issues/329
- The first run explains why Emi asks the year of birth, what a regular cycle is, and what the ovulation day means. https://github.com/atlantic-blue/emi/issues/322
- The phase guide has short practical tips for each phase, and says that everyone is different. https://github.com/atlantic-blue/emi/issues/323
- Insights has one line for each number that says what it means for her. https://github.com/atlantic-blue/emi/issues/324

### Changed

- One tap on Save and start begins Emi. Press and hold is gone. https://github.com/atlantic-blue/emi/issues/328
- The padlock notes and the promise step are no longer in the first run. The welcome links to Who can see my records? https://github.com/atlantic-blue/emi/issues/325
- The feeling question asks how she usually feels during her period, and each answer says what it changes. https://github.com/atlantic-blue/emi/issues/326
- Digestion is now two groups, Appetite and Digestive symptoms. A saved profile with Digestion opens with both. https://github.com/atlantic-blue/emi/issues/329
- Breast tenderness replaces Calm in the quick six symptoms, and a link opens all symptoms. https://github.com/atlantic-blue/emi/issues/329
- The privacy rows use one set of words on onboarding, My data and the delete screen. https://github.com/atlantic-blue/emi/issues/319
- New words for the welcome, the first forecast, the reminder, My data and the export files, in English, Spanish and Russian. https://github.com/atlantic-blue/emi/issues/322 https://github.com/atlantic-blue/emi/issues/324
- New Russian text for the first run, Home, the day entry, the phase card, Insights, History and the data screens. https://github.com/atlantic-blue/emi/issues/322 https://github.com/atlantic-blue/emi/issues/323 https://github.com/atlantic-blue/emi/issues/324

### Fixed

- Symptom and mood names show in her language everywhere, also in search and the export. https://github.com/atlantic-blue/emi/issues/316
- The delete screen no longer says that she has an account on a server. It offers Download data first. https://github.com/atlantic-blue/emi/issues/319
- Long values in Your answers no longer break letter by letter, and labels no longer break inside a word on the iPhone SE. https://github.com/atlantic-blue/emi/issues/320
- The Period button is filled only on a day of her period. https://github.com/atlantic-blue/emi/issues/321
- Edit my period opens on the day she pressed, not on the period four weeks earlier. https://github.com/atlantic-blue/emi/issues/317

## 0.1.0 (17 October 2026)

TestFlight build 5, made from the tag `v0.1.0`.

### Added

- Hygiene products: each product has an icon and its own page. https://github.com/atlantic-blue/emi/issues/304
- How to choose a hygiene product. https://github.com/atlantic-blue/emi/issues/305
- A short quiz that suggests a hygiene product to try. The quiz saves no answers. https://github.com/atlantic-blue/emi/issues/306
- After she records sex on a day of her period, a sheet shows products for sex on period days. https://github.com/atlantic-blue/emi/issues/306

### Changed

- The ring marks today with a pointer. https://github.com/atlantic-blue/emi/issues/308
- The signs of ovulation popup shows "Nothing yet" first. https://github.com/atlantic-blue/emi/issues/302

### Fixed

- She can record sex for a past day, from the Sex page and from the calendar. https://github.com/atlantic-blue/emi/issues/307
- The Russian text for one sided pain says where the pain is. https://github.com/atlantic-blue/emi/issues/303

## 0.0.1

The first TestFlight builds, 1 to 4. Build 4 was made from commit 8f74692 on 13 October 2026.
