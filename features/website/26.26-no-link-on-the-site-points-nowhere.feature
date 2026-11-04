Feature: Every press on the home page takes her somewhere

  A woman reads the home page and makes up her mind. She wants the community, or the free
  calculator, or the application itself. Then she presses.

  A press that points at the page she is already reading does nothing she can see. Her browser
  moves her to the top of the words she just read. Nobody tells her that the page behind that press
  is unfinished, so she reads broken software, at the moment she decides whether to trust Emi with
  her cycle. Then she closes the page and does not come back.

  So each press inside the page moves her somewhere, or it says plainly that the thing behind it is
  not ready. The community is ready. It reads and writes on Telegram, and the one address of it is
  https://t.me/+89GgSCh6Ff85YTZk. Every press that names the Emi Community carries that address, in
  the page and in the band at the foot of it. It opens in the tab she is already in, because a page
  that opens a second window takes the way back off her screen.

  Apple issued no address for the application yet. So the two presses to the store are the holes,
  and there are two of them. A third press that leads nowhere fails this scenario, and so does a
  hole anywhere other than the store. Both holes go on the day the address arrives.

  Scenario: no link on the site points nowhere
    Given a woman opens the home page in each of the three languages
    Then each press inside the page moves her somewhere
    And the only presses that lead nowhere are the two to the store, which Apple has not opened yet
    And the press that offers her the community opens the community, in the tab she is reading in
    And a browser reads the same page the same way
