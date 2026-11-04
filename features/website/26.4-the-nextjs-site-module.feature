Feature: The Next.js site module

  A woman types myemi.app. Everything she decides about Emi, she decides from what she reads next,
  so two quiet failures at that first request cost more than a broken page would.

  The first is two addresses. The distribution answers for the apex and for www, so without a
  redirect the same words live at both, and the privacy page a store review reads is not the page
  on the record. The address she was given and the address she lands on have to be one address.

  The second is a second door. The pages come from a Lambda function and the built files come from
  a bucket, and each of those has an address of its own. If either answers a direct call, the site
  can be read around the distribution, where none of the headers of SITE-6 reach: no transport
  security, no content policy, nothing refusing a frame. The promise on the page would hold and the
  promise about the page would not.

  Scenario: www.myemi.app redirects to myemi.app and the origins refuse a direct call
    Given the site Emi is served from
    When a reader asks for www.myemi.app
    Then she is sent to the one address on the record, keeping the path she asked for
    And the root sends her to a language, because no page lives above one
    And a page reaches the origin, which is told the address she typed
    And the bucket of built files answers nobody but this distribution
    And the server function answers nobody but this distribution
    And every answer carries the six headers that keep the promise about the page
