Feature: The files a crawler reads before it reads a page

  A woman who wants a tracker that cannot read her data has not heard of Emi. She types what she
  wants into a search engine. Everything the site says about trust sits behind that search, and she
  never reads any of it if the search engine never read the page.

  A crawler asks two questions before it reads a page. What may I read, and which addresses do you
  have. The answers are `/robots.txt` and `/sitemap.xml`. The site has neither file today, and both
  addresses answer 403, so a crawler is refused twice and then guesses.

  Guessing costs her the page twice. A crawler crawls what it stumbles on, so a page nothing links
  to is a page nobody finds. And the site serves one page at three addresses, one for each
  language. Nothing says the three are one page, so they compete with each other, and a Russian
  reader can be handed the English one.

  So the site answers both questions. Every path is open to every crawler, because the site holds
  nothing a reader may not read. The list names each page the site really serves, in all three
  languages, and each entry says which other addresses are the same page.

  The list is written from the list of pages the site has, by one program, so it cannot promise a
  page the site answers 404 for. That matters more than it reads: a crawler handed a 404 for a
  promised address trusts the rest of the list less.

  Scenario: a crawler finds every page of the site
    Given a crawler arrives at myemi.app and asks what it may read
    Then it is allowed every path, and told where the list of pages is
    And the list is markup, and it names every page the site serves in each of the three languages
    And it promises no address the site answers 404 for
    And each entry offers the same page in the other languages, and in English to a reader of none
    And one program writes both files, so a page the site gains cannot be left out of them
    And a browser reads both files off a running site, and reads them again on the live host
