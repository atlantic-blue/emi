Feature: The website answers an address it does not have

  A woman follows a link somebody posted two years ago, or types myemi.app with one letter wrong.
  The site has no page at that address. What answers her decides whether she thinks Emi is broken
  or whether she gets where she was going: a storage bucket refuses the request in its own words,
  which carry no Emi name, no sentence she understands and nowhere to go.

  So the first page the site has is the one she reaches by accident. It tells her what happened in
  plain words and offers her the way back. It is Emi's own page, served by Emi.

  Scenario: the website renders a not found page with Next.js
    Given a woman opens an address myemi.app does not have
    When the site answers her
    Then she reads that the page does not exist
    And she is offered the way back to the Emi home page
    And the page she reads is Emi's own, in a language the browser was told
