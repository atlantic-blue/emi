Feature: Every press on the site takes her somewhere

  A woman reads a page of myemi.app and makes up her mind. She wants the community, or the code she
  was told she could read, or the application itself. Then she presses.

  A press to a page nobody has built answers 404 with the Emi page. A press to the page she is
  already reading moves her to the top of the words she just read. Neither one says what happened,
  so she reads broken software, at the moment she decides whether to trust Emi with her cycle. Then
  she closes the page and does not come back.

  So every press on every page leads to a page this site serves, or it leaves the site to an
  address this site writes out whole. There is no third kind. The pages this site serves are the
  list the sitemap is written from, which is the home page, the page that explains the encryption,
  the privacy policy and the support page, each in three languages. The addresses outside it are
  three: the Emi Community on Telegram, the code on GitHub, and the beta Apple runs. Two more are
  the inboxes a privacy question and a support question go to, which her mail application answers
  rather than her browser.

  A press to a page that is still to be built is not drawn at all. Five pages are still to be
  built, at buy, calculator, pulse, sign-in and terms, and the entries that lead to them are held
  in the code with a mark on each, so one edit draws each one again on the day its page ships.
  Seven presses in the band at the foot, three ways into the product in the band at the top, the
  way to her account, the terms, the four cards of the phases and one card of the band of two
  offers: each one waits. The two presses to Apple's store wait for a listing instead, and Apple
  opens the pre-order on 17 November 2026.

  The support page was the sixth of those, and it is built. So the three presses that carry it are
  drawn again: "Support" in the band at the top, "Support" in the band at the foot, and the card
  that offers it on the home page. Each one is read here as a press to a page the site serves,
  which is what the list of pages says it is now.

  The press that offers her the community is the one press this scenario reads whole. It opens in
  the tab she is already in, because a page that opens a second window takes the way back off her
  screen, and it is denied a handle back on the page she came from.

  A browser reads the same rule against a running site, where it can read the status the site
  answers with rather than the list the site is built from.

  Scenario: no link on the site points nowhere
    Given a woman opens every page of the site in each of the three languages
    Then no press takes her to a page that is still to be built
    And the page she signs in on is served, and no press leads to it yet
    And the three presses to the support page are drawn again, now that the page exists
    And every press she meets leads to a page of this site, or off it to an address the site names
    And the press that offers her the community opens the community, in the tab she is reading in
    And a browser reads the same pages the same way
