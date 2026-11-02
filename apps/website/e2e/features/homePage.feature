Feature: The page a woman meets Emi on

  A woman hears about Emi from somebody and opens myemi.app before she holds the application. She
  reads one page. It has to say what Emi is, what Emi costs, and what Emi is not, in the language
  she reads, and it has to ask her for nothing.

  So the page is read in all three languages, because a page one language has and another does not
  is the error SITE-3 names. It is read at the width of a phone as well as at the width of a
  desktop, because a press that sits off the side of a phone is a press she cannot reach.

  Two of the reads here are the promise rather than the words. The page asks no other company for
  anything, so no other company is told she opened a page about periods, and the page keeps nothing
  on her machine, so there is nothing to carry her from here to anywhere else. Neither is visible in
  the markup, which is why a browser reads them.

  Scenario Outline: she opens the home page in the language she reads
    Given a woman opens the home page in <language>
    Then the site answers with a page
    And she reads the headline and what Emi costs, in <language>
    And the press to the store and the press to the beta are both on the page, inside the screen she holds
    And the page asked no other host for anything
    And the page kept nothing on her machine

    Examples:
      | language |
      | English  |
      | Russian  |
      | Spanish  |

  Scenario: she puts the page into another language
    Given a woman opens the home page in English
    When she presses Russian in the header
    Then the page she gets is in Russian
