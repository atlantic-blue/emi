Feature: Where a press on a page of the site takes her

  A woman reads a page of myemi.app and makes up her mind. She wants the community, or the code she
  was told she could read, or the application itself. Then she presses.

  A press to a page nobody has built answers 404 with the Emi page. A press to the page she is
  already reading moves her to the top of the words she just read. Neither one says what happened,
  so she reads broken software, at the moment she decides whether to trust Emi with her cycle. Then
  she closes the page and does not come back.

  The markup of a page says where each press points. It does not say what the site answers, and it
  does not say which presses a reader can reach. A press the page draws off the side of a phone, or
  behind another element, is a press she never meets. So a real browser opens every page of the
  site at three widths, reads only the presses she can see, and asks the site for each address it
  carries. The status is what the rule is about: 200, and nothing else.

  Three addresses are off this site: the Emi Community on Telegram, the code on GitHub, and the beta
  Apple runs. Two more are the inboxes a privacy question and a support question go to, which her
  mail application answers. Those five are named here, and they are not asked for: this site asks
  no other company for anything, and a press she has not made yet asks nobody for anything.

  A press to a page that is still to be built is not drawn at all, so no press leads to the page she
  is already reading. The press that offers her the community is read whole: it opens in the tab she
  is already in, because a page that opens a second window takes the way back off her screen.

  Scenario Outline: every press on the page takes her somewhere
    Given a woman opens the page at "<address>"
    When she reads every press the page offers her
    Then no press takes her to a page that is still to be built
    And each press she can see answers 200, or leaves the site for an address this site names

    Examples:
      | address             |
      | /en/                |
      | /ru/                |
      | /es/                |
      | /en/privacy/        |
      | /ru/privacy/        |
      | /es/privacy/        |
      | /en/privacy-policy/ |
      | /ru/privacy-policy/ |
      | /es/privacy-policy/ |
      | /en/support/        |
      | /ru/support/        |
      | /es/support/        |

  Scenario Outline: the press that offers her the community opens the community
    Given a woman opens the page at "<address>"
    When she reads every press the page offers her
    Then the press that offers her the community opens Telegram in the tab she is reading in

    Examples:
      | address |
      | /en/    |
      | /ru/    |
      | /es/    |
