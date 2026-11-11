Feature: The site signs her in with Apple and with Google

  A woman has paid for Emi outside the App Store, or she wants to stop paying. The page she signs
  in on offered her one way in, which is a code sent to her email address. It offers three now:
  Apple, Google and the code.

  A press leaves for the pool with the provider named in the address, so she lands on Apple or on
  Google and never reads a page of the pool asking her again which one she meant. The page she
  comes back to exchanges a code for her tokens and leaves her on her account, holding the same
  session a code sign in leaves her holding. One sign in, one session, one place that writes it.

  Apple and Google ship together and may not drift apart. Apple's review rule asks an application
  that offers a social sign in to offer, beside it, a way in that limits what it collects to a
  name and an address. Sign in with Apple is that way in, so every place that offers Google offers
  Apple, and the last scenario reads every source of this repository for a place that does not.

  What Apple and Google learn is that she uses Emi. Neither one receives a day, a symptom or a
  date, because the account holds the subject and the address and the press asks for nothing else.

  Telegram is the fourth way the board draws, and it is built beside these two. It leaves for
  Telegram rather than for the pool and it has a relay page of its own, so it is read in its own
  feature. What is read here is that its press sits beside these two and takes nothing from them.

  Scenario: the page draws the two presses, and the words arrive in three languages
    Given a woman opens the page she signs in on
    Then she reads a press for Apple and a press for Google over the divider
    And each press carries the mark of its own company, drawn as the board draws it
    And neither press is drawn in a colour of Emi that its company does not allow
    And every word of the two presses arrives in English, in Russian and in Spanish

  Scenario: the page she comes back to says what it is doing, in three languages
    Given a woman comes back from Apple
    Then she reads one line that says Emi is finishing her sign in
    And the page names its own address, so a search engine keeps it apart from the others
    And every word of that page arrives in English, in Russian and in Spanish
    And the list a crawler reads names the page in each of the three languages

  Scenario: the page may reach the pool that answers on auth.myemi.app
    Given the policy every page of the site answers with
    Then it allows the host the pool answers on, beside the host the code sign in asks
    And it allows no host outside the three that sign her in, and no page writes a style of its own

  Scenario: every place that offers Google offers Apple beside it
    Given every source of this repository
    When each place that offers a way in is read
    Then not one of them offers Google without Apple
    And a place that offered Google alone would be named, with the name it is missing
