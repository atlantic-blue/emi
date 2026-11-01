Feature: The website builds its first page

  myemi.app serves static files. A woman who follows an old link, or who types an address with a
  letter missing, asks the site for a page that is not there. Without a page of its own she reads
  the refusal of a storage bucket, which carries no Emi name and offers her nowhere to go.

  Emi keeps the same promise on the site as in the application. A page that needs no interaction
  needs no script, so this one ships none, asks nobody else for anything, and counts nothing. It is
  the first page the site has, so it is where that rule starts.

  Scenario: the website builds a 404 page with no script
    Given a woman asks myemi.app for a page that is not there
    When the website is built
    Then a page tells her that page does not exist
    And it offers her the way back to the Emi home page
    And it carries no script, so nothing counts her visit
    And it asks nobody other than Emi for anything
