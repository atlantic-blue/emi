Feature: The sign in page, with a code sent to her address

  A woman has paid for Emi outside the App Store, or she wants to stop paying. Both need an
  account, and this is the page she gets one on. It is the first page of myemi.app that asks her
  for anything, so what it asks for and what it says it keeps are the whole of the trust it has to
  earn in one screen.

  The board offers four ways in. Three are drawn: Apple, Google and a code sent to her email
  address. Telegram needs a function of its own, so the page holds that press back the way this
  site holds back every press whose page is not there, and its words stay in all three catalogues
  so it comes back with one edit.

  One rule runs through every sentence on this page. The pool answers the same way whether or not
  an address has an account, because an answer that said which would let anybody test who uses Emi.
  So a new address and an address she has used before reach the same screen, by the same one call,
  and the page says the same words for both.

  One email reaches her for one sign in. The service sends two different codes, six digits to
  confirm an address and eight to sign a woman in, so the box is as wide as the code she was sent
  and the words beside it name no number. The two addresses part company only at the confirmation,
  which refuses an address that already has an account, and only for somebody who typed the code
  out of that address. A reader who cannot read her email learns nothing from this page.

  The pool sends a real email, so the conversation here is proved against a stub of the service:
  a run against the live pool would make a user and write to whoever owns the address. One answer
  was read from the live pool, for an address that has no user at all, and the service handed back
  a whole email one time password challenge and sent no email. That reading is why the page cannot
  tell the two addresses apart before the first email goes out.

  Nothing of hers is kept. The tokens live in sessionStorage, which the tab takes with it when she
  closes it, and no cookie carries them. A woman who signs in on a borrowed machine and closes the
  tab has signed out. The account page reads that store for itself, and a reader with no session is
  moved to this page rather than shown an account that is not hers.

  The account page is the head of its board and nothing else. The subscription, the ways she signs
  in, the preferences and the data each need a step of their own, and a section drawn with nothing
  behind it would say Emi holds something it does not hold.

  Scenario: the page offers Apple, Google and a code sent to her address
    Given a woman opens the page she signs in on
    Then she reads the title, the line under it and one box to type her address in
    And Telegram alone waits for its own sign in, and its words wait in all three languages
    And the page tells her she does not need an account, and what the account holds
    And every word the page draws arrives in English, in Russian and in Spanish
    And the title is set in the face the board sets it in, which the site serves itself
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing

  Scenario: one email reaches a new address and a known one the same way
    Given a stub of the pool that answers the way the service documents
    When she asks for a code on an address that has never signed in
    And she asks for a code on an address that has signed in before
    Then each one asks the service for one thing, and no password is among them
    And one email goes out for one press, where two used to
    And the page says the same words for both, so neither can be told from the other

  Scenario: the code she types signs her in, and each refusal says what to do next
    Given a stub of the pool that answers the way the service documents
    When she answers the code with the digits she was sent
    Then she holds the three tokens, in sessionStorage and in no cookie
    And a wrong code, an expired code, too many tries and no connection each say their own sentence
    And every one of those sentences arrives in English, in Russian and in Spanish

  Scenario: the account page is the head of its board, and a sign out ends the session
    Given a woman opens her account
    Then she reads the title and the sentence that says her records are not on this site
    And the four sections of the board are not drawn
    And a sign out asks the service to revoke the token that outlives the window

  Scenario: an address that already has an account is sent a sign in code of eight digits
    Given a stub of the pool that answers the way the service documents
    When she types the code sent to an address that already has an account
    Then she is left on the same box, waiting for the eight digits of a sign in code
    And those eight digits hand her the three tokens
    And no call that went out says which of the two she was before she typed the code
