Feature: The addresses the deploy reads are the addresses the site serves

  The deploy reads myemi.app with a browser after it has shipped, and that read is the only check
  in this repository that reads what a woman actually gets. Everything before it reads a site
  started on a runner, which has no edge, no moves between addresses and none of the six headers.

  A check that is the only witness has to be right about the site. Every address of Emi ends in a
  slash, because the framework is configured that way, and the root at the edge sends her to a
  language. So a check that expects an address without one disagrees with the site, goes red on a
  deploy that shipped a correct site, and the next person to read a red deploy has learned that
  red means nothing.

  There are two ways to agree with the site, and only one of them is worth having. A check can
  expect the address she is moved to, or it can expect the address she asked for and never notice
  she was moved. The second one passes while the page she opened was a redirect, and that is the
  thing the deploy is meant to catch, so the move gets a sentence of its own and the page is read
  on the address she lands on.

  Scenario: the live checks expect the slash at the end of each address
    Given the sentences the deploy reads against the live site
    Then every address it expects her to land on ends in a slash
    And she still types the address without one, so the two moves are read rather than assumed
    And the page she reaches by accident is read on the address the move sends her to
    And what she reads there is still the Emi page, with her press back to it
