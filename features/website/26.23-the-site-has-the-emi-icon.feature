Feature: The square that says this page is Emi

  A woman reads about Emi on myemi.app, decides she is interested, and leaves the tab open while
  she gets on with her day. Hours later she comes back to a window of eleven tabs. She looks for
  the one she left, and there is nothing to look for: the site serves no square, so her browser
  draws a blank sheet or the first letter of the address.

  That square is the only name a site has in a tab, and the only name it has on a home screen. Emi
  owns one already. Her phone shows it: a white ring with a gap in it, on the deep red ground, and
  that is the mark she looks for once she holds the application.

  So the site shows her the same square, at every size a browser asks for. A browser does not ask
  for one size. It asks for the size it is about to draw in, from sixteen pixels in a tab to five
  hundred and twelve on the screen an Android phone draws while a page opens, and an iPhone asks
  for one hundred and eighty under a name of its own. Each one is drawn from the one approved
  drawing at that size. None of them is a bigger picture scaled down, because the gap in the ring
  closes when a picture is scaled, and a closed ring is another product's mark.

  Three things have to hold together, and any one of them missing is a hole she sees. The file has
  to sit in the folder the site serves. The document has to name it, because a browser reads the
  sizes off the page it has just opened. And the edge has to answer for that address, because a
  file no cache behaviour names falls through to the function that draws pages, and that function
  draws pages and serves no file.

  Scenario: the site has the Emi icon
    Given the one drawing Emi is known by, the square her phone already shows her
    Then the site keeps that square at every size a browser asks for
    And each square is drawn from that one drawing at its own size
    And the document the site draws names each square to her browser
    And the square an iPhone saves to her home screen is offered to it by name
    And the edge answers for each of those addresses, so the file reaches her
    And a browser opens the page, reads each square off it, and asks for every one
