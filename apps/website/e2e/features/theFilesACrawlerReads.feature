Feature: The files a crawler reads before it reads a page

  A woman wants a period tracker that cannot read her data. She does not know Emi exists, so she
  types what she wants into a search engine. Everything the site says about trust is behind that
  search, and she never gets there if the search engine never read the page.

  A crawler asks a site two questions before it reads a single page. What may I read, and which
  addresses do you have. The first answer is `/robots.txt` and the second is `/sitemap.xml`. The
  site has neither file, and both addresses answer 403, so a crawler is refused twice and then
  guesses.

  Guessing costs her the page twice over. A crawler that was told nothing crawls what it stumbles
  on, so a page nothing links to is a page nobody finds. And the site serves one page at three
  addresses, one for each language. Nothing says the three are one page, so they compete with each
  other, and a Russian reader can be handed the English one.

  So the site answers both questions. Every path is open to every crawler, because the site holds
  nothing a reader may not read. The list names each page the site really serves, in all three
  languages, and each entry says which other addresses are the same page. An address the site
  answers 404 for is not on the list: a list that promises a page the site does not have is a list
  a crawler stops believing.

  Scenario: a crawler finds every page of the site
    Given a crawler arrives at the site and asks what it may read
    Then it is allowed every path, and told where the list of pages is
    And the list is there, and it is markup a crawler can read
    And every page on the list answers her
    And each page on the list is offered in all three languages, and in English to a reader of none
