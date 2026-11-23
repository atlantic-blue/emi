Feature: The privacy policy

  A woman decides whether to pay 39 euros a year for a tracker that says nobody else can read
  her days. The band at the foot of every page of this site offers her "Privacy policy", and Apple
  asks for the same address before it will take the application at all, so the page stands between
  Emi and the store.

  It used to answer eight questions and the third one answered "Nothing", because Emi had no
  account and took no payment. Version 1 adds both, so the page now answers fourteen questions. Who
  we are. What Emi stores. What we collect. Her account, and what it holds. Who takes a payment.
  Who processes data for Emi. How long it is kept. Her rights. The ground in law. Who the records
  are shared with. What happens to reminders and to Face ID. How she deletes it all, including the
  account the phone cannot delete. Who it is not for. Where to write, and how she learns the policy
  changed.

  The account holds her email address and an account identifier, because that is what the sign in
  keeps. The application sends no usage events and no crash reports, so the policy names neither,
  and no company that would receive them.

  Three cards sit above the fourteen. The first used to say there is no account, and now says the
  account is optional, with no line through its drawing. The second still says "No tracking", with
  the line through its drawing that the board draws, because Emi still tracks nobody. The third is
  unchanged, because the day is still encrypted before it is written.

  Two answers are holes. Nobody has set how long an account is kept, and nobody has written the
  ground in law. Each one reads as a word in capitals inside brackets, because a policy that
  answered anyway would be the first sentence on the page that is not true. Stripe takes a payment
  on the web, so that answer is a name. The date reads 23 November 2026.

  The page is built by hand from a board that was approved before any of this existed, so a browser
  holds the title against that board and leaves the words alone. The two bands the whole site shares
  are left out of that comparison: each of them draws presses to pages nobody has built yet, so the
  site holds those presses back and the board still draws them. What a picture
  cannot see is read here instead: that every new section arrives in all three languages, that the
  three holes are still holes, that each of the three addresses she can write to is a mail link,
  that the two presses go where the board sends them, that the page names its own address, and that
  a crawler is told the page exists.

  Scenario: the privacy policy says what version 1 of Emi holds
    Given a woman follows "Privacy policy" from the band at the foot of myemi.app
    Then she reads the three cards and then the fourteen sections, in the order the questions arrive
    And the card about the account says it is optional, and the card about tracking still says there is none
    And the date at the top reads 23 November 2026, in all three languages
    And the account, the payments, the processors, the retention, the rights and the ground in law are each answered, in all three languages
    And the two answers nobody has written read as holes in brackets, in all three languages
    And she can write to Emi from her rights, from deleting, and from the contact, in all three languages
    And every word the page draws arrives in English, in Russian and in Spanish
    And the headings are set in the face the board sets them in, which the site serves itself
    And the press inside what Emi stores opens the page about the encryption
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing
    And a browser holds the title of the page against the board, and keeps the picture of any difference
