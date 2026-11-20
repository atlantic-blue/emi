Feature: What a woman is left with when she signs in

  A sign in is only half the feature. The half that decides whether it works is what comes back:
  the box for the six digits on the screen she was on, her account afterwards, and the page she
  signs in on when she has no session and asks for her account anyway.

  None of that can be read from the markup. The session lives in localStorage, which only a
  browser has, and the page she lands on reads it for itself. So a browser drives it here, from
  the address box to the account and back out again.

  The session belongs to the browser and not to the page, so a second page of the same browser
  reads the same session, and a sign out in one page signs her out in the other. The last
  scenario opens two pages and drives both.

  The page she buys Emi on is the other page that asks. A payment lands against the sign in she
  used, so that page draws nothing of the plan and nothing of the form to a reader with no
  session: it moves her to the page she signs in on, and the sign in gives her the page back.

  The pool sends a real email, so the service is answered here with the shapes it documents
  rather than for real: a run against the live pool would make a user and write to whoever owns
  the address. The six digits are a code this suite wrote, and they are the code that confirms an
  address. The code that signs a woman in is eight digits long, and the box widens to take it in
  apps/website/test/theCodeBoxSheTypesIn.test.tsx.

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

  Scenario: the page she buys Emi on with no session is the page she signs in on
    Given a woman with no session opens the page she buys Emi on
    Then she is left on the page she signs in on
    And she read no word of the plan and no press that pays

  Scenario: a sign in started on the page she buys Emi on gives her that page back
    Given a woman with no session opens the page she buys Emi on, with a pool that answers
    When she types her address and presses Send code
    And she types the six digits and presses Sign in
    Then she is left on the page she buys Emi on, reading the plan

  Scenario: a second page of the same browser reads the same session
    Given a woman opens the page she signs in on, with a pool that answers
    When she types her address and presses Send code
    And she types the six digits and presses Sign in
    And she opens her account in a second page of the same browser
    Then the second page reads her as signed in
    And a sign out in the second page leaves the first page signed out
