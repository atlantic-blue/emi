Feature: Apple and Google sign her in, and the pool answers on auth.myemi.app

  A woman signs in with Apple or with Google. The account she arrives in holds an email address, a
  subject and the way she signed in. It holds nothing else about her.

  The address the pool answers on is fixed from outside. Apple returns to
  https://auth.myemi.app/oauth2/idpresponse, and Google returns to the same address. So the pool
  answers on auth.myemi.app, with a certificate for that name, and a record that points at it. An
  address of any other name answers nothing.

  Each provider needs a credential that nobody may read. This repository is public, and so is each
  line its pipeline prints. So each credential is read from the parameter store of the account, and
  no value is written here.

  The scopes are the whole promise. Apple offers her name, and Google offers her profile. Each one
  hands over more than an address. So each provider asks for one set of scopes, and the last three
  scenarios refuse a configuration that asks for anything else.

  Scenario: Apple hands over an address and a subject
    Given the sign in the pool offers
    When the way in through Apple is read
    Then it asks Apple for the email address alone
    And it writes her address and her subject onto the account
    And it reads the key, the team, the services name and the key name from the parameter store
    And it never asks Apple for her name

  Scenario: Google hands over an address and whether it is verified
    Given the sign in the pool offers
    When the way in through Google is read
    Then it asks Google for the subject and the email address alone
    And it writes her address and its verification onto the account
    And it reads the client name and the secret from the parameter store
    And it never asks Google for her profile

  Scenario: the pool answers on the one address Apple and Google return to
    Given the sign in the pool offers
    When the address of the pool is read
    Then the pool answers on auth.myemi.app
    And the certificate is for that name, asked for in us-east-1
    And a record in the myemi.app zone points at the distribution of the pool
    And every rule of the sign in is met

  Scenario: nothing in the repository holds a credential
    Given the sign in the pool offers
    When each credential is read
    Then each one is a parameter of Emi and never a value
    And a credential is named nowhere but in the rules that refuse one

  Scenario: a scope outside the set a provider may ask for is refused
    Given the sign in the pool offers
    When a provider asks Google for her profile
    Then the rule names the scope it asked for
    And it names the scopes that provider may ask for

  Scenario: a credential that is not read from the parameter store is refused
    Given the sign in the pool offers
    When a secret is written into the configuration
    Then the rule says that credential reads no parameter
    And a parameter outside the path of Emi is refused as well

  Scenario: an address other than auth.myemi.app is refused
    Given the sign in the pool offers
    When the pool is given another address
    Then the rule names the address it was given
    And it names the address Apple and Google return to
