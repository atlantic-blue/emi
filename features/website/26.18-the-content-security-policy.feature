Feature: The scripts of the site run under the content security policy

  A woman follows an old link to myemi.app and lands on an address the site does not have. She
  reads nothing. The page is white. Her browser was handed the words, and the scripts that draw
  them, and it refused to run a single one of them.

  The refusal is correct, and the policy that made it is the one the site wants. One origin, no
  frame, nothing reaching another company. The part that is wrong is that Next.js draws every page
  with a script written into the markup, and a policy that names nothing cannot tell that script
  from one somebody else managed to write in. So it refuses both.

  Allowing every inline script would clear the page and give away the protection in the same move.
  Instead each answer carries a secret of its own: a fresh value in the policy, and the same value
  on the scripts of that one answer. Her browser runs those and nothing else. The next answer has
  a different value, so a script copied out of one page is dead in the next.

  The same policy refuses a style written on an element, because a secret cannot be put on one.
  So a page of this site carries none, and the mark at the top of the band is drawn in the page
  rather than wrapped in an element that writes one.

  This scenario drives the real thing the site puts in front of every page and reads what it hands
  back. So it refuses the white page she met, and it refuses the way back to it.

  Scenario: the scripts of the site run under the content security policy
    Given the site Emi serves her pages from
    When she opens a page of myemi.app
    Then her browser is told to run the scripts that draw the page
    And it is told to run no other script written into the page
    And the secret is long enough that nobody can guess it before the page arrives
    And Next.js reads that secret, so the scripts of the page carry it
    When she opens a second page
    Then that page carries a secret of its own, so the first page's scripts are dead in it
    And no page of the site asks her browser for a style this policy refuses
    And the edge keeps the policy of the page, and still covers a file from the bucket
