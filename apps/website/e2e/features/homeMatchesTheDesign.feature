Feature: The page she reads is the page that was approved

  A woman hears about Emi from somebody and opens myemi.app. She has never seen the product, and
  this one page is everything she has to go on before she is asked for 29.99 pounds a month.

  That page was drawn and approved on a canvas, and the drawing is committed beside this suite. The
  page the site serves is built from it by hand, in another language, through another framework.
  Nothing about that process keeps the two the same. A section can drift down the page, a tint can
  land a shade off, a rule can grow from one side of a band to four, and every word is still there,
  so every test that reads words still passes.

  What that costs is not decoration. The board is where the product decides what it says about
  itself first: that a forecast is a range of days and how sure Emi is, that the education is
  accurate and plain, that the community is a place to ask, that one person is building this and
  why, that her data is encrypted, and what it costs. A page assembled from a description of the
  board says a vaguer thing in each of those places, and nobody can point at which one moved.

  So this scenario does not read the page. It looks at it, beside the design, in one browser, and
  it answers one question: is she reading the page the operator approved. It runs at the width of a
  desktop and at the width of the phone most of the reading happens on, and on a failure it writes
  the picture of the difference, so the answer names the place rather than only the amount.

  Five bands are read, and they are the bands the board still draws. Six are left out, each one for
  the same reason: it carries a press to a page nobody has built yet, so the page holds that press
  back and the board draws it. The band at the top drew six ways into the product. The band at the
  head of the page and the band at the end each drew a press to Apple's store, and Apple has issued
  no address for the listing. The band of the two offers was a press to the calculator and a press
  to support and the sentence explaining each, so nothing of it is left. The band at the foot drew
  twelve presses. And the band the two founders sign is left out for its own older reason: the board
  drew a hole of 73 characters where one of them has since written the 46 words of her note.

  A comparison of those six would report the same difference every run, and a comparison nobody can
  read is a comparison nobody keeps. Each one comes back as its board is redrawn or its page ships.

  Scenario: the home page matches the approved design pixel for pixel
    Given a woman opens the home page beside the design the operator approved
    Then each band the board still draws is as tall as that band of the design
    And each of those bands is the design, to within one pixel in a thousand
