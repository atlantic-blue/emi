Feature: The contracts follow the move to Next.js

  The website was going to be static pages, built from `apps/website` by a TypeScript program and
  uploaded to one bucket. It is now a Next.js App Router application that runs on Amazon Web
  Services Lambda, built by OpenNext, with a bucket of static assets beside it.

  A contract is the only written statement of what a part of Emi must do, so three of them now
  describe a site nobody is building. A reader who starts at the map arrives at a program that
  writes hypertext markup, and the two risks the new shape carries are written down nowhere: a
  function url anybody on the internet may call, and a build that tells a third party somebody read
  a page.

  Scenario: the website contracts describe a Next.js site on Lambda
    Given the two documents that carry the contracts of Emi
    When the three contracts the move to Next.js changes are read
    Then the origins are a private bucket of assets and a server function on Lambda
    And a function url with no authentication, and any other caller of the function, are refused
    And the pages come from Next.js through OpenNext, with every value from the tokens
    And a page that reaches another host, and telemetry in the build, are refused
    And a merge updates the code of the server function and checks the live site
    And a code update from a pull request, and one from a machine, are refused
    And nothing about the website still promises pages a program writes on a build machine
    And the map names the origins and the Next.js pages
    And the two checks the pipeline runs over the documents report no problem
