# The voice Emi speaks in

Status: designed

Every word a woman reads in Emi follows the nine rules below. They come from
https://github.com/atlantic-blue/emi/issues/248, which read 112 screenshots of another tracker's
first run and compared them with ours.

They replace the older rule, which said: say what happens, never congratulate, no exclamation
mark, write the number. That rule kept the product honest and made it read like a specification.
Emi talked about itself in the third person, the answers were written as labels, and nothing
replied when she answered.

## The nine rules

1. Talk to her, not about Emi. Write "you" and "we". Use "Emi" as a subject only in the approved
   denials, and where the product's name is the point.
2. Use her name at the moments that are about her: the question after she gives it, how she feels
   today, her first forecast, and what we do with her answers. Every line that holds `{name}` has
   a form without it, for when she skipped the name.
3. Write the answers in her words, in the first person: "I'm not sure yet", "Honestly, it's hard
   most months".
4. Say why we ask, in one short line before the question.
5. Reply when she answers. One short line under the chosen option, which says how her answer
   changes Emi.
6. Use contractions. Write short sentences. One idea per line.
7. Always give a way out: "I don't remember", "I'm not sure", "Nothing today".
8. Keep it warm, not loud. At most one exclamation mark in the whole first run, which is the
   greeting, and no emoji.
9. Never borrow what we do not have: no user counts, no ratings, no experts, no screen that says
   it is analysing, and no promise that she will never be caught out.

## What the voice does not touch

Every gate in the pipeline still applies, unchanged.

- `tools/pipeline/forbiddenClaims.ts` refuses the wording Emi may never use about itself, in all
  three languages, and allows it only inside an approved denial that begins a sentence.
- `tools/pipeline/interfaceClaims.ts` adds the words a screen may not say even though a document
  may: safe, protected, and the standards nobody has held Emi to.
- `tools/pipeline/sampleWording.ts` holds the one sentence Emi may write about drawing nothing
  from nothing.
- `tools/pipeline/singleDayForecast.ts` keeps the two single day fields out of the interface.
- `tools/pipeline/screenWords.ts` refuses a word written into a screen instead of the catalogue.

The two denials travel word for word, after a full stop, on each screen that names a forecast:
Emi is not a contraceptive. Emi is not a medical device.

## Where the words live

Every word is a key in `apps/mobile/src/language/english.ts`, with the same key in `spanish.ts`
and `russian.ts`. A screen names a key and never a sentence. A rule above that changes an English
line changes the other two catalogues in the same change, because `languages.test.ts` holds the
three of them to one key set.
