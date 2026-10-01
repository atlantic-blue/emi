# The prototype

The markup here is the source of truth for what Emi looks like. It is the redesign the operator
approved on 2026-10-01, written by the same tool that wrote the style before it.
`docs/design/prototype-design-system.md` is written from it, and every later step of the redesign
builds from that document. So a value that moves here moves everything, and a value that moves
anywhere else has left the prototype behind.

The redesign carries no configuration element. Each screen writes its colours straight into the
markup it paints, as an inline style or an attribute. So there is no block of named values to
compare, and `tools/pipeline/prototype.test.ts` holds the two sides together one colour at a time
instead: every colour the fifty two screens paint with has a name in the front matter, and every
name in the front matter is painted by a screen. A translucent value is read as the opaque colour
underneath it, so a surface at seven tenths and a shadow at four hundredths are both held to a name.

Four colours are named twice, because the prototype paints one value and Emi builds another. Each
one is a colour the prototype draws below the contrast floor of 4.5 to 1, and the front matter
records the value the prototype paints, the value Emi builds, the ground each was measured on and
the reason. The colour check reads the painted value and the token package reads the built one.

`canvas.json` places the screens beside each other, in the seven rows below. The screen the canvas
launches is `Main.dc.html`, and every other file is named after its screen in
`docs/design/mockups/flows.json`.

## The fifty two screens

**First run, the questions.** `welcome`, `tour`, `name`, `yearOfBirth`, `lastPeriod`,
`lastPeriodNext`, `periodBefore`, `cycleLength`.

**First run, the rest.** `periodLength`, `regularity`, `feeling`, `goals`, `focus`,
`todayFirstRun`, `reminder`, `reminderPermission`.

**First run, the promise and the key.** `firstForecast`, `firstForecastLearning`, `thePromise`,
`whatEmiDoesWithIt`, `hold`, `recoverySetup`, `recoveryCode`, `recoveryConfirm`.

**Today.** `Main`, `todayLuteal`, `todayLogged`, `todayEmpty`, `todayEmptyBody`, `today`, `lock`,
`notification`.

**Log and the calendar.** `log`, `logSymptoms`, `calendar`, `calendarEarlier`, `day`, `dayRefused`,
`editPeriod`.

**Insights.** `history`, `todayNumbers`, `citation`, `todayCycles`, `todayTrends`, `todayPatterns`.

**Privacy.** `privacyNext`, `settings`, `yourAnswers`, `answerCycleLength`, `reminderSettings`,
`export`, `delete`.

Two of these screens draw the operating system rather than Emi. `reminderPermission` draws the
dialog the phone puts up to ask about notifications, and `notification` draws a notification on the
lock screen. The colours in those two are the platform's own, so they are named and never measured
as Emi's text on Emi's ground.

## Copy on these screens that must never be built, because it is false

The tool wrote words that Emi cannot say. Each one is recorded here so that a later step reads the
shape and the spacing off these screens and never the sentences. `copy-review.md` is the reading of
screens 6 to 22 that found most of them, and `tools/pipeline/prototype.ts` holds the list, so a
claim dropped from either document is named by the check rather than quietly lost.

### The words that are never written

`Never write AES, enclave, hardware key, audited, zero knowledge or zero cloud.` The envelope is
XChaCha20-Poly1305, the key sits in the keychain through expo-secure-store, and no auditor has read
Emi. See `packages/crypto`.

`Never write "never leaves this phone" about a day.` Feature 6 sends sealed days to the server so a
new phone can restore them. The server holds ciphertext and no key, which is a different sentence
and a true one.

`AES-256` and `AES-256-GCM`, on tour card 4 and on the welcome screen.

`100% Local Storage` and `Nothing is sent anywhere`, on the welcome screen.

`local device KeyStore` and `Hardware Keystore`, on the name screen and the welcome screen.

`Used strictly for age-adjusted cycle variance algorithms`, on the year of birth screen. Nothing in
Emi reads her age. The prediction is the median of her own cycle lengths and the spread of them.

### What the export claims about where a day goes

`Saved strictly on this device. Never transmitted or stored on remote servers.` on the last period
screen.

`No health profiling data leaves your device.` on the goals screen.

`stored only in your local key vault` on the today screen.

`Encrypted and Stored Privately in Journal` on the feeling screen. There is no journal, and the
sentence claims a place rather than a fact.

`Stored on device, encrypted in transit` on the free month screen.

`Zero knowledge local vault, Key active` on the home screen.

`Zero Cloud Inference` on the first forecast screen.

### What the export claims about the key and the audit

`hardware enclave`, `Not even our engineers`, `No mandatory email`, `zero residual backups`,
`Audited cryptographic baseline` and `Zero cloud telemetry`, on the promise screen.

`Generates your private cryptographic key in local enclave storage.`, `Private enclave` and
`Local Key Generation · 256-bit AES`, on the hold to begin screen.

`AES-256 · Local Enclave` and `Encrypted offline repository ready`, on the screen that says what Emi
gives her.

`Vault Setup Complete`, `Device enclave locked` and `Hardware key verified · Local storage only`, on
the all set screen.

`We never hold your health history hostage` on the free month screen. A lapse is humane and it is
feature 7 that proves it, so the sentence is not said before the test is.

### Numbers and mechanisms that do not exist

`Global average 26 to 30 days` on the cycle length screen, and `Most periods last between 3 and 7
days` on the period length screen. Neither has a source.

`Adaptive Calibration` on the cycle length screen, `Cycle Calibration Model` on the screen that says
what Emi gives her, `Calibration complete` and `Model version 1.0-local` on the first forecast
screen. There is no model and nothing calibrates. The prediction is arithmetic on her own dates.

`±2 days tolerance` on the first forecast screen. The range is the spread of her own cycles, and it
is not a tolerance.

`Rhythm waveform preview` and `We will broaden windows into softer horizon ranges` on the regularity
screen. Emi draws no waveform, and the answer changes how it explains the forecast and nothing else.

`Cycle rhythm, Regular pattern` on the period before screen. One gap cannot show a pattern.

`toxic positivity and actionable physiology` on the feeling screen. Emi has no such setting.

`Estrogen gently rising` and `Light social capacity` on the home screen. Emi models no hormones.

`Balanced and calm` on the home screen. It is shown to a person who has logged nothing, so it is
invented. The mood and energy cards show what she logged today, or that she logged nothing.

`No lockscreen leak` and `Zero server push` on the reminder screen. The reminder is set on the phone
and no server sends it, which is the true sentence, and the sample notification on that screen
reads `A quiet window begins in two days`, which tells anybody who picks up the phone. That sample
is not built either.

### The pictures, the avatar and the counters

The stock photographs, sixteen of them across eleven screens. `cycle-length`, `feeling`,
`first-forecast` and `period-before` draw two each, `goals`, `period-length`, `reminder`, `today`,
`welcome` and `year-of-birth` draw one each, and the style sheet draws two more. Every one is a
hosted file that is not in this repository. The design refuses a body, a face, a flower, a droplet
and blood, and illustration here is abstract. `copy-review.md` names the icon each one becomes.

The account avatar in the header, on nineteen of the twenty three screens. Only `all-set`,
`hold-to-begin`, `tour-card-1` and `tour-card-4` are without it. There is no account in Emi and no
picture of her anywhere.

The step counters, in nine spellings. Tour card 1 says `1 of 4`, `welcome` says `01 / 12`, `name`
says `Step 04 · 15`, `year-of-birth` says `Step 05 / 15`, `last-period` says `06 · 15`,
`period-before` says `Cycle Record · 02`, `cycle-regularity` says `Journal Step 10 · 15`, `focus`
says `JOURNAL STEP 13 · 15 • CYCLE DYNAMICS` and `first-forecast` says
`JOURNAL STEP 15 · 15 • INITIAL FORECAST`. They count something that does not exist. One thin
progress bar carries the position.

The monospaced caption lines that name no fact, for example `tension pulse`, `gentle horizon`,
`Editorial Note` and `emi editorial private records, chapter iv`.

The contrast ratios on the style sheet. It prints a figure beside each phase and calls the set
compliant with level AAA and level AA. Those figures are for an ink read against the canvas, not
against the fill the same panel pairs it with. Three of the four inks fail the floor on their own
fill, which is the whole reason no text is ever drawn on a fill. The measured numbers are in the
step that moves the tokens.

## What the check does not hold

The check reads the colours each screen paints with, the names the front matter gives them, the four
phase pairs, the prose of the design document and the false claims of the copy review. The words on
these screens are not approved copy, the numbers are invented for the drawing, and several pieces
are not in version 1. Read the markup for the shape, the spacing and the colour, read
`copy-review.md` for the words, and read `.krewe/design.md` for what Emi builds.

The screens carry no pictures. The export wrote none, each screen loads a support script this
repository does not hold, and each one asks a remote host for its face. The pictures the pipeline
compares are the ones under `apps/mobile/tests/pictures` and `brand/screens`, drawn from the
application itself.

Read a colour from the front matter and never off the markup.
