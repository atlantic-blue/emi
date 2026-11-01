Feature: The site draws in the colours and the letters Emi draws in

  A woman reads myemi.app before she installs anything. A reviewer at the store reads the same
  pages. Neither of them is holding the application yet, so these pages are the whole of what Emi
  is to them.

  Emi measures every colour it draws against the ground behind it, and the measurement reads one
  package. A colour typed into a page is a colour nobody measured, so she can meet words she
  cannot read on the paper they sit on. The phone keeps that rule. The site now keeps it too, and
  it keeps it where it can be seen: not as a word in the markup, but as the rule a browser obeys.

  A face is the second thing. A page that loads its letters from a font service sends her browser
  to another company, and that company learns she opened a page about periods. So the site serves
  its own letters, from the files this repository already ships to the phone.

  Scenario: the website components draw in the emi tokens
    Given a woman opens an address myemi.app does not have
    When the site draws her page
    Then she reads what happened, and the way back to the Emi home page
    And every colour she is shown is a colour the token package measured
    And the words are set in the letters this site serves, and in no face from a font service
    And the gaps, the corners and the sizes are the ones the design system names
    And nothing of the site asks another company for a thing
