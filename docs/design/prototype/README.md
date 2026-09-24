# The prototype

The markup here is the source of truth for what Emi looks like. It is the Warm Editorial Journal
style, exported from Google Stitch on 2026-09-23.
`docs/design/prototype-design-system.md` is written from it, and every later step of the style
feature builds from that document. So a value that moves here moves everything, and a value that
moves anywhere else has left the prototype behind.

Each screen carries the configuration it draws with, in a script element with the id
`tailwind-config`. All twenty three carry the same one. `tools/pipeline/prototype.test.ts` reads it
out of `screen-0-style-sheet.html` and compares it with the front matter of the design system
document, value for value: the colours, the spacing and the thirteen type roles with their sizes,
line heights, tracking and weights. The corners are the one block the two sides do not agree about.
The token package took the design system's scale and `apps/mobile/tailwind.config.js` reads the
token package, so the application draws that one. That answers
https://github.com/atlantic-blue/emi/issues/159, and the difference stays recorded in
`tools/pipeline/prototype.ts` rather than edited out of the export.

The eight phase colours are the one thing the configuration does not name. The screens draw the four
arcs and the four labels beside them as plain values inside the ring, so the front matter names the
eight and the check reads them back out of `screen-0-style-sheet.html`.

## The twenty three screens

The first six arrived with the style. Screens 6 to 22 arrived on 2026-09-23, with the copy review
beside them in `copy-review.md`.

`screen-0-style-sheet` is the style sheet. It draws the palette, the ring, the type scale, every
component and the grid on one page. It is the screen the configuration and the phase colours are
read from.

`tour-card-1` is the first card of the opening tour. It carries the ring, the cycle day and the
phase name.

`tour-card-4` is the last card of the tour. It carries the price.

`welcome` is the privacy screen of the first run.

`name` asks what Emi should call her.

`year-of-birth` asks the year she was born.

`last-period` asks when her last period started, on a month grid.

`period-before` asks for the period before that one, and says what a second date buys.

`cycle-length` asks how long her cycle runs, on a stepper.

`period-length` asks how many days she bleeds.

`cycle-regularity` asks whether her cycle is regular, on three choice rows.

`feeling` asks how she feels about her cycle, on three choice rows.

`goals` asks what she wants Emi for, on four rows she can pick more than one of.

`focus` asks which symptom groups to put first, on six tiles.

`today` offers the six tiles for the day she is on.

`first-forecast` shows her first range, and says why it is a range.

`the-promise` is the privacy screen at the end of the first run.

`reminder` offers the notification two days before.

`what-emi-gives-her` is the summary of what she chose.

`hold-to-begin` is the ring she presses and holds, which is the one moment the first run writes.

`free-month` is the paywall.

`all-set` is the screen after the hold.

`home` is the day screen, with the ring, the forecast and the dock.

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

### Copy that names a screen Emi has not built yet

`You can change these in Settings.` on the focus screen. Settings holds one control, and it deletes
everything. The sentence promises her a way to change her groups that nothing builds, so the focus
screen does not say it. Write it again in the step that lets her change her focus in Settings, and
not before. The copy review of screen 13 keeps this line, because the reading was of the words and
not of what Settings can do.

## The retired canvas, and the one edit made to the markup

The export carries a second palette in its prose, and the canvas of that palette is `#faf8f5`. It
reached four screens as paint: `tour-card-1`, `hold-to-begin`, `all-set` and `home` each drew a
circle inside the ring with it, straight into a `fill` or a `stroke` attribute, where the
configuration never saw it. The front matter holds no such value, so the ring bead of four screens
was drawn in a colour the design system does not name.

Those four attributes now hold the front matter's `background`, which is `#fff8f5`. That is the one
edit made to the markup, and it is recorded here rather than hidden: the design decision of
2026-09-23 is that the front matter is the one palette, and a screen that paints outside it is a
screen the application would be built wrong from. The pictures beside the markup were rendered by
the tool before the edit, and the two values differ by five parts in two hundred and fifty five on
one channel, so the pictures still show what the markup draws.

`tools/pipeline/prototype.test.ts` now reads every colour each screen paints with and holds it
against the front matter, so a value can no longer arrive through an attribute. It reads the tags,
the style blocks and the script blocks, and never the text between them, because the style sheet
screen prints `#FAF8F5`, `#F4EFEA`, `#262220`, `#B83A2A` and `#FBEBE8` as swatch labels for a
reader, and `year-of-birth` names `#EDE6DE` in a comment. Those are words about the export's own
prose palette, not paint, and they stay exactly as the tool wrote them.

Read a colour from the front matter and never off the markup.

## What the check does not hold

The check reads the configuration, the eight phase colours, the colours each screen paints with and
the false claims of the copy review. The words on these screens are not approved copy, the numbers
are invented for the drawing, and several pieces are not in version 1. Read the markup for the
shape, the spacing and the colour, read `copy-review.md` for the words, and read `.krewe/design.md`
for what Emi builds.
