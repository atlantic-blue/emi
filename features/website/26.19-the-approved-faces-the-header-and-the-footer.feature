Feature: The approved faces, the header and the footer

  A woman hears about Emi from somebody and opens myemi.app on her phone. She has never seen the
  product. The top of the page is the first thing she reads, and whatever is up there is what she
  will be asked to pay 29.99 pounds a month for.

  Today the top of the page carries a lowercase word, set in a face the approved design does not
  use. The community chose a different mark in issue 331, the letters EMI inside the open ring, and
  that is the drawing she will tap on her home screen once she installs the application. So the
  page she judges Emi by shows her one product and her phone shows her another.

  The foot of the page is the other half of the same thing. It is where she looks for what Emi is
  not, for how to reach somebody, and for who she would be paying. A page that asks for money and
  answers none of that reads as a page nobody stands behind.

  This scenario opens the top and the foot of the page the way a server draws them for her, and
  reads what she is left looking at. It reads the faces the site asks her browser to fetch, and
  where they come from, because a face fetched from another company tells that company she opened a
  page about periods. It reads the one width where the ways into the product have to fold into a
  button, because a link she cannot reach on a phone is a link she does not have.

  The band at the top holds six ways into the product and draws the two whose page exists. The band
  at the foot holds four groups of three presses and draws the three groups left with a press she
  can follow. A press whose page is still to be built is not drawn at all, because a press that
  answers 404 reads as broken software at the moment she decides whether to trust Emi.

  Scenario: the header carries the approved icon
    Given a woman opens myemi.app for the first time
    Then the mark at the top of the page is the drawing the community chose, and the same drawing her phone will show her
    And her software reads that mark out to her as Emi
    And she can follow the ways into the product whose page exists from the top of the page
    And on a phone those fold into one button she can press
    And every word she reads is set in the three faces of the approved design, served by Emi itself
    And the foot of the page says what Emi is not, in words the honesty gate reads as a denial
    And the foot of the page tells her where to get the application, how Emi protects her and how to reach somebody
    And the foot of the page names who she would be paying, and lets her read the page in her own language
    And the mark the community did not choose has gone from the site
