/**
 * Every word she reads, in English, under a key. Nothing else in the application holds a word: a
 * screen names a key, and this file is the one place the words themselves live.
 *
 * A key whose words change with the number beside them carries one form for each plural category
 * the language uses. English uses two. The lookup takes the count from the caller for that reason
 * and not because English needs it, so a language with four forms costs nothing at the call site.
 *
 * A name inside braces is filled by the caller. The count fills `{count}` wherever it appears.
 *
 * The honesty scan reads this file with every other file the application draws from, so the words
 * are held to the same list here as they were on the screens they came from.
 */
export const english = {
  'calendar.month.april': 'April',
  'calendar.month.august': 'August',
  'calendar.month.december': 'December',
  'calendar.month.february': 'February',
  'calendar.month.january': 'January',
  'calendar.month.july': 'July',
  'calendar.month.june': 'June',
  'calendar.month.march': 'March',
  'calendar.month.may': 'May',
  'calendar.month.november': 'November',
  'calendar.month.october': 'October',
  'calendar.month.september': 'September',
  // English writes a day of the month as an ordinal and Spanish writes it as a plain number, so
  // the suffix is a word like any other. A language that adds none carries the empty string.
  'calendar.ordinal.first': 'st',
  'calendar.ordinal.other': 'th',
  'calendar.ordinal.second': 'nd',
  'calendar.ordinal.third': 'rd',
  'calendar.today': 'Today',
  'calendar.weekday.friday': 'Friday',
  'calendar.weekday.monday': 'Monday',
  'calendar.weekday.saturday': 'Saturday',
  'calendar.weekday.sunday': 'Sunday',
  'calendar.weekday.thursday': 'Thursday',
  'calendar.weekday.tuesday': 'Tuesday',
  'calendar.weekday.wednesday': 'Wednesday',
  'calendar.yesterday': 'Yesterday',

  'cycle.noRing.line': 'The ring needs a period. Log a day you bled and it appears.',
  'cycle.noRing.title': 'Nothing to draw yet',
  'cycle.ring.spoken': 'Day {day} of {length}, {phase}',

  'export.again': 'Make them again',
  'export.back': 'Back',
  'export.cycleCount': { one: '{count} cycle', other: '{count} cycles' },
  'export.dayCount': { one: '{count} day', other: '{count} days' },
  'export.deleted': {
    one: '{days} you deleted is in the data file only.',
    other: '{days} you deleted are in the data file only.',
  },
  'export.document.cycles': 'Cycles',
  'export.document.days': 'Days',
  'export.document.cycleRange': '{from} to {to}',
  'export.document.from': 'From {day}',
  'export.document.instant': '{date} at {time}',
  'export.document.label.firstOpened': 'First opened',
  'export.document.label.length': 'Length',
  'export.document.label.lockOnReturn': 'Lock on return',
  'export.document.label.period': 'Period',
  'export.document.label.predicted': 'Predicted',
  'export.document.label.saved': 'Saved',
  'export.document.label.statedCycleLength': 'Cycle length you stated',
  'export.document.label.temperature': 'Temperature',
  'export.document.label.temperatureUnit': 'Temperature unit',
  'export.document.label.unexpectedBleeding': 'Unexpected bleeding',
  'export.document.label.weight': 'Weight',
  'export.document.label.weightUnit': 'Weight unit',
  'export.document.no': 'No',
  'export.document.nothing': 'Nothing is logged yet.',
  'export.document.predicted': 'predicted',
  'export.document.settings': 'Settings',
  'export.document.taken': 'Taken on {taken}.',
  /**
   * The denial is one of the five sentences the claims gate allows, word for word, because a
   * document that travels to a doctor is the first place somebody reads Emi as a medical opinion.
   */
  'export.document.what': 'This is everything you logged in Emi. Emi is not a medical device.',
  'export.document.title': 'Your record',
  'export.document.yes': 'Yes',
  'export.failed': 'The files could not be written. There may be no room left on the phone.',
  'export.held': '{days} and {cycles}.',
  'export.make': 'Make the files',
  'export.making': 'Making them',
  'export.share': 'Share',
  'export.title': 'Export',
  'export.what':
    'Two files. One you can read and give to a doctor, one another application can read.',
  'export.where':
    'Nothing is sent anywhere. The files are made on this phone and you choose who gets them.',

  'forecast.confidence.high': 'High',
  'forecast.confidence.low': 'Low',
  'forecast.confidence.medium': 'Medium',
  'forecast.confidence.sentence': '{word} confidence, from your last {cycles} cycles',
  'forecast.cycleMoves': 'Your cycle moves, so the range is wider.',
  'forecast.cyclesWanted': {
    one: 'Emi needs {count} more complete cycle before it forecasts.',
    other: 'Emi needs {count} more complete cycles before it forecasts.',
  },
  'forecast.fertileWindow': 'Fertile window',
  /**
   * Both sentences are one string because the wording check reads a denial only where a full stop
   * comes before it, and a string literal on its own puts a quotation mark there instead.
   */
  'forecast.fertileWindow.sentence':
    'An estimate from your last {cycles} cycles. Emi never says a day is safe, because no day is.',
  'forecast.nextPeriod': 'Next period',
  'forecast.range.sameMonth': 'Between the {from} and the {to} of {month}',
  'forecast.range.spansMonths': 'Between the {from} of {fromMonth} and the {to} of {toMonth}',
  'forecast.range.spansYears':
    'Between the {from} of {fromMonth} {fromYear} and the {to} of {toMonth} {toYear}',
  'forecast.statedLength':
    'Until then Emi counts a cycle of {days} days, the length you gave at the first run.',
  'forecast.stillLearning': 'Still learning',

  'history.back': 'Back',
  'history.cycleDayCount': { one: '{count} day', other: '{count} days' },
  'history.cycleFrom': 'From {day}',
  'history.cycleLengthAndPeriod': '{length}, {periodDays} of them bleeding',
  'history.cycleRange': '{from} to {to}',
  'history.cycles': 'Your cycles',
  'history.dayReads': 'the {ordinal} of {month}',
  'history.noCycles': 'No cycle is recorded yet. Log a day you bled and this fills in.',
  'history.nothingRepeats': 'Nothing has come back in 3 cycles yet.',
  'history.pattern.cycleDay': 'About day {day} of your cycle',
  'history.pattern.evidence': 'in {withIt} of your last {read} cycles',
  'history.pattern.line': '{when}, {evidence}',
  'history.pattern.beforePeriod': 'About {days} before your period',
  'history.patternsWaiting': {
    one: 'Emi names a symptom once it has come back in {needs} cycles. {count} of yours is complete.',
    other:
      'Emi names a symptom once it has come back in {needs} cycles. {count} of yours are complete.',
  },
  'history.patterns': 'What comes back',
  'history.running': 'Still running',
  'history.runningWithPeriod': '{running}, {periodDays} of bleeding so far',
  'history.title': 'History',

  // The line a woman who asked for a record for her doctor reads. It names her own answer back
  // to her, and it says what the press does rather than saying what the record is for.
  'home.doctorRecord': 'You asked for a record for your doctor. Open the export.',
  'home.export': 'Export',
  'home.greeting': 'Hello, {name}',
  'home.history': 'History',
  'home.logToday': 'Log today',
  // The line a woman who said her period is hard reads on a day inside it. It names her own
  // answer back to her and offers the one group she is most likely to want, and it says what the
  // press does rather than saying anything about how she must feel.
  'home.painLine': 'You said these days are hard. Log the pain first.',
  'home.settings': 'Settings',
  'home.wordmark': 'Emi',

  'lock.cancel': 'Cancel',
  /**
   * The cover carries the wordmark and nothing else. A cover that named the screen underneath it,
   * even as a heading, would put a word about her body into the picture the operating system keeps.
   */
  'lock.cover.wordmark': 'emi',
  'lock.locked.action': 'Unlock',
  'lock.locked.line': 'Unlock with your face, your fingerprint or your passcode.',
  'lock.locked.refused': 'Emi is still locked. Press Unlock to try again.',
  'lock.locked.title': 'Emi is locked.',
  'lock.locked.wordmark': 'emi',
  /** What the platform prompt says. The platform draws it, so Emi writes only this line. */
  'lock.prompt': 'Unlock Emi',

  'log.day.notADay.line': 'That address does not name a day in the calendar.',
  'log.day.notADay.title': 'Not a day',
  'log.day.notYet.line': 'That day has not happened. You can log today and any day behind it.',
  'log.day.notYet.title': 'Not yet',
  'log.day.back': 'Back',
  'log.energy.heading': 'Energy, one to five',
  'log.energy.level': 'Level {level}',
  'log.energy.name.1': 'Very low',
  'log.energy.name.2': 'Low',
  'log.energy.name.3': 'Steady',
  'log.energy.name.4': 'Good',
  'log.energy.name.5': 'High',
  'log.energy.nothingChosen': 'Not logged',
  'log.energy.hint': 'Press the one you chose again to clear it',
  'log.flow.done': 'Done',
  'log.flow.heavy': 'Heavy',
  'log.flow.light': 'Light',
  'log.flow.medium': 'Medium',
  'log.flow.none': 'None',
  'log.flow.saved': 'Saved on this phone.',
  'log.flow.spotting': 'Spotting',
  'log.flow.title': 'Your flow',
  'log.group.digestion': 'Digestion',
  'log.group.energy': 'Energy',
  'log.group.head': 'Head',
  'log.group.libido': 'Libido',
  'log.group.mood': 'Mood',
  'log.group.pain': 'Pain',
  'log.group.skin': 'Skin and hair',
  'log.group.sleep': 'Sleep',
  'log.sheet.found': { one: '{count} found', other: '{count} found' },
  'log.sheet.noMatch': 'No symptom matches {query}',
  'log.sheet.picked': { one: '{count} picked', other: '{count} picked' },
  'log.sheet.save': 'Save',
  'log.sheet.saved': 'Saved',
  'log.sheet.search': 'Search symptoms',
  'log.temperature.heading': 'Waking temperature',
  'log.temperature.hint': 'Before you get up',
  /** The brand brief's own line, word for word. */
  'log.unexpected.invitation': 'Not your period? Log it. Emi will track the pattern.',
  'log.unexpected.mark': 'Not my period',
  /** What her mark did, said as the arithmetic behaves rather than as a reassurance. */
  'log.unexpected.marked': 'Kept in your record. Emi counts no cycle from this day.',
  'log.weight.heading': 'Weight',
  'log.weight.hint': 'One number a day',

  'onboarding.back': 'Back',
  'onboarding.birthYear.action': 'Continue',
  'onboarding.birthYear.line.sealed': 'Emi encrypts this on the phone before it goes anywhere.',
  'onboarding.birthYear.title': 'What year were you born?',
  'onboarding.birthYear.year': 'Born in {year}',
  'onboarding.cycleLength.action': 'Done',
  // The stepper runs from 21 to 45, so the count never reaches one and the screen said days
  // whatever she set. Moving the words kept it that way.
  'onboarding.cycleLength.days': '{count} days',
  'onboarding.cycleLength.line.count':
    'Count the first day of one period to the day before the next.',
  'onboarding.cycleLength.line.corrects':
    'Emi replaces this with your own number once it has seen two cycles.',
  'onboarding.cycleLength.longer': 'One day longer',
  'onboarding.cycleLength.shorter': 'One day shorter',
  'onboarding.cycleLength.title': 'How long is your cycle, roughly?',
  'onboarding.feeling.action': 'Continue',
  'onboarding.feeling.choice.fine': 'I am fine with it',
  'onboarding.feeling.choice.hard': 'It is hard, most months',
  'onboarding.feeling.choice.understand': 'I want to understand it',
  'onboarding.feeling.line.encrypted': 'Encrypted on this phone.',
  'onboarding.feeling.line.talks': 'This changes how Emi talks to you, and nothing else.',
  'onboarding.feeling.title': 'How you feel about it',
  'onboarding.focus.action': 'Continue',
  'onboarding.focus.line.first': 'Emi puts these first when you log a day.',
  'onboarding.focus.title': 'Which of these change with your cycle?',
  'onboarding.goals.action': 'Continue',
  'onboarding.goals.choice.doctorRecord': 'Keep a record for my doctor',
  'onboarding.goals.choice.fertileWindow': 'See my fertile window, as an estimate',
  'onboarding.goals.choice.forecast': 'Know when my period comes',
  'onboarding.goals.choice.symptoms': 'Understand my symptoms',
  'onboarding.goals.line.chooseAll': 'Choose all that apply.',
  'onboarding.goals.line.encrypted':
    'Emi encrypts your answers on this phone. Nobody else can read them.',
  'onboarding.goals.title': 'What do you want Emi to help with?',
  'onboarding.hold.action': 'Hold to begin',
  'onboarding.hold.held': 'Holding',
  'onboarding.hold.instruction': 'Press and hold the ring to begin.',
  // What she reads when the write refuses. It says nothing was kept, because nothing was: the
  // day, the answers and the marker go in one transaction or none of them do.
  'onboarding.hold.refused': 'Emi kept nothing. Press and hold the ring again.',
  // The copy review of screen 19 wrote this line, in place of the export's claim about an enclave.
  // It is true only because the hold is the one moment the first run writes.
  'onboarding.hold.sealed':
    "Holding the ring saves your answers, sealed with your key. Emi makes the key and keeps it in this phone's keychain.",
  'onboarding.hold.title': 'Your cycle, your data, your key.',
  'onboarding.lastPeriod.action': 'Continue',
  'onboarding.lastPeriod.earlier': 'Earlier',
  'onboarding.lastPeriod.earlierMonth': 'Earlier month',
  'onboarding.lastPeriod.later': 'Later',
  'onboarding.lastPeriod.laterMonth': 'Later month',
  'onboarding.lastPeriod.line.privacy': 'Emi encrypts this on the phone before it goes anywhere.',
  'onboarding.lastPeriod.line.remember':
    'The first day you bled. The nearest day you remember is close enough.',
  'onboarding.lastPeriod.title': 'When did your last period start?',
  'onboarding.name.action': 'Continue',
  'onboarding.name.hint': 'A first name, or nothing',
  'onboarding.name.label': 'Your name',
  'onboarding.name.line.greets': 'Emi greets you by it. Nothing else uses it.',
  'onboarding.name.line.sealed': 'Emi encrypts this on the phone before it goes anywhere.',
  'onboarding.name.title': 'What should Emi call you?',
  'onboarding.name.tooLong': {
    one: 'A name holds at most {count} character.',
    other: 'A name holds at most {count} characters.',
  },
  'onboarding.periodBefore.action': 'Add it',
  'onboarding.periodBefore.between': {
    one: '{count} day between them',
    other: '{count} days between them',
  },
  'onboarding.periodBefore.line.remember': 'Do you remember when the period before that started?',
  'onboarding.periodBefore.line.surer': 'Each one you add makes the first forecast surer.',
  'onboarding.periodBefore.outOfRange':
    'A cycle runs from {minimum} to {maximum} days. Pick a day in that range.',
  'onboarding.periodBefore.skip': 'I do not remember',
  'onboarding.periodBefore.title': 'The period before',
  'onboarding.periodLength.action': 'Done',
  'onboarding.periodLength.days': {
    one: '{count} day',
    other: '{count} days',
  },
  'onboarding.periodLength.line.count': 'From the first day of bleeding until it stops.',
  'onboarding.periodLength.line.logged': 'Emi uses the days you log instead, once you log them.',
  'onboarding.periodLength.longer': 'One day longer',
  'onboarding.periodLength.shorter': 'One day shorter',
  'onboarding.periodLength.skip': 'I am not sure',
  'onboarding.periodLength.title': 'How many days does your period usually last?',
  'onboarding.regularity.action': 'Continue',
  'onboarding.regularity.choice.moves': 'No, it moves',
  'onboarding.regularity.choice.regular': 'Yes, most months',
  'onboarding.regularity.choice.unknown': 'I do not know yet',
  'onboarding.regularity.line.explains': 'This only changes how Emi explains your forecast.',
  'onboarding.regularity.title': 'Regular',
  'onboarding.skip': 'Skip',
  'onboarding.step': 'Step {step} of {of}',
  'onboarding.today.action': 'Save today',
  'onboarding.today.choice.bloating': 'Bloating',
  'onboarding.today.choice.calm': 'Calm',
  'onboarding.today.choice.cramps': 'Cramps',
  'onboarding.today.choice.fatigue': 'Tired',
  'onboarding.today.choice.headache': 'Headache',
  'onboarding.today.choice.low-mood': 'Low',
  'onboarding.today.line.encrypted': 'Emi encrypts it on this phone.',
  'onboarding.today.line.skip': 'You can skip this.',
  'onboarding.today.skip': 'Nothing to add',
  'onboarding.today.title': 'Today',
  'onboarding.tour.back': 'Back',
  'onboarding.tour.count': '{step} of {of}',
  'onboarding.tour.range.action': 'Next',
  'onboarding.tour.range.line.arithmetic':
    'This is arithmetic on your own records. Emi is not a contraceptive. Emi is not a medical device.',
  'onboarding.tour.range.line.confidence':
    'Beside the range it writes high, medium or low confidence, and how many of your own cycles it counted.',
  'onboarding.tour.range.line.learning':
    'Emi needs 2 complete cycles before it forecasts. Until then it says it is still learning, and counts by the cycle length you give it.',
  'onboarding.tour.range.line.range':
    'Emi says your next period falls between two days. It never names one day, because a day it names is a day it can get wrong.',
  'onboarding.tour.range.title': 'A range, and how sure Emi is.',
  'onboarding.tour.records.action': 'Next',
  'onboarding.tour.records.line.log':
    'Log flow, mood, energy, temperature, weight and more than 70 symptoms, in one sheet.',
  'onboarding.tour.records.line.patterns':
    'After six cycles Emi names the symptoms that came back at the same point in 3 of them or more. A symptom you logged once is not a pattern, and Emi does not call it one.',
  'onboarding.tour.records.title': 'What you write, read back to you.',
  'onboarding.tour.ring.action': 'Next',
  'onboarding.tour.ring.line.arcs':
    'Four arcs divide the ring: the days you bleed, the days after them, the days around ovulation, and the days before your next period.',
  'onboarding.tour.ring.line.ring':
    'The ring is your cycle. A bead marks today, and the number inside it is the day you are on.',
  'onboarding.tour.ring.title': 'Your cycle, in one ring.',
  'onboarding.tour.skip': 'Skip',
  'onboarding.tour.yours.action': 'Continue',
  'onboarding.tour.yours.line.encrypted':
    'Every day you log is encrypted on this phone, with a key that never leaves it. The server holds the result and cannot read one day of it.',
  'onboarding.tour.yours.line.price':
    'One month free, then 29.99 pounds a year. There is no free version, because a free version is paid for with your data.',
  'onboarding.tour.yours.line.recovery':
    'A recovery code you keep brings your history to a new phone. Nobody at Emi can open your history, so nobody at Emi can hand it to anybody.',
  'onboarding.tour.yours.title': 'Yours, and it stays yours.',
  'onboarding.welcome.action': 'Continue',
  'onboarding.welcome.line.noAccount':
    'There is no account. Emi never asks for your email address or a password.',
  'onboarding.welcome.line.nothingSent':
    'Your cycle is worked out on this phone. Nothing is sent anywhere.',
  'onboarding.welcome.line.showsYou':
    'Emi shows you what your own records say, and nothing more. Emi is not a contraceptive. Emi is not a medical device.',
  'onboarding.welcome.title': 'Emi learns your cycle. You keep your data.',

  'recovery.before.action': 'Show my code',
  'recovery.before.line.nobody':
    'Nobody at Emi can recover it for you. An Emi that could recover your code would be an Emi that could read your days.',
  'recovery.before.line.onlyWay':
    'Emi is about to show you a recovery code. It is the only way back to your cycles if you lose this phone.',
  'recovery.before.line.paper':
    'Write it on paper. Keep the paper where you keep other paper that matters.',
  'recovery.before.title': 'Your data is locked to this phone',
  'recovery.code.action': 'I have written it down',
  'recovery.code.line.once': '{count} characters. Emi shows them once and stores them nowhere.',
  'recovery.code.line.writeDown':
    'Write them down now. The next screen asks you to type them back.',
  'recovery.code.title': 'Your recovery code',
  'recovery.confirm.action': 'Done',
  'recovery.confirm.label': 'Your {count} character recovery code',
  'recovery.confirm.line.checks': 'Emi checks what you type against the code it showed you.',
  'recovery.confirm.line.case':
    'Emi reads upper case and lower case the same way, and ignores the spaces you put in.',
  'recovery.confirm.title': 'Type the code back',
  'recovery.confirm.wrong':
    'That is not the code Emi showed you. Read it off the paper and type it again.',
  'recovery.step': 'Step {step} of {of}',

  'settings.delete.action': 'Delete everything',
  'settings.delete.back': 'Back',
  'settings.delete.goes.account': 'Your account on the server, and every day it holds',
  'settings.delete.goes.cycles': 'The cycles Emi worked out from them',
  'settings.delete.goes.days': 'Every day you logged on this phone',
  'settings.delete.goes.key': 'The key that opens any of it',
  'settings.delete.goes.settings': 'Your settings',
  'settings.delete.line':
    'One press and it is gone. There is no undo, no waiting period, and nobody at Emi can bring it back, because nobody at Emi can read it.',
  'settings.delete.refused':
    'Your days are gone. This phone would not let go of one thing Emi keeps in the keychain. Press again.',
  'settings.delete.title': 'Delete everything',
  'settings.delete.working': 'Deleting',
  'settings.deleted.action': 'Start again',
  'settings.deleted.line': 'This phone holds nothing about you. Emi starts from an empty ring.',
  'settings.deleted.title': 'It is gone.',
  'settings.deleted.withoutTheServer':
    'Emi could not reach the server to take your account off it. Nothing can open what is up there now: the only key was on this phone, and it went with your days.',
  'settings.settings.back': 'Back',
  'settings.settings.delete': 'Delete everything',
  'settings.settings.title': 'Settings',
  'tab.insights': 'Insights',
  'tab.log': 'Log',
  'tab.privacy': 'Privacy',
  'tab.today': 'Today',
} as const;
