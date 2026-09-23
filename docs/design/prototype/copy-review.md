# Copy review: Stitch screens 6 to 22

Read on 2026-09-23 against atlantic-blue/emi `main` at `f0df0d5f`. The export is
`~/Downloads/stitch_emi_cycle_tracker_prototype 5`. The rules the words follow come from
`apps/mobile/src/features/onboarding/copy.ts`: say what happens, never congratulate, no exclamation
mark, write the number. Every privacy line below is checked against `docs/privacy.md`.

## Rules that apply to every screen

- Cut the monospaced caption lines that name no fact, for example "tension pulse", "gentle horizon",
  "Editorial Note", "emi editorial private records, chapter iv", "Calibration complete".
- Cut the account avatar in the header. There is no account screen behind it.
- Cut the step counters ("06 · 15", "Cycle Record · 02", "Journal Step 10 · 15"). One thin progress
  bar carries the position.
- The header title names the question. Screens 7, 10, 11, 12, 13, 14 and 15 carry the wrong title.
- Never write AES, enclave, hardware key, audited, zero knowledge or zero cloud. The key is in the
  keychain, the envelope is XChaCha20-Poly1305, and no auditor has read Emi.
- Never write "never leaves this phone" about a day. A sealed day goes to the server so a new phone
  can restore it. The server holds ciphertext it cannot read.
- The approved privacy sentence, from `docs/privacy.md` line 34: "Emi encrypts each day on the phone,
  with a key that stays on the phone, and sends only the result."

## Photographs replaced with icons

Every icon comes from `brand/icons/`, stroke 1.75, no fill. Where the set has no fitting icon, the
icon is named as new and is drawn to the rules in `brand/icons/README.md`.

- Screen 7, "Reference log" photograph: `calendar`.
- Screen 7, "Cycle rhythm" photograph: `ring`.
- Screen 11, "Reflection" and "Tone and pace" photographs: delete both cards. The choice rows
  already carry icons. If the layout needs weight there, use `note` and `mood`.
- Screen 14, "The Morning Entry" thumbnail: `note`.
- Screen 15, "Rhythm over rigidity" photograph: `chart`.
- Screen 15, "Body led patterns" drawing of leaves: `ring`. The leaves also break the brand rule of
  no plants.
- Screen 17, the notebook photograph: a new icon, `bell`. Until it is drawn, use `calendar`.

Tile icons the set does not have yet, from screens 13 and 14: `skin`, `digestion`, `headache`,
`bloating`. Cramps uses `pain`, tired uses `sleep`, calm and low use `mood`.

## Screen by screen

### 6. Last period
- Keep: "When did your last period start?", "The first day you bled. The nearest day you remember is
  close enough.", Today, Yesterday, Continue.
- Cut: Skip. SCREEN-1 needs this answer. Cut "Follicular Rhythm" under the month.
- Rewrite "Saved strictly on this device. Never transmitted or stored on remote servers." as:
  "Emi encrypts this on the phone before it goes anywhere."

### 7. The period before
- Title: "The period before".
- Keep the headline, "Each one you add makes the first forecast surer.", "I do not remember".
- Rewrite "Calculated interval, 28 days span" as "28 days between them".
- Cut "Cycle rhythm, Regular pattern". One gap cannot show a pattern.

### 8. Cycle length
- Keep the headline, the stepper, "I am not sure", Continue.
- Keep "Count the first day of one period to the day before the next."
- Cut "Global average 26 to 30 days". It has no source.
- Rewrite "Adaptive Calibration" as: "Emi replaces this with your own number once it has seen two
  cycles."

### 9. Period length
- Keep the headline, "From the first day of bleeding until it stops.", "I am not sure".
- Cut "Most periods last between 3 and 7 days" and the line about seasons and stress. No source.
- Rewrite "Natural Cadence" as: "Emi uses the days you log instead, once you log them."

### 10. Regular
- Title: "Regular".
- Keep the three rows and their short lines. Keep "This only changes how Emi explains your forecast."
- Cut "Rhythm waveform preview", "quiet harmonic balance", and "We will broaden windows into softer
  horizon ranges".
- Rewrite "An honest baseline helps us craft a mindful, calm forecast rather than false precision."
  as: "If it moves, Emi shows a wider range."

### 11. Feeling
- Title: "How you feel about it".
- Keep the three rows and "This changes how Emi talks to you, and nothing else."
- Cut "A thoughtful grounding for our tone together." and the paragraph about toxic positivity and
  actionable physiology. Emi has no such setting.
- Rewrite "Encrypted and Stored Privately in Journal" as: "Encrypted on this phone."

### 12. Goals
- Keep the headline, "Choose all that apply.", the four rows.
- Rewrite "No health profiling data leaves your device." as: "Emi encrypts your answers on this phone.
  Nobody else can read them."
- Cut "Tailored only to your cadence."

### 13. Focus
- Keep the headline and "Emi puts these first when you log a day."
- The six tiles are the symptom groups: sleep, mood, energy, skin, digestion, pain. Cravings is not
  a group (food craving sits inside digestion), so pain takes its place.
- Cut the tile sublines ("Rest and recovery", "Vitality curve" and the rest).
- Keep "You can change these in Settings." Replace "journal settings" with Settings.

### 14. Today
- Title: "Today".
- Keep the headline, the six tiles, "Nothing to add", "Save today".
- Cut "The Morning Entry" card and "Attunement starts by listening without judgment."
- Rewrite "Optional check in for your first day on Emi." as "You can skip this."
- Rewrite "stored only in your local key vault" as: "Emi encrypts it on this phone."

### 15. First forecast
- Keep "Your next period", "14 to 19 Oct", "Emi is still learning. After two cycles it says how sure
  it is."
- Cut "±2 days tolerance", "Calibration complete", "Model version 1.0-local", "Continue to Your
  Journal" (use Continue).
- Rewrite "Why a range?" body as: "A cycle can move by a few days from one month to the next. A range
  says that. One date would hide it."
- Rewrite "Zero Cloud Inference" as a title "Worked out on this phone" and the body as: "Emi works out
  the range on this phone, from the dates you gave."
- The sample timeline says day 24. The rest of the export says day 9. Use one day everywhere.

### 16. The promise
- Keep "Only you can read your days." and the three lines.
- Rewrite line 1 body as: "Emi encrypts each day on the phone, with a key that stays on the phone,
  and sends only the result."
- Rewrite line 2 body as: "Emi asks for no password and carries no tracking tools."
- Rewrite line 3 body as: "Delete everything removes every day from this phone." The server half
  is not verified on the phone yet, so it is not claimed until feature 6 proves it.
- Cut "hardware enclave", "Not even our engineers", "No mandatory email", "zero residual backups",
  "Audited cryptographic baseline", "Zero cloud telemetry".

### 17. Reminder (moves to its own feature)
- Keep "Should Emi tell you two days before?", "Yes, remind me", "Not now".
- Rewrite the subline as: "The reminder is set on this phone. No server sends it."
- The lock screen sample is a privacy fault: "A quiet window begins in two days" tells anybody who
  sees the phone. The notification text is: "Emi: the reminder you set."
- Cut "No lockscreen leak" until the text above is built. Cut "No marketing", "Zero server push" and
  "Calendar Synchrony".
- The choice of 1 or 2 days is a feature decision. Keep only 2 days until the reminder feature says
  otherwise.

### 18. What Emi gives her
- Keep the headline and the three card titles.
- Card 1: "A range first. It gets narrower as Emi learns your cycles."
- Card 2: "Mood and energy come first when you log, as you chose."
- Card 3: "Encrypted on this phone. Nobody else can read it."
- Cut "Cycle Calibration Model", "Slot 01", "Physical Baseline (Deferred)", "AES-256 · Local Enclave",
  "Encrypted offline repository ready".

### 19. Hold to begin
- Keep "Your cycle, your data, your key." and "Press and hold the ring to begin."
- Rewrite "Generates your private cryptographic key in local enclave storage." as: "Holding the ring
  saves your answers, sealed with your key. Emi makes the key and keeps it in this phone's
  keychain." This is true only because the design in `first-run-long.md` writes everything at the
  hold."
- Cut "Private enclave", "Local Key Generation · 256-bit AES", "2.5s".

### 20. Free month (waits for feature 7)
- Keep "One month free, then £29.99 a year", "Start the free month", "Restore a purchase", and the
  renewal line.
- Rewrite "If you stop paying" body as: "You can still read and export every day you logged."
- Rewrite "Why Emi costs money" body as: "A free tracker is paid for with your data. Emi shows no ads
  and sells no data."
- Rewrite "Stored on device, encrypted in transit" as: "Encrypted on this phone."
- Cut "forever", "We never hold your health history hostage", "£2.50 /mo".

### 21. All set
- Keep "Your ring is ready.", "Log a day whenever you like.", "Open Emi", the ring with "Day 9".
- Cut "Emi observes quietly without demanding your attention", "Vault Setup Complete", "Device
  enclave locked", "Hardware key verified · Local storage only", "Optimal".

### 22. Home
- Keep the ring, the forecast card, "Log today", the phase names.
- Cut "Estrogen gently rising" and "Light social capacity". Emi models no hormones.
- The mood and energy cards show what she logged today, or "Not logged today". A new person has
  logged nothing, so "Balanced and calm" is invented.
- Rewrite "Zero knowledge local vault, Key active" as: "Encrypted on this phone."
- The date says 20 May and the forecast says October. Use one sample date.

## Found in the product, not only in the export

`apps/mobile/src/features/onboarding/copy.ts` has the keys `onboarding.welcome.line.nothingSent` and
`onboarding.welcome.line.noAccount`. After feature 6, a sealed day is sent and an account exists.
The welcome copy must be checked when feature 6 ships.
