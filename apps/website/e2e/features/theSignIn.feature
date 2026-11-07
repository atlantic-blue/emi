Feature: What a woman is left with when she signs in

  A sign in is only half the feature. The half that decides whether it works is what comes back:
  the box for the six digits on the screen she was on, her account afterwards, and the page she
  signs in on when she has no session and asks for her account anyway.

  None of that can be read from the markup. The session lives in sessionStorage, which only a
  browser has, and the page she lands on reads it for itself. So a browser drives it here, from
  the address box to the account and back out again.

  The pool cannot send an email yet. Steps 28.8 to 28.10 connect it to the sender on myemi.app, so
  the service is answered here with the shapes it documents, and the six digits are a code this
  suite wrote.

  Scenario: she asks for a code and is left waiting for six digits
    Given a woman opens the page she signs in on, with a pool that answers
    When she types her address and presses Send code
    Then she is left on the box for the six digits, with her address written above it
    And the page never says whether that address had an account

  Scenario: the code she types leaves her on her account
    Given a woman opens the page she signs in on, with a pool that answers
    When she types her address and presses Send code
    And she types the six digits and presses Sign in
    Then she is left on her account, holding a session no cookie carries

  Scenario: a wrong code leaves her on the box, told what to do next
    Given a woman opens the page she signs in on, with a pool that answers
    When she types her address and presses Send code
    And she types a code the pool refuses
    Then she is left on the box for the six digits, reading that the code is not right
    And she can ask for another code, and she can go back and use another address

  Scenario: her account with no session is the page she signs in on
    Given a woman with no session opens her account
    Then she is left on the page she signs in on
