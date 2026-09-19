# The story of Emi

Emi is a period and cycle tracker. This document shows what it looks like. It follows one woman
through the product, one feature at a time, and it puts a picture under each thing she does.

`features.md` names the eight features. `contracts.md` says what each part must do. Neither one
shows anybody a screen, so a person who wants to know what Emi looks like has to run it. This is the
document that answers that instead.

## How to read it

A section tells one feature. The sections are in the order `features.md` gives.

A beat is a sentence and a picture. The sentence says what she does. The picture shows the screen
she does it on.

Every picture here was rendered under the test runner. The runner mounts the screen the application
ships, reads the tree it produced, and draws that tree in a browser. No picture was captured from a
phone. The line under each picture says so, and it names the command that draws the picture again.

Two things a rendered picture does not carry. No screen names a font family yet, so the browser
draws the words in its own face where a phone draws them in the system face. And a browser lays a
screen out in rows where a phone lays it out in columns, which the renderer restores by hand, so a
control can sit a little higher up the frame than it does on a phone.

One feature has a section today. The pipeline runs `npm run check:story`, which names every feature
with no section, names every picture in `brand/screens` that no section shows, and fails when the
story names a picture that is not there. A later step turns the first of those into a failure as
well. Feature 7 is not built yet, so there is nothing of it to show.

## Feature 2: She opens Emi and logs her first period

She installs Emi and opens it. Three screens ask her two things, and then she is on her own ring
with her own period on it. Nothing leaves the phone, and she is never asked who she is.

She opens Emi for the first time and it asks her nothing about herself. It says what Emi does, what
it never does, and the two things it refuses to be.

![The welcome screen, step one of three](../brand/screens/welcome.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:welcome-picture`.

It asks when her last period started, and it opens on the month she is in. Today and yesterday sit
above the calendar, because those are the two answers she gives most. A day she has not lived is
drawn faint and takes no press.

![The month calendar, with a day five back chosen](../brand/screens/last-period.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:last-period-picture`.

It asks how long her cycle runs. The number starts at 28 days, and one press moves it by one day,
between 21 and 45. Emi corrects this itself once it has seen two cycles of her own, and the screen
says so.

![The cycle length screen at 28, 31 and 21 days](../brand/screens/cycle-length.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:cycle-length-picture`.

Her answers make the ring, and the ring is the product. It carries the day of her cycle and the
phase she is in, so she can read it across a room and nobody beside her can. It draws what her own
records support and no more: with one cycle recorded Emi says it is still learning, and it gives a
range with a confidence only once it has two.

![The home screen at six recorded histories](../brand/screens/home-screen.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:home-picture`.

Her week sits above the ring. Seven columns end on today. Each column says which day of her cycle
it was. A day she bled is filled and carries the day of her period. A day her next period can start
on has a dotted outline. She presses a column to open that day and correct it.

![The week above the ring, on six recorded histories](../brand/screens/home-screen.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:home-picture`.

She bleeds, so she logs the day. She presses one of five flow values and the ring redraws around
her. A day she marks as not her period is kept and never starts a cycle.

![The flow screen, before and after she picks](../brand/screens/log-flow.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:flow-picture`.

She forgot a day of that period, and it is now several days later. She opens that day at its own
address and corrects it. The ring beside the picker stays on today, because what a corrected day
changes is where she stands now. A day she has not lived is refused by the write and not only by the
screen.

![A past day, corrected, and a future day refused](../brand/screens/past-day.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:past-day-picture`.
