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

  Nine parts are the exception, and each is read on its own.

  Five of them carry a press the site no longer draws. The band at the top draws six ways into the
  product on the board and the two whose page exists on the page. The band at the foot draws twelve
  presses on the board and the four whose page exists on the page. The band at the head of the page
  and the band at the end each draw a press to Apple's store, and Apple has issued no address for
  the listing. The band of the two offers is a press to the free calculator and a press to support
  and the sentence explaining each, and neither page is built, so the page draws no rows of it at
  all.

  Two are older. The board was approved while one of the two founders had not written her note, so
  it draws a hole of 73 characters where the page now draws the 46 words she wrote, and his
  photograph stands where the board drew two letters. And the board draws a band of six reviews
  that nobody has written, so the page draws no band there at all until somebody has.

  The last two are sentences the product overtook. The board's forecast card says "High confidence"
  and names the 8th to the 14th of October 2026. The application names no confidence, and those two
  days were in the past for every reader after that month, so the card says how many cycles the
  window came from and counts a week from the day she opens the page. The board also promises twice
  that her data is always encrypted, and an export is a readable file she holds, so the promise
  under the band of the founders says that her records are encrypted on her phone. Each of those
  two is the sentence that changed and not the band around it.

  What stands above those nine, between them and below them is still held to the design, pixel for
  pixel, and the whole of the difference in height is what the nine do.

  Scenario: the home page matches the approved design pixel for pixel
    Given a woman opens the home page beside the design the operator approved
    Then the page she reads is as tall as the design, apart from the nine parts it draws differently
    And every part of the page but those nine is the design, to within one pixel in a thousand
