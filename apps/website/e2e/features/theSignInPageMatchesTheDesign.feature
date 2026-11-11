Feature: The sign in page is laid out the way it was approved

  A woman has paid for Emi outside the App Store, or she wants to stop paying. This is the page
  she gets an account on, and it is the first page of myemi.app that asks her for anything. A page
  that looks unfinished at that moment reads as software she should not hand an address to.

  That layout was drawn and approved on a canvas, and the three boards are committed beside this
  suite. The pages are built from them by hand, in another language, through another framework.
  Nothing about that process keeps the two the same. A heading can fall back to another face and
  measure wider, a field can keep a padding the board never had, a tint can land a shade off, and
  every word is still there, so every test that reads words still passes.

  The board offers four ways in and all four are drawn, each in the colours its own company fixes,
  and each press is held against the board here. The comparison still reads each part in its own
  document, because the board draws the two states of the sign in as two screens and the page is
  one page that changes, so the same part sits at a different height in each. The account board
  draws four sections under its head, and each one is a step of its own, so only the head is read.

  This scenario answers the service itself with the shapes the service documents, and presses
  through to the box for the code on an answer the suite wrote, because a run against the live
  pool would make a user and write to whoever owns the address.

  Each part is measured in each document and then held against the other, in one browser, at the
  width of a desktop, of a tablet, and of the phone most of the reading happens on. On a failure it
  writes the picture of the difference, so the answer names the place rather than only the amount.
  What the words say is read in features/website, where a reader can be held to all three languages
  at once.

  Scenario: the page she signs in on is the approved design
    Given a woman opens the page she signs in on beside the design the operator approved
    Then each part of the sign in page she reads is as tall as the same part of the design
    And each part of the sign in page is the design, to within one pixel in a thousand

  Scenario: the box for the code is the approved design
    Given a woman presses Send code beside the design the operator approved
    Then each part of the sign in page she reads is as tall as the same part of the design
    And each part of the sign in page is the design, to within one pixel in a thousand

  Scenario: the head of her account is the approved design
    Given a woman opens her account beside the design the operator approved
    Then each part of the sign in page she reads is as tall as the same part of the design
    And each part of the sign in page is the design, to within one pixel in a thousand
