Feature: The pages of the site are drawn where the site draws them

  A woman reads myemi.app before she installs anything, and a store reviewer reads the same pages.
  Nothing on those pages is drawn on her machine. Next.js draws them on a server, so what reaches
  her browser is markup that is already finished, and the server that draws it has no window, no
  document and no phone around it.

  The behaviour tier starts a phone, because every other feature of Emi is a screen in her hand.
  A page of the site drawn inside that phone is drawn beside a browser global the real server does
  not have, so a page that reads one of those globals while it draws passes the tier and then
  fails the first woman who opens it.

  So the tier draws a page of the site the way the site draws it: in node, with nothing of the
  phone and nothing of a browser in the process. She reads the words, and the words came from the
  same place they come from in production.

  Scenario: a website scenario renders react in node
    Given a woman opens an address myemi.app does not have
    When the site draws her page where the site draws every page
    Then she reads that the page does not exist, and the way back to the Emi home page
    And no browser stood behind the page while it was drawn
    And no phone stood behind it either
