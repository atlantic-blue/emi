Feature: A browser reads the page nobody meant to open

  Every test of myemi.app so far asks React to draw a page and then reads the markup. That proves
  the words are in the page. It does not prove the page arrives.

  A site can answer the right words with the status 200. Then a search engine keeps the address
  for good, and a store reviewer reads a page the site says it has. A site can answer the right
  status and draw the wrong page. A site can draw the words at the width of a desktop and push the
  press back off the side of a phone, which is the width most of her reading happens at. None of
  that is visible to a renderer in node, because none of it is in the markup.

  So one page of this site is read by a real browser: the page a woman reaches by accident. She
  mistyped the address, or she followed a link from somewhere old, and she is already lost. The
  page has one job, and the browser is the only witness that it does it.

  This scenario is about that witness, and about whether it will be believed. It reads at two
  widths, because a suite that only ever ran at one width cannot see the phone. It can be pointed
  at the live host, so the same sentences that pass here are the ones that pass against
  myemi.app. And a run that opened no page at all is refused, because a browser suite with nothing
  to do reports a pass that reads the same as every other pass.

  Scenario: playwright opens the not found page at two widths
    Given the suite that reads myemi.app in a browser
    Then it starts the site this repository builds, and reads it there
    And it reads at the width of a desktop and at the width of a phone
    And what it reads is the status, the words she gets, and her press back to Emi
    And a sentence nobody taught it stops the run instead of being skipped
    And told another host, it reads that host and starts no site of its own
    And a run that carried out no scenario at all is refused
