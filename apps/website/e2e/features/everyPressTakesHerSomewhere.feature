Feature: Where a press on the home page takes her

  A woman reads the home page and makes up her mind. She wants the community, or the free
  calculator, or the application itself. Then she presses.

  A press that points at the page she is already reading does nothing she can see. Her browser
  moves her to the top of the words she just read. Nobody tells her that the page behind that press
  is unfinished, so she reads broken software, at the moment she decides whether to trust Emi with
  her cycle. Then she closes the page and does not come back.

  The markup of the page says where each press points. It does not say which presses a reader can
  reach. A press the page draws off the side of a phone, or behind another element, is a press she
  never meets, and a press the page hides is not a promise to anybody. So a real browser opens the
  page at three widths and reads only the presses she can see.

  The community is ready. It reads and writes on Telegram. Every press that names the Emi Community
  carries the one address of it, in the page and in the band at the foot. It opens in the tab she is
  already in, because a page that opens a second window takes the way back off her screen.

  Apple issued no address for the application yet. So the two presses to the store are the holes,
  and there are two of them. A third press that leads nowhere fails this scenario, and so does a
  hole anywhere other than the store.

  Scenario Outline: every press on the page takes her somewhere
    Given a woman opens the page at "<address>"
    When she reads every press the page offers her
    Then each press she can see moves her somewhere
    And the only presses that lead nowhere are the two to the store
    And the press that offers her the community opens Telegram in the tab she is reading in

    Examples:
      | address |
      | /en/    |
      | /ru/    |
      | /es/    |
