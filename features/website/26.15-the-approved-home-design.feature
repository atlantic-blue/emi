Feature: The design the home page is held to

  The operator draws Emi on a design canvas. A session cannot open that canvas. So every step that
  builds the home page builds it from a brief somebody typed out, and the page drifts from the
  drawing a little at a time. Nobody can prove the drift, because the two things are never in the
  same place.

  This is the place. The board the operator approved, the markup it renders to, and a picture of
  that markup at the width of a desktop and at the width of a phone, all committed where a session
  reads them. The later steps then build the page from the design itself, and a test holds the page
  to the picture.

  A design is only worth that if it is finished. A hole the renderer left behind draws as the five
  characters of its own name. A face the markup asks for and the directory does not hold sends a
  browser to another face, and the page then measures differently on the next machine that opens
  it. Either way the comparison with the page proves nothing, so both are refused here.

  Scenario: the approved home design is in the repository
    Given the operator approved the home board on the design canvas
    Then a session that cannot open the canvas reads the same design in the repository
    And the render carries no hole, so every machine draws the same page from it
    And every face and every picture the render asks for sits beside it
    And the reference pictures show that page at the width of a desktop and of a phone
    And a reader of the directory is told that the canvas is where the design changes
