Feature: The page she reaches by accident

  A woman mistypes an address, or she follows a link from somewhere old. She lands on a page
  myemi.app does not have. She is already lost, so this page has one job: say plainly that the
  page is not there, and give her one press back to Emi.

  The words alone are not enough. A site can answer the right words with the status 200, and then
  a search engine keeps the address and a store reviewer reads a page the site says it has. So the
  status is read here beside the words.

  The press back is read at the width of a phone as well as at the width of a desktop, because a
  link that sits off the side of the screen is a link she cannot reach.

  Scenario: a woman opens an address the site does not have
    Given a woman opens "/support-and-help", which this site does not have
    Then the site answers that there is no such page
    And she reads that the page does not exist
    And the press back to Emi is on the page, inside the screen she holds
