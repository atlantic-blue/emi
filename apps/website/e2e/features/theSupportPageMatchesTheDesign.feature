Feature: The support page is laid out the way it was approved

  A woman cannot find why her forecast moved, or she wants her money back, or she lost her phone.
  This is the page she lands on, and Apple asks for its address before it will take the
  application at all. A page that looks unfinished at that moment reads as a company that will not
  answer her either.

  That layout was drawn and approved on a canvas, and the drawing is committed beside this suite.
  The page the site serves is built from it by hand, in another language, through another
  framework. Nothing about that process keeps the two the same. A heading can fall back to another
  face and measure wider, a band can reflow one column early, a tint can land a shade off, and
  every word is still there, so every test that reads words still passes.

  Four parts of the board describe a product that does not exist yet, and
  docs/design/website/README.md names all four. The board answers the first question with "Only
  with your recovery code", and sync and restore are designed and not built. The board draws a
  card for a subscription, and the account page is not served. The board draws the line that says
  nothing matched, and the page draws that line only once a reader has typed a word no question
  carries. So the middle of the page is not the middle of the board, and a comparison of it would
  report the same difference every run. The two bands the whole site shares are out for the reason
  they are out of the other two comparisons: each drew presses to pages nobody has built yet, so
  the site holds those presses back and the board still draws them.

  So this scenario reads the one part the board still describes, which is the title. It is
  measured in each document and then held against the other, in one browser, at the width of a
  desktop, of a tablet, and of the phone most of the reading happens on. On a failure it writes
  the picture of the difference, so the answer names the place rather than only the amount. What
  the words say is read in features/website, where a reader can be held to all three languages at
  once.

  Scenario: the title of the support page is the approved design
    Given a woman opens the support page beside the design the operator approved
    Then the title of the support page she reads is as tall as the title of the design
    And the title of the support page is the design, to within one pixel in a thousand
