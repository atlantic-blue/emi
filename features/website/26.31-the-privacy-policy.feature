Feature: The privacy policy

  A woman decides whether to pay 29.99 pounds a year for a tracker that says nobody else can read
  her days. The band at the foot of every page of this site offers her "Privacy policy", and Apple
  asks for the same address before it will take the application at all, so the page stands between
  Emi and the store.

  It used to answer eight questions and the third one answered "Nothing", because Emi had no
  account, took no payment and sent nothing anywhere. Version 1 adds all three, so the page now
  answers fifteen questions. Who we are. What Emi stores. What we collect. Her account, and what it
  holds. Who takes a payment. The anonymous usage and the crash reports she can switch on. Who
  processes data for Emi. How long it is kept. Her rights. The ground in law. Who the records are
  shared with. What happens to reminders and to Face ID. How she deletes it all, including the
  account the phone cannot delete. Who it is not for. Where to write, and how she learns the policy
  changed.

  Three cards sit above the fifteen. Two of them used to name something Emi does not do, and now
  name something she chooses: the account is optional, and the anonymous usage goes nowhere unless
  she agrees. The third is unchanged, because the day is still encrypted before it is written.
  Neither of the first two drawings carries a line through it any more, because the thing it draws
  now exists.

  Three answers are holes. Nobody has chosen who takes a payment on the web, nobody has set how
  long an account is kept, and nobody has written the ground in law. Each one reads as a word in
  capitals inside brackets, because a policy that answered anyway would be the first sentence on
  the page that is not true. The date is no longer one of them: it reads 4 November 2026.

  The page is built by hand from a board that was approved before any of this existed, so a browser
  holds the bands and the title against that board and leaves the words alone. What a picture
  cannot see is read here instead: that every new section arrives in all three languages, that the
  three holes are still holes, that each of the three addresses she can write to is a mail link,
  that the two presses go where the board sends them, that the page names its own address, and that
  a crawler is told the page exists.

  Scenario: the privacy policy says what version 1 of Emi holds
    Given a woman follows "Privacy policy" from the band at the foot of myemi.app
    Then she reads the three cards and then the fifteen sections, in the order the questions arrive
    And the two cards that named something Emi does not do now name something she chooses, with no line drawn through either
    And the date at the top reads 4 November 2026, in all three languages
    And the account, the payments, the usage, the processors, the retention, the rights and the ground in law are each answered, in all three languages
    And the three answers nobody has written read as holes in brackets, in all three languages
    And she can write to Emi from her rights, from deleting, and from the contact, in all three languages
    And every word the page draws arrives in English, in Russian and in Spanish
    And the headings are set in the face the board sets them in, which the site serves itself
    And the press inside what Emi stores opens the page about the encryption
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing
    And a browser holds the bands and the title of the page against the board, and keeps the picture of any difference
