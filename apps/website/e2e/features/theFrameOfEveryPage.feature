Feature: The way in and the way out of every page

  A woman arrives on a page of myemi.app. She arrives on the home page because somebody sent her
  the address, or she arrives on an address the site does not have because she mistyped it. Either
  way she needs the same two things: the band at the top, which is every way into the product, and
  the band at the foot, which says what Emi is not, who she would be paying, and how to reach
  somebody.

  Today each page writes those two bands itself. That holds while two pages remember to do it. The
  site is going to grow a calculator and a page to buy on as well, and the first one of those that
  forgets is a page where a reader has no way on and no way back.

  Two bands is as bad as none, so the count is read here and not only the presence. A band drawn
  twice is a second way in that disagrees with the first, and a reader whose software reads the
  landmarks out to her hears the page has two tops.

  The band also has to read in the language of the page it sits on. A band in English on a page a
  woman is reading in Russian sends her to the English privacy policy, which is a page she cannot
  read, from a page that told her browser it was Russian.

  Scenario Outline: every page has the header and the footer
    Given a woman opens the page at "<address>"
    Then the page gives her one band at the top and one band at the foot
    And both bands read in the language the page declares, which is "<language>"

    Examples:
      | address                | language |
      | /en/                   | en       |
      | /ru/                   | ru       |
      | /es/                   | es       |
      | /en/privacy/           | en       |
      | /ru/privacy/           | ru       |
      | /es/privacy/           | es       |
      | /en/privacy-policy/    | en       |
      | /ru/privacy-policy/    | ru       |
      | /es/privacy-policy/    | es       |
      | /en/support/           | en       |
      | /ru/support/           | ru       |
      | /es/support/           | es       |
      | /en/sign-in/           | en       |
      | /ru/sign-in/           | ru       |
      | /es/sign-in/           | es       |
      | /en/account/           | en       |
      | /ru/account/           | ru       |
      | /es/account/           | es       |
      | /en/sign-in/returning/ | en       |
      | /ru/sign-in/returning/ | ru       |
      | /es/sign-in/returning/ | es       |
      | /en/nothing/           | en       |
      | /ru/nothing/           | ru       |
      | /es/nothing/           | es       |
