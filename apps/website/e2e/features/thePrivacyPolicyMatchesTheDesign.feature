Feature: The privacy policy is the page that was approved

  A woman decides whether to pay 29.99 pounds a year for a tracker that promises nobody else can
  read her days. This is the page she reads to decide whether she believes it, and it is the page a
  reviewer at the App Store opens before the listing goes on sale. The store asks for the address
  before it will take the application at all.

  So it is a page of claims, and a claim is read in the way it is laid out as much as in the words.
  The three cards at the top say what Emi does not do, side by side, because the three together are
  the offer. The eight sections under them are one column at one size, in the order the questions
  arrive in, because a section drawn smaller than the one above it is a section that was hidden. The
  date at the top is the one thing on the page that will change.

  That page was drawn and approved on a canvas, and the drawing is committed beside this suite. The
  page the site serves is built from it by hand, in another language, through another framework.
  Nothing about that process keeps the two the same. A heading can fall back to another face and
  measure wider, the row of cards can reflow one column early, a tint can land a shade off, and
  every word is still there, so every test that reads words still passes.

  So this scenario does not read the page. It looks at it, beside the design, in one browser, and
  it answers one question: is she reading the page the operator approved. It runs at the width of a
  desktop, of a tablet, and of the phone most of the reading happens on, and on a failure it writes
  the picture of the difference, so the answer names the place rather than only the amount.

  Scenario: the privacy policy matches the approved design pixel for pixel
    Given a woman opens the privacy policy beside the design the operator approved
    Then the privacy policy is as tall as the design, so no section is missing and none was added
    And what she reads before she pays is the design, to within one pixel in a thousand
