Feature: The one address of each page

  A woman who has never heard of Emi finds it through a search engine, or she does not find it at
  all. There is one page that has to earn her trust, and it is served at three addresses, one for
  each language.

  A search engine that is not told the three are one page keeps three pages, so the page competes
  with itself for the words she typed. It can also offer a Russian reader the English page, which
  reads as a site that was not written for her.

  So each page carries the two things a search engine reads. The one address of the page, whole, on
  the one host, with the language and a slash at the end. And the address of the same page in each
  of the three languages, with one more for a reader of none of them, who is offered English.

  The page behind an address the site does not have carries neither of them. An address a search
  engine keeps for a page that is not there sends the next reader to a 404.

  The addresses are built from the one host and the list of languages the site already has, so a
  fourth language carries its own links and nobody writes new code for it.

  Scenario: each page names its canonical address and its other languages
    Given a search engine reads each page of myemi.app
    Then each page names one address of its own, whole, in the language she is reading
    And each page names the same page in each of the three languages
    And a reader of none of the three languages is offered the English page
    And a fourth language would carry its own links, with no new code
    And the page behind an address the site does not have names no address at all
    And a browser reads the same links against a running site
