/**
 * Every word the site draws in English, under a name. Nothing else on the site holds a word.
 *
 * The page is the board `docs/design/website/home-v2/boards/MainV2.dc.html`, so every sentence
 * here is the board's own sentence. A word that reads oddly reads that way on the canvas too, and
 * the canvas is where it changes.
 *
 * Three of these sentences are written elsewhere first and copied here, and a test reads the copy
 * against the original so the two cannot drift. The price is the application's own line, because a
 * reader who meets Emi here and buys it there must be told the same number twice. The two denials
 * are approved sentences of the honesty gate, word for word, and they are also the sentences the
 * approved board draws.
 *
 * The brand line stays in English in all three languages: it says what the four letters of the
 * name stand for, and a translation of it would name something Emi is not called. So do the name
 * of the product and the name of Apple's store.
 *
 * The board leaves a hole for a review nobody has written yet. Those sit in
 * `lib/thePlaceholders.ts` rather than here: a hole is not a word of the product, and it reads the
 * same in every language until the text that fills it arrives.
 *
 * `{day}` and `{phase}` are filled by the ring, which is the one part of the page that changes
 * while she reads it.
 */
export const english = {
  brandLine: 'Emi. Every Month Insights.',
  store: 'Download on the App Store',
  storeSmall: 'Download on the',
  price: 'One month free, then 29.99 pounds a month.',
  languageLabel: 'Language',
  pageDescription: 'A period and cycle tracker that keeps your records to yourself.',

  // Read out to a woman whose software speaks a picture to her, and drawn as words by a chat
  // that has no room for one. The picture is a single file for all three languages and its own
  // words are English, so each language says what it shows rather than quoting it.
  sharePictureAlt:
    'The Emi icon, the headline Understand your body, safely, and the cycle ring at day 8 of about 31, follicular phase.',

  // The hero, and the ring a reader can move through a cycle.
  heroHeadline: 'Understand your body, safely.',
  heroLine:
    'Emi starts with your cycle: a forecast from your own data, and how sure it is. Then accurate education, and a community where you can ask what people are told not to. Your data is always encrypted.',
  heroPriceLine: 'Free for your first month.',
  heroCancel: 'Cancel anytime.',
  ringLabel: 'Cycle ring at day {day} of about 31, {phase}.',
  ringPeriod: 'PERIOD',
  ringFollicular: 'FOLLICULAR PHASE',
  ringOvulation: 'OVULATION',
  ringLuteal: 'LUTEAL PHASE',
  ringDay: 'Day {day}',
  ringOfAbout: 'of about 31',
  ringMove: 'Move through a cycle',

  // What the forecast is, and what it is not.
  cycleEyebrow: 'YOUR CYCLE',
  cycleHeadline: 'A range of days, and how sure Emi is.',
  cycleLine:
    'Emi learns from your own cycles, not from an average. It gives you a window, not a single date, and says how confident it is. Until it has two full cycles, it tells you it is still learning.',
  cycleScreenAlt: 'The Emi home screen with the ring at day 8 of about 31.',
  cycleNextLabel: 'Your next period',
  cycleNextRange: 'Between the 8th and the 14th of October',
  cycleNextConfidence: 'High confidence, from your last 6 cycles',
  cycleDenial: 'Emi is not a contraceptive and not a medical device.',

  // The four guides, one for each phase of the ring above.
  learnEyebrow: 'EDUCATION',
  learnHeadline: 'Accurate answers to the questions people are taught not to ask.',
  learnLine:
    'Clear guides on what your body is doing in each phase, and what may help. Written plainly, without embarrassment.',
  learnPeriodLabel: 'PERIOD',
  learnPeriodTitle: 'Cramps, tiredness and what may help.',
  learnFollicularLabel: 'FOLLICULAR',
  learnFollicularTitle: 'The days after your period.',
  learnOvulationLabel: 'OVULATION',
  learnOvulationTitle: 'An estimate, from your past cycles.',
  learnLutealLabel: 'LUTEAL',
  learnLutealTitle: 'Cramps in the luteal phase, and more.',

  // Where she can ask somebody, and the card for a parent reading over her shoulder.
  communityEyebrow: 'COMMUNITY',
  communityHeadline: 'A safe place to ask, and to help each other.',
  communityLine:
    'The Emi Community is where people ask questions, share what helped them and suggest what Emi should do next.',
  communityJoin: 'Join the Emi Community on Telegram ›',
  parentsEyebrow: 'FOR PARENTS AND DAUGHTERS',
  parentsHeadline: 'Start the conversation early.',
  parentsLine:
    'Accurate information you can share with your daughter, about the subjects that still feel hard to talk about. Learn together, in a space made to feel safe.',

  // Who is building it, and why, in their own words. Two people, one at a time.
  noteEyebrow: 'WHY WE ARE BUILDING EMI',
  founderControlsLabel: 'founder controls',
  founderPrevious: 'Previous founder',
  founderNext: 'Next founder',
  founderIuliiaRole: 'Co-founder of Emi, host of the Emi Community',
  founderIuliiaNote:
    'After 9 years of psychological practice and working with over 1,500 women, I built Emi to create a safe, shame-free space. A place where women of any age can freely explore their bodies, access accurate education on the most taboo subjects, and truly feel like themselves.',
  founderJulianRole: 'Co-founder of Emi',
  founderJulianNote:
    'I have two daughters. I am building Emi so they have a safe place to understand their bodies: accurate information, education on the subjects that are still taboo, and a community to ask without judgement, from a young age. And along the way, to help everyone else who needs the same.',

  // What other people say, one row of cards at a time.
  reviewsEyebrow: 'REVIEWS',
  reviewsHeadline: 'What people say about Emi.',
  reviewsRating: '[RATING] on the App Store, from [COUNT] ratings',
  reviewControlsLabel: 'review controls',
  reviewPrevious: 'Previous review',
  reviewNext: 'Next review',
  reviewFromTheStore: 'App Store review',
  reviewFromTheCommunity: 'Emi Community member',
  reviewFromTheBeta: 'TestFlight beta tester',

  // The two presses that hold both carousels still, and start them again.
  carouselPause: 'Pause',
  carouselPlay: 'Play',

  // The one promise the whole product rests on.
  privacyHeadline: 'Your data is always encrypted.',
  privacyLink: 'How Emi protects your data ›',

  // For a reader who is not ready to install anything.
  tryTitle: 'Not ready to download?',
  tryLine: 'Try the free calculator. Nothing you enter leaves the page.',
  tryLink: 'When is my next period? ›',
  askTitle: 'Questions?',
  askLine: 'We reply in English, Russian and Spanish.',
  askLink: 'Visit support ›',

  // The page that explains the encryption, from boards/Protection.dc.html. The name of Emi is not
  // here: the third column of the dark band is called Emi in every language, so it sits beside the
  // band it is drawn in, where nobody can translate it, as the names of the two founders do.
  protectionEyebrow: 'Privacy',
  protectionHeadline: 'Your days are yours.',
  protectionHeadlineQuiet: 'Not ours.',
  protectionLine:
    'Emi encrypts each day on your phone, with a key that stays on your phone. The code is public, so you can check this page against it.',
  protectionReadTheCode: 'Read the code',
  protectionReadTheDocument: 'Read the full document ›',
  protectionScreenAlt:
    'The Privacy screen in Emi. It says: Only you can read your days. Encrypted on this phone, with a key only you hold.',

  // What happens to one day, in the order it happens in.
  protectionDayHeadline: 'What happens to one day.',
  protectionLogTitle: 'You log a day.',
  protectionLogLine: 'Period, symptoms, mood, sex or a note.',
  protectionSealTitle: 'Your phone seals it.',
  protectionSealLine:
    'Emi encrypts the day before it writes it. The key is in your iPhone keychain.',
  protectionLeavesTitle: 'Only the result leaves.',
  protectionLeavesLine:
    'With sync, the server keeps ciphertext, a revision number and a write time. It holds no key.',
  protectionBuilt: 'In the app today',
  protectionNotBuilt: 'Designed, not built yet',

  // Who holds the keys, which is the answer she came for.
  protectionKeysHeadline: 'Who holds the keys.',
  protectionKeysHeadlineQuiet: 'Not Emi.',
  protectionPhoneTitle: 'Your phone',
  protectionPhoneLine: 'The vault key encrypts every day. It never leaves the phone.',
  protectionYouTitle: 'You',
  protectionYouLine: 'A recovery code of 26 characters, shown once. Keep it away from the phone.',
  protectionEmiLine:
    'No key. So no request to Emi, or to Amazon Web Services, can return one of your days.',

  // The four limits, at the size of everything above them.
  protectionLimitsHeadline: 'What Emi does not defend against.',
  protectionLimitsLine: 'Four limits, stated here and not hidden. Each one says what you can do.',
  protectionLostTitle: 'A lost phone and a lost code',
  protectionLostLine: 'The days are gone. An Emi that could recover them could read them.',
  protectionUnlockedTitle: 'A phone somebody can unlock',
  protectionUnlockedLine: 'They can read the screen. Keep the app lock on. It is on by default.',
  protectionHostileTitle: 'A phone running something hostile',
  protectionHostileLine: 'No app can defend itself from under the system. Keep iOS current.',
  protectionOutsideTitle: 'What the outside learns',
  protectionOutsideLine:
    'With sync, the server learns how many records you keep, and when each one was written.',

  // The privacy policy, from boards/Privacy.dc.html. The App Store asks for this address before it
  // takes the application, and the date at the top is a hole until somebody sets one.
  policyUpdated: 'LAST UPDATED [DATE]',
  policyTitle: 'Privacy policy',
  policyLine: 'We cannot read your records. This page says why.',
  policyNoAccount: 'No account needed',
  policyNoTracking: 'No tracking',
  policyEncrypted: 'Encrypted on your phone',
  policyWhoTitle: 'Who we are',
  policyWhoLine: 'Emi is made by Atlantic Blue Solutions Limited.',
  policyStoresTitle: 'What Emi stores',
  policyStoresLine:
    'Emi stores the dates, symptoms, moods and sex that you log. They stay on your phone. Emi encrypts each day before it writes it, with a key kept in your iPhone keychain.',
  policyHowTheEncryptionWorks: 'How the encryption works ›',
  policyCollectTitle: 'What we collect',
  policyCollectLine:
    'Nothing. There is no account, no analytics, no advertising and no tracking. We cannot read your records.',
  policySharingTitle: 'Sharing',
  policySharingLine:
    'Your records leave your phone only when you export a file. You choose where the file goes.',
  policyRemindersTitle: 'Reminders and Face ID',
  policyRemindersLine:
    'Reminders are scheduled on your phone. No server sends them. iOS handles Face ID, so Emi never sees your face data.',
  policyDeletingTitle: 'Deleting',
  policyDeletingLine:
    'Delete Emi, or use Delete my data in the app. Either one removes everything on the phone.',
  policyChildrenTitle: 'Children',
  policyChildrenLine: 'Emi is not made for children under 13.',
  policyContactTitle: 'Contact and changes',
  policyContactBefore: 'Send privacy questions to',
  policyContactAfter: '. When this policy changes, the date at the top changes.',

  // The band at the top of the page, from boards/Header.dc.html.
  headerHomeLabel: 'Emi home',
  headerMainLabel: 'Main',
  headerEmi: 'Emi',
  headerPrivacy: 'Privacy',
  headerCalculator: 'Calculator',
  headerPulse: 'Pulse',
  headerBuy: 'Buy',
  headerSupport: 'Support',
  headerLanguageLabel: 'Change language',
  headerMenuLabel: 'Open menu',
  headerSignInLabel: 'Sign in',

  // The band at the foot of the page, from boards/Footer.dc.html.
  footerDisclaimer:
    'Emi is not a contraceptive and not a medical device. A forecast is an estimate from your own past cycles. The first month is free with a monthly subscription in the App Store.',
  footerEmiGroup: 'Emi',
  footerAppStore: 'App Store',
  footerBeta: 'Join the beta',
  footerBuyOnTheWeb: 'Buy on the web',
  footerPrivacyGroup: 'Privacy',
  footerHowEmiProtects: 'How Emi protects your data',
  footerOpenCode: 'The open code',
  footerTransparency: 'Transparency report',
  footerLearnGroup: 'Learn',
  footerCalculator: 'Next period calculator',
  footerGuides: 'Guides by phase',
  footerPulse: 'Emi Pulse',
  footerHelpGroup: 'Help',
  footerSupport: 'Support',
  footerCommunity: 'Emi Community',
  footerAccount: 'Your account',
  footerCopyright: 'Copyright 2026 Atlantic Blue Solutions Limited.',
  footerPrivacyPolicy: 'Privacy policy',
  footerTerms: 'Terms',
};
