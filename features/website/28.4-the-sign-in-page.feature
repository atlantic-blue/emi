Feature: The sign in page, with a code sent to her address

  A woman has paid for Emi outside the App Store, or she wants to stop paying. Both need an
  account, and this is the page she gets one on. It is the first page of myemi.app that asks her
  for anything, so what it asks for and what it says it keeps are the whole of the trust it has to
  earn in one screen.

  The board offers four ways in. Three of them need a credential only a person can make: a key from
  Apple, a client from Google and a bot from Telegram, all of which step 28.3 makes. So the page
  draws the fourth, which is a code sent to her email address, and holds the other three back the
  way this site holds back every press whose page is not there. Their words stay in all three
  catalogues, so each one comes back with one edit.

  One rule runs through every sentence on this page. The pool answers the same way whether or not
  an address has an account, because an answer that said which would let anybody test who uses Emi.
  So a new address and an address she has used before reach the same screen, by the same two calls,
  and the page says the same words for both.

  The code cannot be sent yet. Steps 28.8 to 28.10 connect the pool to the sender on myemi.app, so
  the conversation here is proved against a stub of the service rather than against the live pool,
  and nobody has read a real answer from the pool with this code.

  Nothing of hers is kept. The tokens live in sessionStorage, which the tab takes with it when she
  closes it, and no cookie carries them. A woman who signs in on a borrowed machine and closes the
  tab has signed out. The account page reads that store for itself, and a reader with no session is
  moved to this page rather than shown an account that is not hers.

  The account page is the head of its board and nothing else. The subscription, the ways she signs
  in, the preferences and the data each need a step of their own, and a section drawn with nothing
  behind it would say Emi holds something it does not hold.

  Scenario: the page offers the one way in that works today
    Given a woman opens the page she signs in on
    Then she reads the title, the line under it and one box to type her address in
    And the three ways in that wait for their keys are not drawn, and their words wait in all three languages
    And the page tells her she does not need an account, and what the account holds
    And every word the page draws arrives in English, in Russian and in Spanish
    And the title is set in the face the board sets it in, which the site serves itself
    And the page names its own address, so a search engine keeps it apart from the home page
    And the list a crawler reads names the page in each of the three languages
    And the page writes no style of its own, so her browser refuses nothing

  Scenario: a code reaches a new address and a known one the same way
    Given a stub of the pool that answers the way the service documents
    When she asks for a code on an address that has never signed in
    And she asks for a code on an address that has signed in before
    Then both ask the service the same two things, and no password is among them
    And the page says the same words for both, so neither can be told from the other

  Scenario: the code she types signs her in, and each refusal says what to do next
    Given a stub of the pool that answers the way the service documents
    When she answers the code with the six digits she was sent
    Then she holds the three tokens, in sessionStorage and in no cookie
    And a wrong code, an expired code, too many tries and no connection each say their own sentence
    And every one of those sentences arrives in English, in Russian and in Spanish

  Scenario: the account page is the head of its board, and a sign out ends the session
    Given a woman opens her account
    Then she reads the title and the sentence that says her records are not on this site
    And the four sections of the board are not drawn
    And a sign out asks the service to revoke the token that outlives the window
