Feature: What a woman is left with when she logs in with Telegram

  She reads Emi in Russian, presses Log in with Telegram, Telegram asks her once, and she comes
  back signed in. Not one part of that can be read from the markup of a page: the press makes
  three values nobody can guess and keeps them in the browser, Telegram hands one of them back in
  the address, and the page she returns to turns a code into her tokens through the api and the
  pool.

  So a browser drives it here, from the press to the page she lands on. Each scenario ends on what
  she is left looking at, because a page that called the api correctly and then drew the wrong
  screen is a page that does not work.

  Three services are answered by the suite rather than reached. Telegram holds the client secret of
  the bot and the two allowed addresses, which are made by hand, so a press against it would prove
  that an address is not registered yet and nothing else. The sign in function is not packaged into
  a deployed function. And the pool does not name the three triggers of the custom sign in. Every
  shape below is one the service documents or one the sign in function of this repository already
  answers with.

  Telegram redirects to one registered address, which is under en, and she pressed in Russian. So
  the scenario presses on the Russian page and reads which language she lands in: the language
  travels in the state value, and the relay page reads it from there.

  The state is the one rule worth a scenario of its own. Telegram hands back the value her browser
  wrote, so a return carrying any other value is a return this browser did not start. Nothing is
  sent to the api for it, and the scenario reads the calls that went out and finds none.

  Scenario: a press on Telegram leaves her signed in, in the language she was reading
    Given a woman opens the page she signs in on in Russian, with Telegram and the api answered
    When she presses Log in with Telegram
    Then she leaves for Telegram with the bot of Emi, a state and a digest
    And she comes back signed in, and is left on the page she signs in on in Russian
    And the api was given the code and the verifier, and the pool was answered once

  Scenario: a return her browser did not start signs nobody in
    Given a woman opens the page she signs in on in Russian, with Telegram and the api answered
    And Telegram will answer with a state her browser never wrote
    When she presses Log in with Telegram
    Then she is told the sign in did not finish, and the api was asked for nothing
    And the relay offers her the page she signs in on, and she holds no session at all
