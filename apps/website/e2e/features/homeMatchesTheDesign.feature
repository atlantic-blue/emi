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

  Scenario: the home page matches the approved design pixel for pixel
    Given a woman opens the home page beside the design the operator approved
    Then the page she reads is as tall as the design, so no section is missing and none was added
    And what she is looking at is the design, to within one pixel in a thousand
