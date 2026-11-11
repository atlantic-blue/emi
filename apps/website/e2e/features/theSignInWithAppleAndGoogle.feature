Feature: What a woman is left with when she signs in with Apple or with Google

  She presses Apple, Apple asks her once, and she comes back signed in. That is the whole feature,
  and not one part of it can be read from the markup of a page: the press makes a value nobody can
  guess and keeps it in the browser, the pool hands it back in the address, and the page she
  returns to exchanges a code for her tokens and leaves her on her account.

  So a browser drives it here, from the press to her account and out again through the sign out.
  Each scenario ends on what she is left looking at, because a page that asked the pool correctly
  and then drew the wrong screen is a page that does not work.

  The pool is answered by the suite rather than by the live pool. The credentials of Apple and of
  Google are in the parameter store of the account and no run of this suite holds one, so a press
  against the live pool would prove that a credential is not registered yet and nothing else.
  Every shape below is one the service documents.

  The state is the one rule worth a scenario of its own. The pool hands back the value her browser
  wrote, so a return carrying any other value is a return this browser did not start. Nothing is
  exchanged for it, and the scenario reads the calls that went out and finds none.

  Scenario Outline: a press on a way in leaves her on her account
    Given a woman opens the page she signs in on, with a pool that answers a provider
    When she presses "<press>"
    Then she leaves for "<provider>" with a value nobody can guess and a digest
    And she comes back signed in, and is left on her account
    When she presses Sign out
    Then she is left on the home page, holding no session at all

    Examples:
      | press               | provider        |
      | Sign in with Apple  | SignInWithApple |
      | Sign in with Google | Google          |

  Scenario: a return her browser did not start signs nobody in
    Given a woman opens the page she signs in on, with a pool that answers a provider
    And the pool will answer with a state her browser never wrote
    When she presses "Sign in with Apple"
    Then she is told the sign in did not finish, and the pool was asked for no token
    And she is offered the page she signs in on, and holds no session at all

  Scenario: a browser that cannot make a digest says so, and the code sign in still works
    Given a browser that cannot make a digest
    And a woman opens the page she signs in on, with a pool that answers a provider
    When she presses "Sign in with Apple"
    Then she is told Emi could not start that sign in, and she stays on the page
    And the box she types her address in is still there

  Scenario: the page offers Apple wherever it offers Google
    Given a woman opens the page she signs in on, with a pool that answers a provider
    Then she reads a press for Apple beside the press for Google
    And she reads a press for Telegram as well, which leaves for Telegram and not for the pool
