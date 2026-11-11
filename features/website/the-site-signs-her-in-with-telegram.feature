Feature: The site signs her in with Telegram

  A woman in Russia reads Emi in Russian and has a Telegram account. The page she signs in on now
  offers her that way in, beside Apple, beside Google and beside a code sent to her email address.

  It is the one way in that never opens a page of the pool, because Amazon Cognito cannot process
  a custom sign in inside its managed login pages. So her browser leaves for Telegram, Telegram
  asks her once, and Telegram sends her back to a relay page of this site with a code. That page
  hands the code to the sign in function of the api, which answers with a user name of the pool and
  one answer good for one challenge, and two calls to the pool turn that answer into her tokens.

  The browser holds a code and a one time answer, and it never holds a Telegram token. The
  identity token Telegram signs is read by the sign in function and the function answers with none
  of it, so the subject of a woman reading a period tracker is in no browser.

  Telegram processes a login only for an address registered in advance, and it matches the address
  rather than the page. One address is registered, under en, and every language of the site comes
  back through it. So the language she pressed in travels in the state value, and the relay sends
  her on in that language.

  Nothing here is proved against the live account. The client secret of the bot and the two allowed
  addresses are made by hand in the BotFather mini application, and the pool does not name the three
  triggers of the custom sign in yet. Every shape below is one the service documents or one the sign
  in function of this repository already answers with.

  Scenario: the page draws the press, and it carries the mark the board draws
    Given a woman opens the page she signs in on
    Then she reads a press for Telegram under the press for Google
    And the press carries the paper plane the board draws, in the colour of the words beside it
    And the press is drawn on the tint of Emi, in no colour another company fixes
    And the word of the press arrives in English, in Russian and in Spanish

  Scenario: the relay page says what it is doing, in three languages
    Given a woman comes back from Telegram
    Then she reads one line that says Emi is finishing her sign in
    And the page presses nothing and says nothing of the code in the address
    And the page names its own address, so a search engine keeps it apart from the others
    And the list a crawler reads names the page in each of the three languages

  Scenario: the press asks Telegram for a subject and nothing else of hers
    Given the address a press on Telegram hands her browser
    Then it names the bot of Emi as the client, and asks for a code
    And it asks for the scope openid, and for none of the three scopes that describe her
    And it hands Telegram a digest, and keeps the value the digest was made from
    And it comes back to the one address Telegram registers, which is under en

  Scenario: the policy lets her browser reach the api that signs her in
    Given the policy every page of the site answers with
    Then it names the api of Emi as one source the page may reach
    And it names the host Telegram asks her on nowhere, because her browser leaves the site for it
