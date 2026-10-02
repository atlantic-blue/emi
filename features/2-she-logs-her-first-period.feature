Feature: She opens Emi and logs her first period

  She arrives knowing nothing about Emi and Emi knows nothing about her. A few questions and one
  hold later her last period is recorded and the ring is drawn from her own days.

  Every scenario below is named for the contract it proves. The contracts are in
  docs/contracts.md and the map from feature to contract is in docs/features.md.

  Scenario: SCREEN-1, her first run ends on the home screen with her period recorded
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question of the first run
    And she presses and holds the ring
    Then she is looking at the home screen
    And her phone holds the day she said her period started
    And her phone holds the cycle length she gave

  Scenario: SCREEN-1, she answers everything, leaves before the hold, and nothing is written
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question of the first run
    And she closes Emi at the hold, without holding the ring
    Then her phone holds no day, no answers and no marker
    And opening Emi again asks her the same questions

  Scenario: SCREEN-1, she presses Done twice and her first run is written once
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question, and presses Done a second time before the screen goes
    And she presses and holds the ring
    Then she is looking at the home screen
    And her phone holds one day, the day she said her period started
    And her phone holds the time of the hold, and one instant on all three of her answers

  Scenario: SCREEN-1, the first run asks its questions and the hold after them
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question of the first run
    And she presses and holds the ring
    Then she was asked what Emi is, her name, the year she was born, when her last period started, when the period before that started, how long her cycle runs, how long her period lasts, how steady her cycle is, how she feels about it, and what she wants Emi to help with, and what changes with her cycle, and what she feels today
    And there was no further question to answer

  Scenario: SCREEN-1, the first run asks for no account, no email address and no password
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question of the first run
    And she presses and holds the ring
    Then the only thing she could type into was her name

  Scenario: SCREEN-1, she says she does not remember when her last period started and the first run moves on
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she reaches the question about when her last period started
    And she says she does not remember
    Then she is being asked how long her cycle runs
    And the question she could not answer is behind her

  Scenario: SCREEN-1, the way past the last period question passes the period before with it
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she gives her name and the year she was born, and reaches the question about her last period
    And she says she does not remember
    Then she is being asked how long her cycle runs
    And the counter reads step 6 of 12, the twelve steps the first run always had
    When she answers the rest of the questions and presses and holds the ring
    Then she was never asked when the period before that started
    And she is looking at the screen that says the ring needs a period
    And her phone holds the name, the year and the length she gave, and no day at all

  Scenario: SCREEN-1, the first run with no date ends on a forecast that says it is still learning
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she reaches the question about when her last period started
    And she says she does not remember
    And she answers the rest of the questions
    Then she is reading her first forecast, and Emi says it has no date to count from
    And a line says the first period she logs starts everything
    And a line names the cycle length she gave, and no length Emi picked
    And the card says Emi is still learning, and how many complete cycles it needs
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
    Given her phone holds six cycles of twenty one days
    When she opens Emi
    Then a phase of no days is not drawn at all
    And the arcs and the gaps between them come to a whole turn

  Scenario: BRAND-3, the bead sits on the day she is on and never outside her cycle
    Given her phone holds six cycles of forty five days
    When she opens Emi
    Then the bead sits on the day the ring says she is on
    And the bead moves further round the ring on a later day

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
    And she skips the tour Emi opens with
    Then every control on each screen of the first run is at least 44 points on both axes, apart from a day square of the month

  Scenario: SEE-3, a square of the calendar keeps its height and takes its width from the month
    Given she has never opened Emi before
    When she opens Emi
    And she reaches the question about her last period
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

  Scenario: SCREEN-2, the screen she opens names Emi and greets her by the name she gave
    Given her phone holds cycles of her own, and she gave the name Ada
    When she opens Emi
    Then the header is the first thing on the screen she opens
    And it carries the mark, then the word Emi, then the greeting
    And the greeting reads Hello, Ada
    And the drawing of this screen puts that header first, and the screen answers for it
    And a woman who gave no name reads the mark and the word, and no greeting at all

  Scenario: SCREEN-2, she reads the cycle day of every day of her week without pressing anything
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then she reads her whole week, seven days, without pressing anything
    And above every date is the day of her cycle that date falls on
    And every one of those is the day the ring says for that date
    And the three days behind today are filled, because she bled on them
    And today is ringed
    And tomorrow is a dotted outline, because her period is expected to run into it
    And the two days after that are plain

  Scenario: SCREEN-2, she reads her phase and her cycle day as words from across the room
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then under her week she reads the day of her cycle, in type large enough to read across a room
    And the phase she is in is written beside it, in words
    And the day of her cycle is drawn far larger than the phase beside it
    And the words period, bleeding, fertile and ovulation are still drawn at 14 points or less
    And the phase is written in the ink of that phase, and never on the colour of it
    And the same screen three weeks later reads her luteal phase the same way

  Scenario: SCREEN-2, she starts a log from the screen she opens in one press
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    Then under the ring she reads two round actions, in the order the drawing places them
    And each of them is at least 44 points on both axes
    And there is no Log today button, and no link to the history, the export or the settings
    And pressing the first one puts her on the log, at the flow picker
    And the dock still reaches the history and the privacy screen

  Scenario: SCREEN-2, the symptoms action opens the log on the groups and the dock still opens on the flows
    Given her phone holds four recorded period days, the last of them today
    When she opens Emi
    And she presses the symptoms action under the ring
    Then she is on the log, and the first thing she can mark there is a symptom
    And she passed no flow option on the way to it
    And every one of her symptom groups is offered
    And she can still pick a flow on the same screen
    And the drawing of that screen places a symptom group, and places no flow picker
    And pressing the Log column of the dock opens the log on the flow options
    And that is the drawing of the log, which places the flow options before the groups

  Scenario: SCREEN-2, she records a symptom and the screen she started on shows it
    Given her phone holds the period days behind today, and nothing at all for today
    When she opens Emi
    Then nothing on the screen reads back a log for today, and there is no empty row either
    And that is the drawing of the screen she opens, which places no such row
    When she presses the symptoms action under the ring
    And she marks the two symptoms the drawing names
    And she saves
    Then she is back on the screen she started on
    And under the day of her cycle she reads that she logged today
    And the line under it names both symptoms she marked, and no symptom she did not
    And that is the drawing of the screen she comes back to, down to the ring
    And pressing what she logged opens the log on the symptom groups again

  Scenario: SCREEN-4, she opens a month and reads the cycle day of every day in it
    Given her phone holds three recorded cycles
    When she opens the month
    Then she is reading the month the drawing names, in seven columns
    And above every date is the day of her cycle that date falls on
    And every one of those is the day the ring says for that date
    And the days she bled are filled
    And the day her next period is expected on is a dotted outline
    And today is ringed
    And every square is as high as a thumb needs, and takes its width from the month

  Scenario: SCREEN-4, she reaches a month from the screen she opens by pressing her week
    Given her phone holds three recorded cycles
    When she opens Emi
    Then every day of the week she is reading is at least 44 points on both axes
    And the seven of them fit across the narrowest phone Emi is built for
    And the dock still holds the four columns it held, and nothing else
    When she presses a day of that week
    Then she is reading the month that day falls in
    And that is the month the drawing names, with the parts the drawing places in its order
    When she presses the way back
    Then she is on the screen she opened, reading her week again
    And pressing a different day of the same week reaches the same month

  Scenario: SCREEN-4, she presses a day in the month and reads what she wrote that day
    Given her phone holds three recorded cycles, and a symptom she marked on one day
    When she opens the month
    Then nothing at the foot of it names a day, because she has pressed none
    When she presses the day the drawing names
    Then a sheet at the foot names that date in words
    And it names the day of her cycle that date falls on, and the phase she was in
    And it names the symptom she marked that day
    And that is the month the drawing names, down to the sheet
    When she presses the sheet
    Then she is looking at that day, and at no other
    When she says her period came that day
    And she presses the way back
    Then she is reading the month again, and the sheet names the flow she just picked
    And the day of her cycle over that date is the day the ring now says
    And pressing another day of the month names that day instead

  Scenario: SCREEN-4, a day that has not happened yet is refused in the month and at its address
    Given her phone holds three recorded cycles
    When she opens the month
    And she presses the square two days ahead of today
    Then she is still reading the month, and nothing at the foot of it names that day
    And that square is faint, and somebody listening is told it takes no press
    And a day she already lived still takes a press and names itself at the foot
    When she opens that same day ahead of her by its address
    Then she is told the day has not happened yet
    And that is the drawing of the day Emi refuses
    And there is nothing on that screen to pick a flow with
    When she presses the way back
    Then her phone holds nothing on that day

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
    And she presses the sheet at the foot
    Then she is looking at that day, two months behind today
    When she presses the way back
    Then she is reading that same month again, and not the month she opened
    When she presses the way to a later month twice
    Then she is reading the month she opened, with today ringed on it
    And both ways to another month are at least 44 points on both axes

  Scenario: SCREEN-4, she corrects a whole period in one save and the ring redraws
    Given her phone holds a period of four days, and two complete cycles behind it
    When she opens Emi
    And she presses a day of the week she is reading
    Then she is reading the month that day falls in
    When she presses the way to edit her period
    Then she is looking at the period picker, and that is the drawing of it
    And the four days Emi holds arrive as hers, and no other day of that month does
    And somebody listening is told each day is one she can turn on and off
    And a day she has not lived yet takes no press here either
    When she presses the two days her period ran on after that
    And she presses the day her period did not start on
    Then the line under the month names the two days she added and the day she took off
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
    And she skips the tour Emi opens with
    And she answers every question of the first run, and says she does not remember her last period
    And she presses and holds the ring
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
    And every fertile day the ring counts is tinted
    And the one day the forecast names as the estimated ovulation is filled
    And a legend above the grid names her period and her fertile days
    When she presses the day the drawing names
    Then a panel at the foot names that day, over the way to her whole period
    And pressing that panel opens the day it names

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

  Scenario: SCREEN-2, the ring and the week strip take the redesign look
    Given her phone holds six cycles of her own
    When she opens Emi and reads the ring and the week above it
    Then the middle of the ring names her phase, then the day she is on, then the length of her cycle
    And every arc ends in a round end, and ground still shows at every boundary between two phases
    And the bead on today is a white disc with a dark line around it
    And the days she bled are filled discs, and the day her period is expected on is a dashed outline
    And the column she is on is named TODAY in place of its weekday letter

  Scenario: SCREEN-1, the tour tells her the ring is her cycle
    Given she has never opened Emi before
    When she opens Emi
    Then the first thing she reads says the ring is her cycle, the dot is today, and what the number inside it means
    And the card speaks to her as you, and names Emi nowhere
    And the four cards say what we do for her, in each of the three languages she can read them in
    And the card that names a forecast still denies the two claims, and no card says a word a screen refuses
