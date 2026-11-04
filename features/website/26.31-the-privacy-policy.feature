Feature: The privacy policy

  A woman decides whether to pay 29.99 pounds a year for a tracker that says nobody else can read
  her days. The band at the foot of every page of this site offers her "Privacy policy", and until
  now that press has taken her to a page that is not there. Apple asks for the same address before
  it will take the application at all, so the page stands between Emi and the store.

  It answers eight questions, in the order a reader asks them. Who we are. What Emi stores. What we
  collect, which is nothing. Who the records are shared with. What happens to reminders and to
  Face ID. How she deletes it all. Who it is not for. Where to write, and how she learns the policy
  changed.

  Three cards sit above the eight, each naming one thing Emi does not do: no account, no tracking,
  and the day encrypted before it is written. They are the offer, so they are side by side and the
  same size as each other.

  The date at the top is the one thing on the page nobody has written. It reads as the word the
  board draws, in brackets, because a policy that showed a date it was never given would be the
  first sentence on the page that is not true.

  The page is built by hand from the board the operator approved, in another language, through
  another framework. Nothing in that process keeps the two the same, so a browser holds the page
  against the board at three widths. What a picture cannot see is read here instead: that the words
  arrive in all three languages, that the two presses go where the board sends them, that the page
  names its own address rather than the home page, and that a crawler is told the page exists.

  Scenario: the privacy policy matches the approved design pixel for pixel
    Given a woman follows "Privacy policy" from the band at the foot of myemi.app
    Then she reads the three cards and then the eight sections, in the board's order
    And every sentence of the board is on the page, in English, in Russian and in Spanish
    And the headings are set in the face the board sets them in, which the site serves itself
    And the date at the top still reads as the word the board draws, because nobody set one
    And the press inside what Emi stores opens the page about the encryption, and the one beside the last heading writes to Emi
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing
    And a browser holds the page against the board at all three widths, and keeps the picture of any difference
