Feature: The square that says this page is Emi

  A woman keeps eleven tabs open. She saves myemi.app to the home screen of her phone, next to the
  application she already pays for. In both places the site is one small square, and that square is
  all she has to recognise it by: the words of the page are not on the home screen and they do not
  fit in a tab.

  The site serves no square today. So her browser draws a blank sheet, or the first letter of the
  address, and a page about trusting Emi with her cycle arrives looking like a page nobody
  finished.

  A browser does not ask for one size. It asks for the size it is about to draw, and it reads the
  sizes off the page it has just opened. A page that names a square it does not have is worse than
  a page that names none, because the browser asks, gets nothing, and falls back anyway.

  So this scenario reads the page the way the browser reads it. It takes every square the document
  names, asks for each one at its own address, and reads the answer back. The file has to be there,
  and it has to be the size the page said it was.

  Scenario: the site has the Emi icon
    Given a woman opens the page at "/en/"
    Then the page names a square for every size her browser asks for
    And each of those addresses answers her with a square of the size the page promised
    And the square her phone saves to its home screen is offered to it by name
    And the one address a browser asks for on its own answers her as well
