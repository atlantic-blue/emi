Feature: The privacy policy is laid out the way it was approved

  A woman decides whether to pay 29.99 pounds a year for a tracker that promises nobody else can
  read her days. This is the page she reads to decide whether she believes it, and it is the page a
  reviewer at the App Store opens before the listing goes on sale. The store asks for the address
  before it will take the application at all.

  So it is a page of claims, and a claim is read in the way it is laid out as much as in the words.
  That layout was drawn and approved on a canvas, and the drawing is committed beside this suite.
  The page the site serves is built from it by hand, in another language, through another framework.
  Nothing about that process keeps the two the same. A heading can fall back to another face and
  measure wider, a band can reflow one column early, a tint can land a shade off, and every word is
  still there, so every test that reads words still passes.

  The words are no longer the board's. The board was drawn when Emi had no account, took no payment
  and sent nothing anywhere, so its three cards say "No account needed" and "No tracking" and its
  eight sections answer "What we collect" with "Nothing". Version 1 adds an optional account, the
  payments that need it, and anonymous usage she can switch on, so the page now carries fifteen
  sections and says other things in its three cards. Nobody has redrawn the board.

  The two bands the whole site shares are out as well, and for a newer reason. Each of them drew
  presses to pages nobody has built yet, so the site holds those presses back and the board still
  draws them.

  So this scenario reads the one part the board still describes: the title with the line under it.
  It is measured in each document and then held against the other, in one browser, at the width of a
  desktop, of a tablet, and of the phone most of the reading happens on. On a failure it writes the
  picture of the difference, so the answer names the place rather than only the amount. What the
  words say is read in features/website, where a reader can be held to all three languages at once.

  Scenario: the title of the privacy policy is the approved design
    Given a woman opens the privacy policy beside the design the operator approved
    Then the title of the policy is as tall as the title of the design
    And the title is the design, to within one pixel in a thousand
