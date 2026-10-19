Feature: She opens Emi and logs her first period

  She arrives knowing nothing about Emi and Emi knows nothing about her. A few questions and one
  hold later her last periods are recorded and the ring is drawn from her own days.

  Every scenario below is named for the contract it proves. The contracts are in
  docs/contracts.md and the map from feature to contract is in docs/features.md.

  Scenario: SCREEN-1, her first run ends on the home screen with her period recorded
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run
    And she presses and holds Hold to begin
    Then she is looking at the home screen
    And her phone holds the day she said her period started
    And her phone holds the cycle length she gave

  Scenario: SCREEN-1, her stated cycle length is not readable in the sealed profile
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run
    And she presses and holds Hold to begin
    Then her phone holds the cycle length she gave
    And the row her answers sit in does not hold that number in plain words
    And the row is not her answers in plain words, which do hold the number

  Scenario: SCREEN-1, she answers everything, leaves before the hold, and nothing is written
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run
    And she closes Emi at the hold, without holding Hold to begin
    Then her phone holds no day, no answers and no marker
    And opening Emi again asks her the same questions

  Scenario: SCREEN-1, she presses Done twice and her first run is written once
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question, and presses Done a second time before the screen goes
    And she presses and holds Hold to begin
    Then she is looking at the home screen
    And her phone holds one day, the day she said her period started
    And her phone holds the time of the hold, and one instant on all three of her answers

  Scenario: SCREEN-1, she picks a tile on her first day and then says she has nothing to add
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the question about how she is today
    Then Save today waits until she picks a tile
    When she picks cramps
    And she presses Nothing to add
    Then she is asked whether Emi should remind her
    When she says Not now
    Then she is looking at her first forecast
    When she reads on and presses and holds Hold to begin
    Then her phone holds one day, the day she said her period started

  Scenario: SCREEN-1, she asks Emi to remind her two days before the range starts
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the reminder after the first day she logs
    Then Remind me waits until she picks when
    And the sample on the screen names a forecast and a day, and nothing about her body
    When she picks two days before
    And she presses Remind me and her phone allows it
    Then her phone asked her once, after she pressed
    And she is looking at her first forecast
    When she reads on and presses and holds Hold to begin
    Then her phone holds one reminder, at nine in the morning two days before the range she was shown

  Scenario: SCREEN-1, her phone refuses the reminder and the first run goes on
    Given she has never opened Emi before
    And her phone will refuse notifications
    When she opens Emi
    And she reaches the reminder after the first day she logs
    And she picks one day before and presses Remind me
    Then she is looking at her first forecast
    When she reads on and presses and holds Hold to begin
    Then her phone holds no reminder and no choice of one

  Scenario: SCREEN-1, the first run asks its questions and the hold after them
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run
    And she presses and holds Hold to begin
    Then she was asked what Emi is, her name, the year she was born, her last three periods, how long her cycle runs, how long her period lasts, how steady her cycle is, how she feels about it, and what she wants Emi to help with, and what changes with her cycle, and what she feels today, and whether Emi should remind her
    And there was no further question to answer

  Scenario: SCREEN-1, the first run asks for no account, no email address and no password
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run
    And she presses and holds Hold to begin
    Then the only thing she could type into was her name

  Scenario: SCREEN-1, she says she will log as she goes and the first run moves on
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the step that asks for her last three periods
    And she says she will log as she goes
    Then she is being asked how long her cycle runs
    And the question she could not answer is behind her

  Scenario: SCREEN-1, the way past the three periods step leaves no date
    Given she has never opened Emi before
    When she opens Emi
    And she gives her name and the year she was born, and reaches the step that asks for her last three periods
    And she says she will log as she goes
    Then she is being asked how long her cycle runs
    And the counter reads step 5 of 12, one step for her last three periods
    When she answers the rest of the questions and presses and holds Hold to begin
    Then she was never asked for a period again, on a step of its own
    And she is looking at the screen that says the ring needs a period
    And her phone holds the name, the year and the length she gave, and no day at all

  Scenario: SCREEN-1, she gives her last three periods and her first forecast is ready
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the step that asks for her last three periods
    Then the step asks for three periods, and says the third can be skipped
    When she gives three periods, each with the day it started and the days it lasted
    And she answers the rest of the questions and presses and holds Hold to begin
    Then her phone holds every bleeding day of the three periods, and no other day
    And her forecast is ready, and not still learning
    And Insights reads the period length she gave

  Scenario: SCREEN-1, she gives three periods and confirms the lengths Emi worked out from them
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the step that asks for her last three periods
    And she gives three periods, 27 days apart, that lasted 6, 6 and 4 days
    Then the cycle question says her records average 27 days, and the wheel stands on 27 with Done ready
    When she presses Done without turning the wheel
    Then the period question says her records average 6 days, and the wheel stands on 6 with Done ready
    When she presses Done without turning the wheel
    And she answers the rest of the questions and presses and holds Hold to begin
    Then her phone holds a cycle length of 27 days and a period length of 6 days

  Scenario: SCREEN-1, the first run with no date ends on a forecast that says it is still learning
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the step that asks for her last three periods
    And she says she will log as she goes
    And she answers the rest of the questions
    Then she is reading her first forecast, and Emi says it has no date to count from
    And a line says the first period she logs starts everything
    And a line names the cycle length she gave, and no length Emi picked
    And the card says Emi is still learning, how many complete cycles it needs, and why it does not guess
    And a line says Emi builds no forecast from a date it guessed
    And no range and no date is written anywhere on that screen
    And that is the drawing of the first forecast with no date, part for part, in its order
    And the screen offers the way on, and no way back to the question she could not answer
    When she presses the way on
    Then she is reading what Emi promises her

  Scenario: SCREEN-2, the home screen shows the ring, the day of her cycle and the phase she is in
    Given her phone holds six cycles of her own
    When she opens Emi
    Then she is looking at the home screen
    And the ring says she is on day 2 of 28, in the period phase
    And the ring is drawn on the screen she is looking at

  Scenario: SCREEN-2, no word a stranger could read is drawn above 14 points
    Given her phone holds six cycles of her own
    When she opens Emi
    Then the words period, bleeding, fertile and ovulation are all drawn at 14 points or less
    And at least one of those words is on the screen, so the measurement is of something

  Scenario: SCREEN-2, the screen she opens begins at the top of the glass
    Given her phone holds her answers and not one day
    When she opens Emi
    Then she is looking at the home screen
    And the first thing it says sits at the top of the glass, with no empty room above it
    And the room left over falls under the last thing on it, and not above the first

  Scenario: SCREEN-4, she opens the day she got wrong and the ring is redrawn
    Given her phone holds six periods and a Monday she said nothing happened on
    When she opens that Monday
    And she says her period came back that day
    Then that Monday holds the flow she picked
    And the ring says she is on day 4 of 28, in the follicular phase

  Scenario: SCREEN-4, an edit raises the revision of the day she changed
    Given her phone holds six periods and a Monday she said nothing happened on
    When she opens that Monday
    And she says her period came back that day
    Then that Monday is at revision 2
    And today holds nothing, because she edited a Monday and not today

  Scenario: SCREEN-4, a day that has not happened yet is refused
    Given her phone holds six periods and a Monday she said nothing happened on
    When she opens a day two days ahead of today
    Then she is told the day has not happened yet
    And there is nothing on that screen to pick a flow with
    And pressing back leaves her on the home screen with nothing written

  Scenario: SCREEN-4, an address that is not a day in the calendar is refused
    Given her phone holds six periods and a Monday she said nothing happened on
    When she opens the thirtieth of February
    Then she is told that is not a day
    And there is nothing on that screen to pick a flow with

  Scenario: BRAND-3, her own cycle sizes the four arcs
    Given her phone holds six cycles of forty five days
    When she opens Emi
    Then the ring draws four arcs, each one sized by the days of that phase

  Scenario: BRAND-3, the arcs and the ground between them cover the whole ring
    Given her phone holds six cycles of forty five days
    When she opens Emi
    Then the arcs and the gaps between them come to a whole turn

  Scenario: BRAND-3, a phase her cycle had no room for is not drawn
    Given her phone holds six cycles of twenty one days with a week of bleeding
    When she opens Emi
    Then a phase of no days is not drawn at all
    And the arcs and the gaps between them come to a whole turn

  Scenario: BRAND-3, the pointer sits on the day she is on and never outside her cycle
    Given her phone holds six cycles of forty five days
    When she opens Emi
    Then the pointer sits on the day the ring says she is on
    And the pointer moves further round the ring on a later day

  Scenario: SEE-1, every boundary between two phases is a gap in the ring
    Given her phone holds six cycles of forty five days
    When she opens Emi
    Then every boundary between two phases is a gap of ground and not a change of colour

  Scenario: SEE-1, the ring names in words the phase she is in
    Given her phone holds six cycles of her own
    When she opens Emi
    Then the phase she is in is written inside the ring in words
    And a screen reader is told the day and the phase in the same sentence

  Scenario: SEE-3, every control of the first run is at least 44 points on both axes, apart from a day square
    Given she has never opened Emi before
    When she opens Emi
    And she reads the welcome and skips the tour
    Then every control on each screen of the first run is at least 44 points on both axes, apart from a day square of the month

  Scenario: SEE-3, a square of the calendar keeps its height and takes its width from the month
    Given she has never opened Emi before
    When she opens Emi
    And she opens the first of her last three periods
    Then every square of the month is as high as a thumb needs
    And the seven squares of a week fill the width the calendar gives them on an iPhone 16
    And no square ends past the right edge of the calendar
    And the touch of every square reaches half the gap on each side

  Scenario: SEE-3, a control below the floor is named with the size it was drawn at
    Given a control drawn at 40 points by 44
    When the controls on the screen are measured
    Then the failure names that control and the size it was drawn at
    And a screen with nothing to press is refused rather than passed

  Scenario: SEE-4, the ring moves once when she opens it
    Given her phone holds six cycles of her own
    And her phone is not asking for less motion
    When she opens Emi
    Then the ring moves once, over six hundred milliseconds

  Scenario: SEE-4, the ring stays still when her phone asks for less motion
    Given her phone holds six cycles of her own
    And her phone is asking for less motion
    When she opens Emi
    Then the ring does not move at all, and arrives open

  Scenario: TABLE-1, her phone keeps the day she logged and raises its revision when she changes it
    Given a day log table with nothing in it
    When the fourteenth of September is written and then written again
    Then the day is held once, at revision 2
    And the row keeps the identifier and the creation time it started with

  Scenario: TABLE-1, the same day is never held twice
    Given a day log table holding the fourteenth of September
    When the fourteenth of September is written a second time
    Then the write is refused, and the table still holds one row

  Scenario: TABLE-1, a day that is not written as a year, a month and a day is refused
    Given a day log table with nothing in it
    When a day written as 14-09-2026 is offered to it
    Then the write is refused, and the table holds nothing
    And the table itself refuses that day, whatever wrote it

  Scenario: TABLE-1, a write that does not raise the revision is refused
    Given a day log table holding the fourteenth of September
    When that day is changed without raising its revision
    Then the table refuses the write and says the revision must rise

  Scenario: TABLE-1, bytes that are not an envelope are refused
    Given a day log table with nothing in it
    When a day carrying bytes that are not an envelope is offered to it
    Then the write is refused, and the table holds nothing

  Scenario: TABLE-1, a write that leaves the update time behind the creation time is refused
    Given a day log table with nothing in it
    When a row whose update time is behind its creation time is offered to it
    Then the table refuses the write and says so

  Scenario: SCREEN-2, she reads her three cycle numbers beside the published figures
    Given her phone holds three cycles of her own
    When she opens Emi
    Then she reads how long her last cycle ran, how long her last period ran, and how much her cycles vary
    And beside each of the three she reads the figure a published paper reports
    And the published figure beside her cycle length is 24 to 38 days
    And she is told the published figure is the one the paper reports and the paper is one press away
    And none of the three numbers is called normal, abnormal or irregular
    And the cycle length she reads here is the one the Insights screen gives that same cycle
    And the period length she reads here is the bleeding the Insights screen gives that same cycle

  Scenario: SCREEN-2, the screen she opens names emi and greets her by the name she gave
    Given her phone holds cycles of her own, and she gave the name Ada
    When she opens Emi
    Then the header is the first thing on the screen she opens
    And it carries her initial in a disc, then the word emi, then the greeting, then the calendar button
    And the greeting reads Hello, Ada
    And the ring mark the older header carried is gone
    And the drawing of this screen puts that header first, and the screen answers for it
    And a woman who gave no name reads the disc, the word, and hello on its own

  Scenario: SCREEN-2, she reads the day of her cycle without pressing anything, and the week strip is gone
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then she reads the day of her cycle in the middle of the ring without pressing anything
    And that is the day the ring says for today
    And no part of the strip of seven days is drawn
    And the calendar button in the top bar stands above the ring, where the strip was
    And the strip is the one part of the top of the drawing the screen does not build

  Scenario: SCREEN-2, she reads her phase and her cycle day as words from across the room
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then in the middle of the ring she reads Day and the day of her cycle, in type large enough to read across a room
    And the phase she is in is written over it, in words
    And the day of her cycle is drawn far larger than the phase over it
    And the words period, bleeding, fertile and ovulation are still drawn at 14 points or less
    And the phase is written in the ink of that phase, and never on the colour of it
    And under the ring a card names the phase and its days, and the line under the ring is gone
    And the same screen three weeks later reads her luteal phase the same way

  Scenario: SCREEN-2, she starts a log from the screen she opens in one press
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then under the ring she reads three round actions, Sex, Period and Cycle phase, in the order the board places them
    And each of them is at least 44 points on both axes
    And there is no Log today button, and no link to the history, the export or the settings
    And there is no Symptoms action under the ring
    And pressing Sex puts her on the Sex page of today
    And pressing Period puts her on the Period page of today
    And pressing Cycle phase puts her on the Cycle phase page
    And the dock still reaches the history and the privacy screen

  Scenario: SCREEN-2, the Cycle phase page opens the log on the groups and the dock still opens on the flows
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    And pressing the Log column of the dock opens the log on the flow options
    And that is the drawing of the log, which places the flow options before the groups
    And the log draws a tile for each symptom group, and lists no symptom
    When she goes back to Today, and presses Cycle phase, and then All symptoms in its diary
    Then she is on the log, and the first thing she can mark there is a symptom
    And the groups she sees first are open, and no other group
    And the search finds a symptom of a group that is not open
    And the drawing of that screen places a symptom group, and places no flow picker
    When she closes the symptoms and presses the Log column of the dock
    Then the log opens on the flow options again

  Scenario: SCREEN-2, she records a symptom and the screen she started on shows it
    Given her phone holds the period days behind today, and nothing at all for today
    When she opens Emi
    Then nothing on the screen reads back a log for today, and there is no empty row either
    And that is the drawing of the screen she opens, which places no such row
    When she presses Cycle phase, and then All symptoms in its diary
    And she marks the two symptoms the drawing names
    And she presses Save, under the count of what she picked
    Then she is back on the screen she started on
    And under the day of her cycle she reads that she logged today
    And the line under it names both symptoms she marked, and no symptom she did not
    And that is the drawing of the screen she comes back to, down to the ring
    And pressing what she logged opens the log on the symptom groups again

  Scenario: SCREEN-2, she reads Emi in Russian, records fatigue, and the screen she started on names it in Russian
    Given her phone reads Russian, and holds the period days behind today and nothing at all for today
    When she opens Emi
    And she presses Cycle phase, and then All symptoms in its diary
    And she marks fatigue
    And she presses Save, under the count of what she picked
    Then she is back on the screen she started on
    And the line under the day of her cycle names усталость, and no English name

  Scenario: SCREEN-4, she opens a month and reads the cycle day of every day in it
    Given her phone holds three recorded cycles
    When she opens the month
    Then she is reading the month the drawing names, in seven columns
    And above every date is the day of her cycle that date falls on
    And every one of those before her next forecast period is the day the ring says for that date
    And the count starts again at 1 on the day the forecast puts her next period on
    And the days she bled are filled
    And the days the forecast puts her next period on are dashed rings
    And today is ringed
    And every square is as high as a thumb needs, and takes its width from the month

  Scenario: SCREEN-4, she reaches a month from the screen she opens by pressing the calendar button
    Given her phone holds three recorded cycles
    When she opens Emi
    Then the calendar button in the top bar is at least 44 points on both axes
    And it is named the calendar for somebody listening, as a button
    And the dock still holds the four columns it held, and nothing else
    When she presses the calendar button
    Then she is reading the month today falls in
    And that is the month the drawing names, with the parts the drawing places in its order
    When she presses the way back
    Then she is on the screen she opened, and no strip of seven days is drawn on it
    And pressing the calendar button again reaches the same month

  Scenario: SCREEN-4, she presses a day in the month and reads what she wrote that day
    Given her phone holds three recorded cycles, and a symptom she marked on one day
    When she opens the month
    Then the card at the foot names today, because she has pressed no day
    When she presses the day the drawing names
    Then a card at the foot names that date in words
    And it names the day of her cycle that date falls on, and the phase she was in
    And it names the symptom she marked that day
    And that is the month the drawing names, down to the card
    When she presses the open button on the card
    Then she is looking at that day, and at no other
    When she says her period came that day
    And she presses the way back
    Then she is reading the month again, and the card names the flow she just picked
    And the day of her cycle over that date is the day the ring now says
    And pressing another day of the month names that day instead

  Scenario: SCREEN-4, a day that has not happened yet is a forecast in the month and refused at its address
    Given her phone holds three recorded cycles
    When she opens the month
    And she presses the square two days ahead of today
    Then she is still reading the month, and the card names that day with when her next period is likely to start
    And the card offers no way into that day, and the square is not faint
    And a day she already lived still takes a press and names itself at the foot
    When she opens that same day ahead of her by its address
    Then she is told the day has not happened yet
    And that is the drawing of the day Emi refuses
    And there is nothing on that screen to pick a flow with
    When she presses the way back
    Then her phone holds nothing on that day

  Scenario: SCREEN-4, she reads her forecast periods in the month ahead
    Given her phone holds three recorded cycles
    When she opens the month
    And she presses the way to a later month
    Then the forecast period in that month is drawn in dashed rings, and its cycle day starts at 1
    And the fertile window of that forecast cycle is tinted, with its ovulation day filled
    When she presses the first day of that forecast period
    Then the card says a later period is likely to start between that day and a later one
    And the card offers no way into that day

  Scenario: SCREEN-4, she swipes back two months and reads a day in that month
    Given her phone holds three recorded cycles
    When she opens the month
    And she presses the way to an earlier month
    Then she is reading the month before, which is the month the drawing of it names
    And that is the drawing of the month before, with the parts it places in its order
    And no square of it is ringed, because today is in the month she opened
    When she presses the way to an earlier month again
    Then she is reading the month two behind the one she opened
    When she presses a day of that month
    And she presses the open button on the card
    Then she is looking at that day, two months behind today
    When she presses the way back
    Then she is reading that same month again, and not the month she opened
    When she presses the way to a later month twice
    Then she is reading the month she opened, with today ringed on it
    And both ways to another month are at least 44 points on both axes

  Scenario: SCREEN-4, she corrects a whole period in one save and the ring redraws
    Given her phone holds a period of four days, and two complete cycles behind it
    When she opens Emi
    And she presses the calendar button in the top bar
    Then she is reading the month that day falls in
    When she presses the way to edit her period
    Then she is looking at the period picker, and that is the drawing of it
    And the four days Emi holds arrive as hers, and no other listed day does
    And somebody listening is told each day is one she can turn on and off
    And no day she has not lived yet is listed
    When she presses the two days her period ran on after that
    And she presses the day her period did not start on
    Then each of those three rows carries its tag, Added or Taken off
    And the line under the list names the two days she added and the day she took off
    When she saves, once
    Then she is reading the month again, and the two days she added are filled on it
    And the day she took off is not filled
    When she reaches the screen she opens
    Then the ring says a different day of her cycle than it said before
    And the day her next period is expected to start on moved as well
    And the first day she added was on her phone already, and it is at one revision higher now, under the identifier it had
    And the second day she added was never on her phone, and it is there now at its first revision
    And the day she took off is at one revision higher too, under the identifier it had
    And no day of that month she pressed nothing on was written at all
    And every cycle on her phone comes from the days she recorded, and a cycle written by hand is refused

  Scenario: SCREEN-2, she reaches the page that says where each published figure comes from
    Given her phone holds three cycles of her own
    When she opens Emi
    And she presses the way to where these figures come from
    Then she is reading one row for each published figure Emi puts beside her own numbers
    And each row quotes the figure, names the paper that reports it, and gives the identifier of that paper
    And the cycle length is credited to the International Federation of Gynecology and Obstetrics, and not to nobody
    And she is told every figure is quoted in the words the paper reports it in
    When the arithmetic is changed to cite another paper, reporting another range
    And she opens the page again
    Then she reads the new range and the new paper, because the page quotes the arithmetic and keeps no copy of it
    When the arithmetic is put back
    And she opens Emi again
    And she presses the way to where these figures come from
    And she presses the way back
    Then she is on the screen she opened, reading her three numbers again

  Scenario: SCREEN-2, she reaches a past cycle from the screen she opens and comes back to it
    Given her phone holds three cycles of her own
    When she opens Emi
    Then she reads a strip for the cycle she is in, and one for each of the three cycles before it
    And each strip names the days that cycle covers, how long it ran, and how much of it she bled
    And the length on each strip is the length her phone holds for that cycle
    And each strip draws the four phase fills, and not one word sits on a fill
    And under the strips she is told what they are and that one of them opens
    When she presses the strip of the cycle before the one she is in
    Then she is reading Insights, with that cycle marked and no other cycle marked
    And Insights gives that cycle the same length and the same four arcs the strip gave it
    When she presses the way back
    Then she is on the screen she opened, reading the same four strips

  Scenario: SCREEN-2, she reads the shape of her last six cycles against the published range
    Given her phone holds six complete cycles, three of which ran outside the published range
    When she opens Emi
    Then she reads one point for each of her six complete cycles, oldest first
    And the published range of 24 to 38 days is shaded behind the points
    And each point sits where that cycle length falls against the two numbers on the axis
    And she is told three of her last six complete cycles ran outside the band
    And three is the number she gets by counting the points drawn outside the band
    And nothing in that section calls her cycles normal, abnormal or irregular
    When she presses the way to the same cycles in full
    Then she is reading Insights, listing those same six cycles
    When she presses the way back
    Then she is on the screen she opened, reading the same six points

  Scenario: SCREEN-2, she meets the symptom that comes back without going to look for it
    Given her phone holds six cycles, one symptom in five of them and another in four
    And she logged a third symptom in two of those cycles
    When she opens Emi
    Then she reads one card for each symptom that came back, the most repeated first
    And each card names the symptom and where in her cycle it keeps landing
    And each card names how many of her cycles carried it, out of the six Emi read
    And the symptom she logged in two cycles is named on no card
    And she is told a symptom logged once or twice is not a pattern
    And every number in that section is one of her own counts
    And no word of it calls her normal, abnormal or irregular
    When she presses the card of the symptom that came back most
    Then she is reading Insights, with that symptom marked and no other marked
    And Insights names it at the same point in her cycle, in the same count of her cycles, as the card did
    When she presses the way back
    Then she is on the screen she opened, reading the same two cards

  Scenario: SCREEN-2, a section her data cannot fill carries one sentence and no chart
    Given her phone holds her answers and not one day
    When she opens Emi
    Then where her cycles, her trend and what comes back would be, she reads a waiting section
    And each one says what it needs before Emi can draw it
    And where a section counts her own cycles, it names the count her phone holds
    And every number in the three is a count read off her phone or a threshold Emi states
    And no chart, no strip, no row and no card is drawn in any of the three
    And what comes back says here exactly what it says on Insights

  Scenario: SCREEN-2, day one says what the ring needs and the first period she logs draws it
    Given her phone holds her first run answers and not one recorded day
    When she opens Emi
    Then there is no ring, and nothing at all is drawn in place of one
    And a title says there is nothing to draw yet
    And a line says the ring needs a period, and that a day she bled makes it appear
    And the card counts the cycle length she gave at her first run, and no length Emi picked
    And one button offers to log today
    And that is the drawing of day one, part for part, in the order it places them
    When she presses the button that offers to log today
    Then she is on the log, at the flow options
    When she says her period came today
    And she presses the way back
    Then she is on the screen she opened, reading a ring drawn from the day she logged
    And the ring says she is on the first day of a cycle of the length she gave
    And nothing offers to log today any more, and the two lines are gone

  Scenario: SCREEN-2, every section of the screen she opens is drawn from her own data or absent with a sentence
    Given her answers, and her own days at four states: nothing recorded, one cycle, two cycles and six
    When she opens Emi at every one of those four states
    Then everything she reads on it stands on days she recorded herself
    And a section her own days cannot fill is absent, with one sentence in its place where it owes her one
    And no chart, no strip, no row and no card is drawn from nothing, at any of the four
    And a section arrives on the state her own days earn it, and never on the state before
    And every part of the screen answers to a section, so one nobody accounted for cannot arrive unread
    And no word Emi can say, in any of its three languages, calls anything on a screen a sample

  Scenario: SCREEN-1, she completes the first run with no date, logs a period, and reads a ring
    Given she has never opened Emi before
    When she opens Emi
    And she answers every question of the first run, and says she will log her periods as she goes
    And she presses and holds Hold to begin
    Then she is looking at the screen that says what the ring needs
    And there is no ring, and nothing at all is drawn in place of one
    And the card counts the cycle length she gave, and no length Emi picked
    And her phone holds no day at all
    And that is the drawing of day one, part for part, in the order it places them
    When she presses the button that offers to log today
    And she says her period came today
    And she presses the way back
    Then she is reading a ring drawn from the day she logged
    And the ring says she is on the first day of a cycle of the length she gave
    And nothing offers to log today any more

  Scenario: SCREEN-2, every colour in the redesign prototype has a name in the design document
    Given the fifty two screens of the redesign prototype, and the design document written from them
    When every colour the screens paint with is read against the names in that document
    Then every one of them has a name, and every name in the document is painted by a screen
    And a translucent colour is held to the opaque colour underneath it
    And a colour the prototype paints under the contrast floor records the value Emi builds instead
    And the ink of each phase is readable on the ground the ring writes the phase name on

  Scenario: SCREEN-2, the dock takes the redesign look and keeps its routes
    Given her phone holds six cycles of her own
    When she opens Emi and reads the dock across the foot of the screen
    Then the dock is a white bar that reaches both edges of the glass, under one hairline
    And each of the four columns takes an equal share of the width, with its word under its drawing
    And the drawing in the column she is on is stroked in the accent, and the other three in the quiet dock colour
    And the screen above the bar leaves exactly the room the bar draws
    And pressing each column opens the screen behind it and moves the accent onto it

  Scenario: SCREEN-4, the month grid takes the redesign look
    Given her phone holds three recorded cycles
    When she opens the month
    Then every date sits in a disc of its own, with the day of her cycle above it
    And the days she bled are filled with the colour of her period
    And every day of the fertile window the forecast names is tinted
    And the one day the forecast names as the estimated ovulation is filled
    And a legend above the grid names her period, the forecast and her fertile days
    When she presses the day the drawing names
    Then a card at the foot names that day, over the way to her whole period
    And pressing the open button on that card opens the day it names

  Scenario: SCREEN-2, the option rows and chips take the redesign look
    Given a question carrying every answer Emi can ask her to choose
    When she looks at it without reading a word of it
    Then the answer she chose is the only filled row, and it carries a check
    And the answers she did not choose keep the quiet ground and the words she reads everywhere
    And a question she may answer more than once leaves an empty ring beside each answer
    And the word she turned on is the only filled pill, and the ones she left are outlined
    And the category she chose is tinted and carries a check in its corner
    And the line she types into takes the colour that acts while she is in it
    And the number she is holding sits on a band of its own
    And her thumb reaches every one of them, because none is under forty four points
    When she presses an answer she did not choose
    Then that answer is hers, the answer she held before is not, and each one says so out loud

  Scenario: SCREEN-2, the cards and rows take the redesign look
    Given a page carrying every surface Emi raises a section onto
    When she looks at it without reading a word of it
    Then the plain surface is white, with no line around it, at the one corner a card takes
    And the one surface that reverses carries the dark ground, and the white it was measured with
    And a row she can press carries a drawing at one end, a word, and the mark that points the way on
    And a pill is small, round at both ends, and in the one pair of colours its tone was measured as
    And every pill tone is a pair the contrast test measures, over the floor it holds
    And the line about her privacy carries the drawing of a lock beside its words
    And her thumb reaches every row, because none is under forty four points
    When she presses the row that opens what she already told Emi
    Then that row answers her, and it still says out loud what it opens

  Scenario: SCREEN-2, the buttons take the redesign shapes
    Given a screen carrying every action Emi can ask her to take
    When she reads it without reading a word of it
    Then the action that writes her data is the only filled pill, in the one colour that acts
    And the action beside it is a quieter pill with no fill of its own
    And the quiet action is words alone, with no ground and no rule under them
    And the round action is a disc carrying a drawing and no words
    And her thumb reaches every one of them, because none is under forty four points

  Scenario: SCREEN-2, the top wash takes the colours of the phase of today
    Given the four phases of a cycle, and the wash the design document names for each of them
    When the wash at the top of the screen is drawn for the phase she is in
    Then it runs through the colours that phase names, from its own tint down to the ground
    And each tint fades to nothing, so no phase leaves an edge across the screen
    And a screen that knows no phase yet draws the soft wash every other screen draws
    And no colour of a wash is ever drawn as a word, because colour is all it carries

  Scenario: SCREEN-2, the ring and the top bar take the todayPhases look
    Given her phone holds six cycles of her own
    When she opens Emi and reads the ring and the top bar above it
    Then the middle of the ring names her phase, then Day and the day she is on, then about the length of her cycle
    And every arc is painted whole with a square end, and ground still shows at every boundary between two phases
    And each phase name is written along its own arc, in the colour measured on that arc
    And the pointer on today has an accent head over a dark stem with a white core
    And the strip of seven days is gone, and the calendar button closes the top bar on the right

  Scenario: SCREEN-1, the welcome and the tour say what the redesign says
    Given she has never opened Emi before
    When she opens Emi
    Then the first thing she reads is the welcome, saying Emi learns her cycle and she keeps her data
    And the welcome says where her cycle is worked out, that there is no account, and what Emi is not
    And the tour after it draws the ring with its legend, says what the ring is, and names the price
    And the welcome and the tour are in her own language, and say no word a screen refuses

  Scenario: SCREEN-1, the first run asks her name and then the year she was born
    Given she has never opened Emi before
    When she opens Emi, reads the welcome, skips the tour, and gives her name
    Then the question after it asks the year plainly, as the redesign draws it
    And a woman who gives no name reads the same question, with no gap where a name would be
    And picking that her cycle moves around marks that answer and says nothing back, as the redesign draws it
    And every question that keeps an answer carries a line about her privacy, in all three languages

  Scenario: SCREEN-1, her first forecast reads the redesign label, and the screens after it speak in the name of Emi
    Given she has never opened Emi before
    When she opens Emi, reads the welcome, skips the tour, gives her name, and answers every question
    Then the forecast she reads is labelled Your next period, as the redesign draws it, and no longer greets her by name
    And a woman who gave no name reads the same forecast, with no gap where a name would be
    And the screen that reads her answers back is titled in the name of Emi, for a woman who gave her name and for one who did not
    And the promise and the hold never talk as we, in each of the three languages she can read them in

  Scenario: SCREEN-1, the first run screens match the redesign prototype
    Given she has never opened Emi before
    When she reads every screen of the first run, from the welcome to the hold
    Then each one carries the wash across the top of the glass
    And each question she answers stands on a white sheet that reaches both edges of that glass
    And the drop stands over the sheet, and the bar sits between the way back and the way past
    And the step she is on is written out, so she knows how much is left without counting
    And the welcome writes that step and draws no bar
    And the first run log names the day in the middle of its header and draws no bar
    And the question that keeps an answer carries the promise about her privacy
    And each screen draws every part its own drawing names, in the order the drawing places them

  Scenario: SCREEN-2, the Today screens match the redesign prototype
    Given her phone holds the period she is in and the answers of her first run
    When she opens Emi and reads the screen she opens in each of its states
    Then each state carries the wash across the top of the glass
    And the ring stands above the card that names the phase she is in
    And the three round actions stand under that card, all three white on a day outside her period
    And what she logged today stands under them, in a card with the mark that says Emi kept it
    And a section her days cannot fill yet is one card with one sentence, and it draws no chart
    And the lock she comes back through carries the wordmark, the disc and the one button
    And each state draws every part its own drawing names in its order, but the parts it records as differences

  Scenario: SCREEN-2, the Period button is on only on a day of her period
    Given her phone holds the period she is in and the answers of her first run
    When she opens Emi on a day of her period
    Then the Period button is filled with the accent, and a reader hears that it is on
    When she opens Emi again on a day of her luteal phase
    Then the Period button is white with the drop in the accent, as the Sex button is
    And a reader does not hear that the Period button is on
    And the drop is readable on the ground of each day

  Scenario: SCREEN-4, the Log and calendar screens match the redesign prototype
    Given her phone holds the period she is in, the month behind it and the answers of her first run
    When she opens the log, a day she lived, a day Emi refuses, her month and her whole period
    Then each of those screens carries the wash across the top of the glass
    And the log stands her flow in one card and her symptoms in a second one under it
    And the line that says where the day is kept sits under her symptoms, and Done is a word at the top
    And the way off a day Emi refuses is the quieter capsule, not a word among words
    And the way to her whole period sits under the day she pressed, as a link in the accent
    And her whole period tags the days she added and the day she took off, in her own language
    And each screen draws every part its own drawing names, in the order the drawing places them

  Scenario: SCREEN-2, the Insights screens match the redesign prototype
    Given her phone holds six cycles she bled through and the two symptoms that came back
    When she reads her cycles back: Insights, her three numbers, where the figures come from, her cycles as strips, her trend and what comes back
    Then each of those screens carries the wash across the top of the glass
    And each of her three numbers says where it sits against the published figure, in her own words
    And a figure of hers that runs past what the paper reports reads wider, and no pill names her
    And her strips, her trend and every card of what comes back stand on the card ground
    And every card of what comes back carries its own round drawing
    And Insights offers the way back as the quieter capsule, under the rows she came to read
    And each screen draws every part its own drawing names, in the order the drawing places them

  Scenario: SCREEN-2, the Privacy screens match the redesign prototype
    Given her phone holds the eight answers she gave and the three days she bled
    When she opens Privacy from the dock and walks it: her answers, her cycle length, the two files and delete everything
    Then each of those screens carries the wash across the top of the glass
    And Privacy tells her above the rows that only she can read her days
    And every row of Privacy stands on one card, with its own drawing and the mark that points on
    And her eight answers stand on one card, each one reading back the answer she gave
    And each of the two files she can take away is drawn as a tile of its own
    And the lock sits beside the line that says nothing is sent anywhere
    And delete everything names the four things that go, each one with its own mark
    And each screen draws every part its own drawing names, in the order the drawing places them

  Scenario: SCREEN-2, the home screen says hello to her by name
    Given she gave the name Ada at her first run, and her phone holds the one period she logged
    When she opens Emi
    Then the top of the screen says hello to her by the name she gave
    And the forecast that cannot say how sure it is tells her it is still getting to know her
    And it asks for the cycles it still wants as we, and names the length she told them about
    And a woman who gave no name reads hello on its own, with no gap where a name would be
    And every word this screen says is in all three languages, and each one talks to her as you
    And the only two that name Emi are the fertile window denial and the line about sample data

  Scenario: SCREEN-4, she logs bleeding that is not her period in plain words
    Given she is in the middle of her month, with six cycles behind her
    When she opens the log and says the bleeding was light
    Then the line beside the flow asks her about bleeding that is not her period
    And marking it tells her the day is in her record, and that no cycle starts from it
    And her phone holds that day with the mark on it, and counts the cycles it counted before
    And the log and the period editor say all of this in each of the three languages, as you
    And none of those words gives her advice or raises an alarm, and only the lines about what Emi holds name Emi

  Scenario: SCREEN-2, delete everything tells her it is gone in plain words
    Given she has six cycles of her own on this phone
    When she opens Privacy and reads the row that would delete everything
    And she walks to the screen behind that row and reads what one press costs
    And she presses delete everything
    Then she reads that it is gone, and that she can start fresh whenever she likes
    And her phone holds none of her days and nothing in the keychain
    And these screens say all of this in each of the three languages, as you and as we
    And the only line that names Emi is the lock itself

  Scenario: SCREEN-2, she downloads her data from the delete screen before she deletes it
    Given she has six cycles of her own on this phone
    When she opens Privacy and walks to the screen that would delete her data
    Then the screen names no account and no server, in each of the three languages
    And she presses Download data first
    Then Export opens, and every day she logged is still on her phone

  Scenario: SCREEN-2, she reads who can see her records from Privacy and comes back
    Given she has six cycles of her own on this phone
    When she opens Privacy and presses Who can see my records?
    Then she reads where her records are kept, who can read them and what happens when she sends a file
    And she reads one example of why it matters
    And she presses the way back and is on Privacy again

  Scenario: SCREEN-2, she opens the page of her phase from Today and records her diary there
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    And she presses the phase card under the ring
    Then she is reading the page of the phase she is in, with its days in her cycle
    When she presses Cramps, Hungry and Calm in the diary of today
    And she writes a note about today and leaves the box
    Then her phone holds those three answers and the note on today, sealed, beside the flow she logged
    And the three chips she pressed are filled
    When she presses What this phase can mean for you
    Then a sheet gives her Mood, Food, Body and Training for that phase, and no designer note
    When she presses Close
    Then the sheet is gone and she is on the page of her phase

  Scenario: SCREEN-2, she records sex on a past day and removes it
    Given her phone holds four recorded period days, the last of them today
    When she opens the Sex page of yesterday
    Then the page asks whether she had sex yesterday, under the date of that day
    When she presses Protected, High and Yes, and saves
    Then her phone holds those three answers on that day, sealed, beside the flow she logged
    And a sheet suggests a menstrual disc or a sponge for the third day of her period
    When she closes the sheet with Not now
    And she opens the Sex page of that day again
    Then the three answers she saved are filled
    When she presses each of them again, and saves
    Then that day holds no answer about sex, and keeps its flow

  Scenario: SCREEN-2, she chooses yesterday on the Sex page of today and records sex there
    Given her phone holds four recorded period days, the last of them today
    When she opens the Sex page of today and presses Choose another day
    Then a month opens under the date, and a day ahead of her takes no press
    When she presses yesterday in that month
    Then the page asks whether she had sex yesterday, under the date of that day
    When she presses Unprotected and saves
    Then her phone holds that answer on yesterday, sealed, and today holds no answer about sex

  Scenario: SCREEN-4, she records sex on a day she already lived from the calendar, and removes it
    Given her phone holds four recorded period days, the last of them today
    When she opens the calendar and presses the day before yesterday
    And she presses Record sex on the card of that day
    Then the page asks whether she had sex that day, under the date of that day
    When she presses Protected and saves
    Then the sheet of products for sex on a period day opens
    When she presses Not now on the sheet
    Then her phone holds that answer on that day, sealed, beside the flow she logged
    When she presses that day again, then Record sex, then Protected again, and saves
    Then that day holds no answer about sex, and keeps its flow

  Scenario: SCREEN-2, she records discharge and a product on a day
    Given her phone holds four recorded period days, the last of them today
    When she opens the Period page of today
    Then the page shows the flow she logged today, under the date of today
    When she presses Egg white, Tampon and Liner, and saves
    Then her phone holds that discharge and both products on today, sealed, beside the flow she logged
    When she opens the Period page of today again
    Then the discharge and the two products she saved are filled

  Scenario: SCREEN-4, she adds a symptom to a day she already lived and opens its Sex and Period pages
    Given her phone holds four recorded period days, the last of them today
    When she opens the day before yesterday
    Then the screen names that date, and asks about her flow with no word for today
    When she presses the Digestion tile, marks Bloating and presses Save
    Then that day holds Bloating, sealed, beside the flow she logged, and today holds no symptom
    And the day shows Bloating as a symptom she can take off
    When she presses Sex on that day
    Then she is on the Sex page of that day
    When she goes back to that day and presses Period
    Then she is on the Period page of that day

  Scenario: SCREEN-2, she answers the signs of ovulation popup on a day inside her fertile window
    Given her phone holds three periods a cycle apart, and today is inside her forecast fertile window
    When she opens Today
    Then a sheet over Today asks whether she noticed any signs of ovulation, under the dates of her fertile window
    And Nothing yet is the first choice on the sheet
    And Save waits until she picks a sign
    When she presses Egg white discharge and Higher sex drive, and saves
    Then her phone holds those two signs on today, sealed, with the popup marked answered
    And the sheet is gone and she is on Today
    When she opens Today again the same day
    Then the sheet does not show again

  Scenario: SCREEN-4, she adds her past periods from the sheet over a month Emi cannot forecast
    Given her phone holds one period and the cycle length she gave
    When she opens the month after next
    Then a sheet asks her to add her last three periods, with Add past periods and Not now
    When she presses Not now
    Then the sheet is gone, and it does not come back over that month today
    When she opens the month after that, and the sheet asks again, and she presses Add past periods
    Then she reads the list of her last three periods, with the one her phone holds given
    When she gives the two periods before it and saves
    Then the month she was reading draws a forecast, and the sheet is gone
