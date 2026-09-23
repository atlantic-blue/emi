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
    Then she was asked what Emi is, her name, the year she was born, when her last period started, when the period before that started, how long her cycle runs, how long her period lasts, and how steady her cycle is
    And there was no further question to answer

  Scenario: SCREEN-1, the first run asks for no account, no email address and no password
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    And she answers every question of the first run
    And she presses and holds the ring
    Then the only thing she could type into was her name

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

  Scenario: SEE-3, every control of the first run is at least 44 points on both axes
    Given she has never opened Emi before
    When she opens Emi
    And she skips the tour Emi opens with
    Then every control on each screen of the first run is at least 44 points on both axes

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
