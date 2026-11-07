Feature: The site may sign her in with Apple and with Google

  A woman reads myemi.app and presses Apple or Google. The pool holds both ways in already. The
  client the site signs her in with did not list either one, so the pool refused every press. This
  feature gives that client the two providers, the flow they travel in and the addresses they
  return to.

  The code sent to her email address signs a woman in today. It travels in ALLOW_USER_AUTH, and it
  is the way in the pool holds itself, which the service calls COGNITO. Both stay, because a client
  that lost either one would lose a sign in that works.

  The site asks for the subject and the email address. It asks for nothing else. The profile scope
  would hand over her name, her picture and her language, and the account holds none of those.

  The browser is handed a code to exchange, and never a token in an address. A token in an address
  stays in her history and travels in the referrer of the next request she makes.

  The site serves three languages, and the page she comes back to is written in the language she
  was reading. So each language has a return address and a sign out address, and the languages are
  read from the site rather than typed here.

  The application on her phone does not change. It signs in with the code alone, and a provider on
  that client would offer a press no screen of the application draws.

  Scenario: the site offers Apple, Google and the code sent to her address
    Given the sign in the pool offers
    When the client the site signs her in with is read
    Then it offers Apple, Google and the way in the pool holds itself
    And it offers each provider through the resource that makes it
    And it keeps the flow the code sent to her address travels in

  Scenario: the browser is handed a code, and the pool is asked for an address and a subject
    Given the sign in the pool offers
    When the client the site signs her in with is read
    Then it allows the authorization code flow alone
    And it asks for the subject and the email address alone
    And it may use the flows of the pool

  Scenario: she comes back to the page of the language she was reading
    Given the sign in the pool offers
    When the addresses of the site are read
    Then one return address names each language the site serves
    And one sign out address names the sign in page of each language
    And every rule of the sign in of the site is met

  Scenario: the application on her phone signs in with the code alone
    Given the sign in the pool offers
    When the client her phone signs her in with is read
    Then it offers no provider and names no return address
    And it allows the same two flows it allowed before

  Scenario: a scope outside the subject and the address is refused
    Given the sign in the pool offers
    When the site asks the pool for her profile
    Then the rule names the scopes it asked for
    And it names the scopes the site may ask for

  Scenario: a return address the site does not serve is refused
    Given the sign in the pool offers
    When the site comes back to the page of a language it does not serve
    Then the rule names the address nothing comes back to
    And it names the address of no page of the site

  Scenario: losing the flow of the code sent to her address is refused
    Given the sign in the pool offers
    When the client loses the flow the code travels in
    Then the rule says the code signs nobody in

  Scenario: a provider named as text is refused
    Given the sign in the pool offers
    When the site names a provider as text rather than as the resource
    Then the rule says a client offers a provider through the resource that makes it
