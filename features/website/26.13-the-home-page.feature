Feature: The page a woman meets Emi on

  Emi asks a woman to trust it with the most private record she keeps, and the first thing she
  reads is not the application. It is one page on the internet, in the language she reads.

  That page has to do four things. Say what Emi is. Say what Emi costs, in the same words the
  application will use when it asks her for the money, so the number cannot change between the
  promise and the till. Say what Emi is not, because a cycle tracker that lets a woman believe it
  is contraception has done her real harm. And ask her for nothing: no account, no cookie, and not
  one request to another company, because a request to another company tells that company she was
  reading about periods.

  The three languages are the same page. A page one language has and another does not is the error
  contract SITE-3 names, and a woman who switches to Russian and finds English has been told the
  site was not written for her.

  Scenario: the home page renders in English, Russian and Spanish
    Given a woman opens myemi.app in the language she reads
    Then she reads what Emi is and what it costs, in that language
    And she reads what Emi is not, in the two sentences Emi is held to
    And the other two languages are one press away, in the band at the top
    And an address naming a language the site does not serve tells her there is no such page
    And a browser reads all three pages, at the width of a desktop and at the width of a phone
    And no page asks another company for anything, and no page keeps anything on her machine
