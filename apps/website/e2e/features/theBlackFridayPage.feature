Feature: The page she buys Emi at half price on

  A woman is handed one address for Black Friday. Nothing on the site points at it: she got it from
  somebody, or from a post, and she opens it to find out what the offer is.

  So the page says three things before anything else. What a year costs with the offer, what it
  costs without it, and the day the offer closes. A page that says half price and leaves her to
  work out half of what is a page she reads twice and then closes.

  The press is the whole of the page. She presses once and lands on the till with the offer in the
  address, because the till charges what the address asks for and a press that dropped it would
  charge her the figure she did not read.

  The offer closes at midnight on 1 December 2026, central European time. After that the address
  still answers, and it answers with the home page: a reader who saved the press, or opened a link
  somebody sent her in the night, is handed what Emi costs today rather than an offer nobody sells.
  The page is drawn on each request, so the clock it reads is the clock of the moment she asks.

  Scenario Outline: she reads what the offer is, in the language she reads
    Given a woman opens the page of the offer in <language>
    Then the site answers her with a page
    And she reads what the offer costs and the day it ends, or the home page once the offer is over, in <language>
    And every press that buys carries the offer to the till, or there is none once the offer is over

    Examples:
      | language |
      | English  |
      | Russian  |
      | Spanish  |
