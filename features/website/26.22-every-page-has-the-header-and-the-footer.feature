Feature: The way in and the way out of every page

  A woman arrives on a page of myemi.app. On the home page, because somebody sent her the address.
  Or on an address the site does not have, because she mistyped it or followed a link from
  somewhere old. She needs the same two things on both: the band at the top, which is every way
  into the product, and the band at the foot, which says what Emi is not, who she would be paying,
  and how to reach somebody.

  Today each page writes those two bands itself, and two pages remember to do it. The site is going
  to grow a privacy page, a calculator, a support page and a page to buy on. The first one of those
  that forgets is a page where a reader has no way on and no way back, and nothing on that page
  would look broken: it would simply be a page with no Emi around it.

  So this scenario does not ask whether the two pages that exist today carry the bands. It asks
  whether a page nobody has written yet carries them. That is the only form of the promise that
  survives the next page somebody adds.

  Two bands is as bad as none. A band drawn twice is a second way in that disagrees with the first,
  and a reader whose software reads the landmarks of a page out to her hears that the page has two
  tops. So the count is read, and one is the only answer.

  The bands also have to read in the language of the page they sit on. The page she reaches by
  accident is the page where that is most likely to go wrong and least likely to be noticed: she
  gets a document that tells her browser it is Russian, and a band above it offering her the
  English privacy policy.

  Scenario: every page has the header and the footer
    Given a woman opens each home page the site serves, and an address the site does not have
    Then she gets one band at the top and one band at the foot, on every one of them
    And a page nobody has written yet gives her the same two bands
    And both bands read in the language of the page she is on, including the page she reached by accident
    And a browser counts the two bands on all three home pages and on an address the site does not have
