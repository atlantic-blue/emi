Feature: Every address of Emi ends in a slash

  Every address this site hands out ends in a slash. The function at the edge sends the bare root
  to `/en/`, the language switcher points at `/ru/` and `/es/`, and those are the addresses that go
  into a store listing and into a privacy notice a reviewer reads.

  A framework that drops the slash turns each of them into a redirect, so the address a woman
  follows is never the address that answers her. She pays for it in a second request, a search
  engine keeps two addresses for one page, and the first answer she gets from Emi is a 308 rather
  than a page.

  So the slash is the form the site keeps, and the form without it is the one that moves.

  Scenario: the address she is given answers her, rather than moving her
    When she asks for "/en/", and follows nothing
    Then the site answers her rather than moving her

  Scenario: the same address without the slash moves to the one with it
    When she asks for "/en", and follows nothing
    Then the site moves her, permanently, to "/en/"
