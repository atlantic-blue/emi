/**
 * Every word the site draws in English, under a name. Nothing else on the site holds a word.
 *
 * The page is the board `docs/design/website/home-v2/boards/MainV2.dc.html`, so every sentence
 * here is the board's own sentence. A word that reads oddly reads that way on the canvas too, and
 * the canvas is where it changes.
 *
 * Some of these sentences are written elsewhere first and copied here, and a test reads the copy
 * against the original so the two cannot drift. The price is the application's own line, because a
 * reader who meets Emi here and buys it there must be told the same number twice. The two denials
 * are approved sentences of the honesty gate, word for word, and they are also the sentences the
 * approved board draws. The forecast card says how sure Emi is, and names a month and a day of a
 * month, in the application's own words, because the card is a picture of the home screen.
 *
 * The brand line stays in English in all three languages: it says what the four letters of the
 * name stand for, and a translation of it would name something Emi is not called. So do the name
 * of the product and the name of Apple's store.
 *
 * The board leaves a hole for a review nobody has written yet. Those sit in
 * `lib/thePlaceholders.ts` rather than here: a hole is not a word of the product, and it reads the
 * same in every language until the text that fills it arrives.
 *
 * `{day}` and `{phase}` are filled by the ring, and the holes of the forecast card are filled by
 * the day she opens the page. Those two are the parts of the page that change while she reads it.
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
    'Emi starts with your cycle: a forecast from your own data, and how sure it is. Then accurate education, and a community where you can ask what people are told not to. Your records are encrypted on your phone.',
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
  cycleNextRange: 'Between the {from} and the {to} of {month}',
  cycleNextRangeAcrossMonths: 'Between the {from} of {fromMonth} and the {to} of {toMonth}',
  cycleNextConfidence: 'Based on your last 6 cycles',
  cycleDenial: 'Emi is not a contraceptive and not a medical device.',

  // The twelve months and the four endings a day of a month takes, which the card above is
  // written out of. They are the application's own words, read against its catalogue by a test,
  // so the window on this page and the window on her home screen are said the same way.
  //
  // An ending is held as the whole day rather than as the letters after it, because Russian and
  // Spanish add nothing to the number and a word of this site is never empty.
  cycleMonthJanuary: 'January',
  cycleMonthFebruary: 'February',
  cycleMonthMarch: 'March',
  cycleMonthApril: 'April',
  cycleMonthMay: 'May',
  cycleMonthJune: 'June',
  cycleMonthJuly: 'July',
  cycleMonthAugust: 'August',
  cycleMonthSeptember: 'September',
  cycleMonthOctober: 'October',
  cycleMonthNovember: 'November',
  cycleMonthDecember: 'December',
  cycleDayFirst: '{day}st',
  cycleDaySecond: '{day}nd',
  cycleDayThird: '{day}rd',
  cycleDayOther: '{day}th',

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
  privacyHeadline: 'Your records are encrypted on your phone.',
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

  // The rest of the page is about her records, and the product holds three other things. A reader
  // who meets them for the first time in the policy has been told half the answer on the page that
  // promised to tell her all of it. Each fact here is one the policy states, and the press goes to
  // the policy, because that is where the detail belongs.
  protectionAlsoBefore:
    'Emi also has an optional account, takes payments, and sends anonymous crash and usage reports only if you switch them on. Read',
  protectionAlsoPolicy: 'the privacy policy',
  protectionAlsoAfter: ' to see what each one holds and why.',
  protectionScreenAlt:
    'The Privacy screen in Emi. It says: Only you can read your days. Encrypted on this phone, with a key only you hold.',

  // What happens to one day, in the order it happens in.
  protectionDayHeadline: 'What happens to one day.',
  protectionLogTitle: 'You log a day.',
  protectionLogLine: 'Period, symptoms, mood or sex.',
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
  protectionLostTitle: 'A lost phone',
  protectionLostLine:
    'Nothing restores it yet, so the days go with the phone. Use Download data in Emi to keep a copy.',
  protectionUnlockedTitle: 'A phone somebody can unlock',
  protectionUnlockedLine: 'They can read the screen. Keep the app lock on. It is on by default.',
  protectionHostileTitle: 'A phone running something hostile',
  protectionHostileLine: 'No app can defend itself from under the system. Keep iOS current.',
  protectionOutsideTitle: 'What the outside learns',
  protectionOutsideLine:
    'With sync, the server learns how many records you keep, and when each one was written.',

  // The privacy policy, from boards/Privacy.dc.html, grown to cover what version 1 adds: an
  // optional account, the payments that need it, and the anonymous usage she can switch on. The
  // board was drawn before any of those existed, so the words below are the policy and the board
  // is the layout.
  //
  // Three answers on this page are holes rather than words, because nobody has chosen the card
  // processor, written the retention or named the legal basis. They sit in lib/thePlaceholders.ts,
  // where a hole is read the same in all three languages.
  policyUpdated: 'LAST UPDATED 4 NOVEMBER 2026',
  policyTitle: 'Privacy policy',
  policyLine: 'We cannot read your records. This page says why.',
  policyAccountOptional: 'Account is optional',
  policyUsageOptional: 'Anonymous usage, only if you agree',
  policyEncrypted: 'Encrypted on your phone',
  policyWhoTitle: 'Who we are',
  policyWhoLine: 'Emi is made by Atlantic Blue Solutions Limited.',
  policyStoresTitle: 'What Emi stores',
  policyStoresLine:
    'Emi stores the dates, symptoms, moods and sex that you log. They stay on your phone. Emi encrypts each day before it writes it, with a key kept in your iPhone keychain.',
  policyHowTheEncryptionWorks: 'How the encryption works ›',
  policyCollectTitle: 'What we collect',
  policyCollectLine:
    'Emi cannot read your records. Your account only knows what you paid for. Anything else is anonymous and optional.',
  policyAccountTitle: 'Your account',
  policyAccountLine:
    'Your account holds a hashed identifier, how you sign in, and what you paid for. Amazon Web Services keeps it, in Amazon Cognito. It lets you pay on the web or with Telegram Stars. It lets you restore your purchases on a new phone. It lets you manage your subscription. It never holds health data. It is optional: Emi works without it.',
  policyPaymentsTitle: 'Payments',
  policyPaymentsAppleLine: 'In the App Store, Apple takes the payment.',
  policyPaymentsTelegramLine: 'With Telegram Stars, Telegram takes the payment.',
  policyPaymentsWebBefore: 'On the web,',
  policyPaymentsWebAfter: 'takes the payment.',
  policyUsageTitle: 'Anonymous usage and crash reports',
  policyUsageLine:
    'Emi can send event names and crash reports to Sentry and TelemetryDeck. Both are hosted in the European Union. They are not linked to you and they carry no health values. Emi sends them only if you switch them on. They exist so we can fix crashes, count users and learn which guides help.',
  policyProcessorsTitle: 'Who processes data for us',
  policyProcessorsApple: 'takes the payment in the App Store.',
  policyProcessorsAmazon: 'keeps your account.',
  policyProcessorsTelegram: 'takes the payment with Telegram Stars.',
  policyProcessorsCard: 'takes the payment on the web.',
  policyProcessorsSentry: 'receives crash reports.',
  policyProcessorsTelemetry: 'receives event names.',
  policyRetentionTitle: 'How long we keep it',
  policyRightsTitle: 'Your rights',
  policyRightsBefore:
    'You can ask for your data, ask us to delete it, and withdraw your consent at any time. Write to',
  policyLegalBasisTitle: 'Legal basis',
  policySharingTitle: 'Sharing',
  policySharingLine:
    'Your records leave your phone only when you export a file. You choose where the file goes.',
  policyRemindersTitle: 'Reminders and Face ID',
  policyRemindersLine:
    'Reminders are scheduled on your phone. No server sends them. iOS handles Face ID, so Emi never sees your face data.',
  policyDeletingTitle: 'Deleting',
  policyDeletingLine:
    'Delete Emi, or use Delete my data in the app. Either one removes everything on the phone.',
  policyDeletingAccountBefore:
    'Deleting Emi does not delete your account. To delete your account, write to',
  policyChildrenTitle: 'Children',
  policyChildrenLine: 'Emi is not made for children under 13.',
  policyContactTitle: 'Contact and changes',
  policyContactBefore: 'Send privacy questions to',
  policyContactAfter: '. When this policy changes, the date at the top changes.',

  // The support page, from boards/Support.dc.html. Four parts of that board describe a product
  // that does not exist yet, so the page answers four of its questions differently.
  //
  // The board answers the first question with "Only with your recovery code". Sync and restore
  // are designed and are not built, so the answer below says what a lost phone costs today. The
  // answer about deleting says what deleting the application takes and what it leaves, because
  // the key is kept in the keychain on purpose and the keychain outlives the application. The
  // card about a subscription is not drawn and the answer about cancelling keeps only its first
  // sentence, because the account page does not exist yet.
  //
  // The words of the card nobody draws stay here, in all three languages, so the card comes back
  // with one edit on the day that page ships.
  supportTitle: 'Emi Support',
  supportSearch: 'Search support',
  supportNothingFound: 'Nothing found.',
  supportNothingFoundAfter: 'and we reply in English, Russian or Spanish.',
  supportCannotLookUp:
    'We cannot see your records, so we cannot look up your account. Tell us what you see on the screen.',
  supportEmailUs: 'Email us',
  supportEmailUsLine: 'In English, Russian or Spanish',
  supportCommunity: 'Emi Community',
  supportCommunityLine: 'Ask other people, on Telegram',
  supportBeta: 'The beta',
  supportBetaLine: 'Try the next version on TestFlight',
  supportSubscription: 'Subscription',
  supportSubscriptionLine: 'Renew, cancel or get a receipt',
  supportQuestionsHeadline: 'Common questions.',
  supportLostPhoneQuestion: 'I lost my phone. Can you restore my records?',
  supportLostPhoneAnswer:
    'No. Sync is designed and not built yet, so your days live on that phone and nowhere else. What survives it is the file you saved yourself, with Download data.',
  supportLearningQuestion: 'Why does Emi say it is still learning?',
  supportLearningAnswer:
    'Emi needs 2 complete cycles before it forecasts. Until then it counts by the cycle length you give it.',
  supportDeleteQuestion: 'How do I delete everything?',
  supportDeleteAnswer:
    'Open Privacy in the app and choose Delete data. That removes every day, every answer and the key. Deleting the app takes your days with it and leaves the key in your iPhone keychain.',
  supportCancelQuestion: 'How do I cancel my subscription?',
  supportCancelAnswer: 'If you paid in the App Store, cancel in your Apple account settings.',

  // The sign in page, from boards/SignIn.dc.html and boards/SignInCode.dc.html, and the head of
  // the account page, from boards/Profile.dc.html.
  //
  // The board offers four ways in. Three of them need a credential only a person can make, and
  // step 28.3 makes them, so the page draws the code and holds the other three back. Their words
  // stay here, in all three languages, so each press comes back with one edit on the day its
  // credential exists.
  //
  // Nothing the page says names the address she typed as known or new. The pool answers the same
  // way for both, and a page that said which would let anybody test who uses Emi.
  signInTitle: 'Sign in to Emi',
  signInLine: 'Use the same way you signed in on your iPhone.',
  signInApple: 'Sign in with Apple',
  signInGoogle: 'Sign in with Google',
  signInTelegram: 'Log in with Telegram',
  signInOr: 'or',
  signInAddressLabel: 'Email',
  signInSendCode: 'Send code',
  signInWeSendACode: 'We send a code to this address.',
  signInNoAccountNeeded:
    'You do not need an account to use Emi. Sign in only to pay on this site or to manage your subscription.',
  signInWhatTheAccountHolds:
    'The account holds an id, how you sign in and what you paid for. It never holds your days or the key to them.',
  signInCodeSentTo: 'We sent a code to {address}.',
  signInCodeLabel: 'Code',
  signInCodeSubmit: 'Sign in',
  signInCodeLasts: 'The code works for 15 minutes.',
  signInSendANewCode: 'Send a new code ›',
  signInUseAnotherAddress: 'Use another address ›',
  signInNeedsAnAddress: 'Type your email address first.',
  signInNeedsTheCode: 'Type the code from the email.',
  signInAnotherCodeIsOnItsWay: 'Check your email again, then type the newest code.',
  signInCodeIsWrong: 'That code is not right. Check it and type it again.',
  signInCodeHasExpired: 'That code has expired. Send a new one.',
  signInTooManyTries: 'Too many tries. Wait a few minutes, then send a new code.',
  signInAddressUsesGoogleOrApple:
    'You have already used this address to sign in with Google or Apple.',
  signInNothingReached: 'Your browser could not reach Emi. Check the connection and try again.',
  signInSending: 'Sending a code…',
  signInChecking: 'Checking the code…',
  signInCouldNotStart:
    'Emi could not start that sign in. Try again, or ask for a code with the box below.',
  returningTitle: 'Signing you in',
  returningWait: 'One moment. Emi is finishing your sign in.',
  returningDidNotFinish: 'That sign in did not finish. Open the sign in page and press again.',
  returningTryAgain: 'Back to sign in ›',
  accountTitle: 'Account',
  accountRecordsStayOnYourPhone: 'Your records stay on your phone, so they are not here.',
  accountSignOut: 'Sign out',

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
