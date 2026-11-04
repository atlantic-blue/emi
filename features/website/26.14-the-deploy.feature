Feature: The page she opens is the page this repository builds

  Everything about myemi.app is in this repository except the one thing that matters to her: the
  page she actually opens. Today the server function answers every address with an empty body,
  because the infrastructure created it with a placeholder and nothing has ever replaced the code.
  The site is written, reviewed, tested and formatted, and nobody can read it.

  This is the step that closes that gap, and it is the only path from a merge to the page she
  reads. It has to be the only one. An upload from somebody's machine would put a build nobody
  reviewed in front of her, and leave the repository saying something the site does not say.

  Shipping is four moves, and all four have to happen or none of them count. The build becomes two
  halves, so the code of the server function is replaced and the files the pages ask for are
  uploaded. Then the cache of the distribution is cleared, because a reader who arrives a second
  later would otherwise be handed the page from before the merge. Then the live site is read, with
  a browser, at the address she types.

  That last move is the one with the value in it. A build that passes every check and then answers
  wrongly in front of her is the failure this step exists to catch, and nothing before the deploy
  can see it: the headers are added at the edge, the moves between addresses happen at the edge,
  and a site started on a runner has neither. So the deploy reads the real host, and a site that
  answers wrongly takes the deploy down with it.

  Until the home page lands, what the real host has is the page nobody meant to open, the headers
  on every answer, and the one address. The 404 is the proof that the placeholder is gone: the
  placeholder answers 200 with nothing in it, so a 404 carrying the Emi words can only come from
  the build.

  Scenario: myemi.app serves the Next.js site from the deploy
    Given the pipeline that ships myemi.app
    Then a merge into main builds the site and puts it where a reader reaches it
    And the cache is cleared, so what she opens is what was just built
    And the deploy then reads the live site, and a site that answers wrongly fails it
    And what it reads today is the page nobody meant to open, the headers, and the one address
    And a pull request builds the site and changes nothing a reader can see
    And nothing reaches the account from a machine, and the pipeline holds no key of its own
    And the site ships after the infrastructure, and the directory says so in words she can read
