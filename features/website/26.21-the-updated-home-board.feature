Feature: The page she reads is the board the operator drew last

  A woman hears about Emi from somebody and opens myemi.app. She reads one page, and that page is
  everything she has before the application asks her for money.

  The board is where the product decides what it says about itself first. That a forecast is a
  range of days and how sure Emi is. That the education is accurate. That the community is a place
  to ask. Who is building this, and why. That her data is encrypted. And what other people say
  about it.

  The operator drew that board again after the page was built from the first one. The heading face
  changed. The amount came off the page, because the till is where a reader is told what a month
  costs. The band of one price became a band of reviews. The founder note became two people, one at
  a time, and the reviews move as well.

  One band of that board is not on the page. Nobody has written a review of Emi yet, so the six
  cards of the band stood on the live site as six holes in capitals inside brackets, under a rating
  and a count that were holes as well. A hole is honest on a drawing and dishonest on the page a
  stranger reads. So the band is drawn from a list of real reviews, the list is empty, and the page
  draws eight of the nine bands. Adding one entry to that list is the whole edit that brings the
  band back, which the cases beside the component carry out both ways.

  The page is built by hand, in another language, through another framework. Nothing in that
  process keeps the two the same. A band can drift down the page. A tint can land a shade off. A
  carousel can show the wrong card first. Every word is still on the page while any of that is
  true, so every test that reads words still passes.

  So this scenario does not read the page. It looks at the page beside the board, in one browser, at
  the width of a desktop, at the width of a tablet, and at the width of the phone most of the
  reading happens on. On a failure it writes the picture of the difference, so the answer names the
  place and not only the amount.

  Scenario: the home page matches the approved design pixel for pixel
    Given a woman opens the home page of myemi.app
    Then she reads seven of the nine bands of the board the operator drew last, in its order
    And the heading of every band is set in the face the board sets it in, at the weight it names
    And no band of the page names an amount, because the board took the amount off this page
    And the two people building Emi stand one at a time, with Iuliia first
    And no band of reviews stands on the page, because nobody has written one yet
    And one press holds both bands still, and a reader who asked for less motion is never moved
    And a browser holds the page against the board at all three widths, leaving out the seven bands that differ, and keeps the picture of any difference
