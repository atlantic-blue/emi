Feature: The website is held to the rules the phone is held to

  myemi.app is the first page a woman reads about Emi. She reads it before she installs anything,
  and a store reviewer reads the same page.

  Emi measures each colour it draws against the ground behind it. The measurement reads one
  package, and that package is `packages/tokens`. A colour typed into a page is a colour nobody
  measured, so she can meet words she cannot read on the ground they sit on.

  The phone keeps that rule from its first week. The website did not keep it. The website is a new
  workspace, and nothing read its pages as the web code they are. Three faults could reach her: a
  colour nobody measured, a page that breaks while it draws, and an image that makes her wait for
  bytes she does not need.

  The gate now reads the site the way a browser reads it. It also leaves the phone with every rule
  the phone already had.

  Scenario: eslint refuses a hex colour in the website
    Given a page for myemi.app with a colour typed into it
    When the gate reads the pages of the website
    Then the colour is refused, and the package it belongs in is named
    And a plain image element is reported, because the pages are read as web code
    And a hook inside a condition is refused
    And the screens of the phone keep every rule they had
