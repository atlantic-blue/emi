Feature: The support page

  A woman cannot work out why her forecast moved, or she lost her phone, or she wants her money
  back. The band at the top of every page of this site offers her "Support", and Apple asks for
  the same address before it will take the application at all, so this page stands between Emi and
  the store alongside the privacy policy.

  The press was held back for a while. The two bands the whole site shares draw no press whose
  page was not built, and this page was not built when that rule arrived, so "Support" went with
  the others. Step 27.3 took the mark off both of its presses, so she arrives through the band
  again.

  The page is a title, a box she searches in, a row of cards that each take her somewhere, and
  four common questions. It is built from the board the operator approved, and four parts of that
  board describe a product that does not exist yet. The README beside the design names all four,
  so the page differs from the board in four places and nowhere else.

  The first question asks whether a lost phone can be restored, and the board answers "Only with
  your recovery code". Sync and restore are designed and are not built, so the answer on the page
  says what is true today: the days live on that one phone, and the only copy that survives it is
  the file she saved herself with Download data. An answer naming a recovery code nobody can use
  would be the first sentence on the page that is not true.

  The board draws a card for her subscription and ends the answer about cancelling on her profile.
  The account page is not served, so the card is not drawn and the answer keeps only the sentence
  about Apple. The words of that card stay in all three catalogues, marked where they are listed,
  so the card comes back with one edit on the day the account page ships.

  The two cards the board points at nothing now lead somewhere: the Emi Community on Telegram, and
  the beta on TestFlight. The address she writes to is the board's own, held once beside the
  privacy address so one edit moves every press that carries it.

  The other two answers are held to the application rather than to the board. Emi forecasts after
  two complete cycles and counts by the length she gave until then, which the board has right. The
  answer about deleting says where the control is and what it is called, which the board also has
  right, and it no longer says that deleting the application removes everything: the key is kept
  in the keychain on purpose, because the keychain outlives the application, and that is what lets
  a reinstall still read her days.

  The box filters the questions as she types, in whichever of the three languages she is reading,
  and says that nothing matched when nothing does. It runs in her browser and asks no server, so
  there is nothing to send anywhere. A reader whose browser runs nothing at all reads every
  question, which is what the page is drawn with before anything runs.

  Scenario: the support page answers what Emi can answer today
    Given a woman follows "Support" from the band at the top of myemi.app
    Then she reads the title, the box she searches in, three cards and four questions
    And the card for a subscription is not drawn, and its words wait in all three languages
    And the answer about a lost phone says what today costs her, not the restore nobody built
    And the answer about the forecast is what the application does, in all three languages
    And the answer about deleting names the control in the application and what the keychain keeps
    And the answer about cancelling keeps only the sentence about Apple
    And each card takes her somewhere, and she writes to the address the board writes
    And every word the page draws arrives in English, in Russian and in Spanish
    And the two headings are set in the face the board sets them in, which the site serves itself
    And typing a word a question carries leaves her that question and no other, in all three languages
    And typing a word no question carries leaves her the line the board draws, with the address in it
    And clearing the box gives her every question back
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing
    And a browser holds the title of the page against the board, and keeps the picture of any difference
