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
 * of the product, the name of Apple's store, and the name of the person building it.
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

  // The hero, and the ring a reader can move through a cycle.
  heroHeadline: 'Understand your body, safely.',
  heroLine:
    'Emi starts with your cycle: a forecast from your own data, and how sure it is. Then accurate education, and a community where you can ask what people are told not to. Your data is always encrypted.',
  heroPriceLine: 'Free for a month, then £29.99 a month.',
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

  // Who is building it, and why, in his own words.
  noteEyebrow: 'WHY I AM BUILDING EMI',
  noteBody:
    'I have two daughters. I am building Emi so they have a safe place to understand their bodies: accurate information, education on the subjects that are still taboo, and a community to ask without judgement, from a young age. And along the way, to help everyone else who needs the same.',
  founderName: 'Julian Tellez',
  founderRole: 'Founder of Emi',

  // The one promise the whole product rests on.
  privacyHeadline: 'Your data is always encrypted.',
  privacyLink: 'How Emi protects your data ›',

  // One price, and the three ways to pay it.
  priceEyebrow: 'ONE PRICE',
  priceHeadline: '£29.99 a month. The first month is free.',
  priceLine: 'Pay the way that suits you.',
  priceAppStoreNote: 'One month free, then monthly. Cancel in your Apple settings.',
  priceCardTitle: 'Card, on this site',
  priceCardNote: 'Pay here, then sign in on your iPhone.',
  priceStarsTitle: 'Telegram Stars',
  priceStarsNote: 'Pay in the Emi bot, then log in with Telegram.',

  // For a reader who is not ready to install anything.
  tryTitle: 'Not ready to download?',
  tryLine: 'Try the free calculator. Nothing you enter leaves the page.',
  tryLink: 'When is my next period? ›',
  askTitle: 'Questions?',
  askLine: 'We reply in English, Russian and Spanish.',
  askLink: 'Visit support ›',

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
