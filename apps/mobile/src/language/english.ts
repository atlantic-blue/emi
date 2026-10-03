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
  'calendar.daySheet.andLogged': '{said}. {logged}',
  'calendar.daySheet.cycleDay': 'Day {day}, {phase}',
  'calendar.daySheet.day': 'The {date} of {month}',
  'calendar.editPeriod.aDay': 'the {date}',
  'calendar.editPeriod.added': 'Added {days}.',
  'calendar.editPeriod.addedDay': 'Added',
  'calendar.editPeriod.back': 'Back',
  'calendar.editPeriod.bothChanges': '{added} {removed}',
  'calendar.editPeriod.cancel': 'Cancel',
  'calendar.editPeriod.lead': {
    one: 'Tap the days you bled. You have {count} day marked, from {date}.',
    other: 'Tap the days you bled. You have {count} days marked, from {date}.',
  },
  'calendar.editPeriod.leadWithNoDay': 'Tap the days you bled. Nothing is marked this month yet.',
  'calendar.editPeriod.noDayLeft': 'A period needs at least one day. Tap a day you bled.',
  'calendar.editPeriod.nothingChanged': 'Nothing to save yet.',
  'calendar.editPeriod.removed': 'Removed {days}.',
  'calendar.editPeriod.save': 'Save',
  'calendar.editPeriod.takenOffDay': 'Taken off',
  'calendar.editPeriod.title': 'Edit my period',
  'calendar.legend.fertile': 'Fertile',
  'calendar.legend.period': 'Period',
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
  'calendar.screen.back': 'Back',
  'calendar.screen.earlier': 'Earlier',
  'calendar.screen.earlierMonth': 'Earlier month',
  'calendar.screen.editPeriod': 'Edit my period',
  'calendar.screen.later': 'Later',
  'calendar.screen.laterMonth': 'Later month',
  'calendar.today': 'Today',
  'calendar.weekday.friday': 'Friday',
  'calendar.weekday.monday': 'Monday',
  'calendar.weekday.saturday': 'Saturday',
  'calendar.weekday.sunday': 'Sunday',
  'calendar.weekday.thursday': 'Thursday',
  'calendar.weekday.tuesday': 'Tuesday',
  'calendar.weekday.wednesday': 'Wednesday',
  'calendar.yesterday': 'Yesterday',

  'cycle.day.bled': 'you bled',
  'cycle.day.cycleDay': 'cycle day {cycle}',
  'cycle.day.expected': 'your period is expected',
  'cycle.day.notYet': 'not yet, this day has not happened',
  'cycle.figures.back': 'Back',
  'cycle.figures.cycleLength': 'Cycle length',
  'cycle.figures.cycleLengthVariation': 'Cycle length variation',
  'cycle.figures.periodDuration': 'Period length',
  'cycle.figures.printed': 'A paper is named here as its journal prints it.',
  'cycle.figures.quoted':
    "Each figure is quoted in the paper's own words, so you can check it for yourself.",
  'cycle.figures.title': 'Where these figures come from',
  'cycle.noRing.line': 'Log a day you bled and your cycle appears here.',
  'cycle.noRing.title': 'Your ring is waiting',
  'cycle.phaseLine.day': 'Day {day}',
  'cycle.phaseLine.follicular': {
    one: 'Follicular phase, a cycle of {count} day',
    other: 'Follicular phase, a cycle of {count} days',
  },
  'cycle.phaseLine.luteal': {
    one: 'Luteal phase, a cycle of {count} day',
    other: 'Luteal phase, a cycle of {count} days',
  },
  'cycle.phaseLine.ovulation': {
    one: 'Ovulation phase, a cycle of {count} day',
    other: 'Ovulation phase, a cycle of {count} days',
  },
  'cycle.phaseLine.period': 'Your period, day {day} of about {days}',
  'cycle.ring.of': 'of {length}',
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
  'export.failed': "We couldn't save the files. Your phone may be out of space.",
  'export.held': '{days} and {cycles}.',
  'export.make': 'Make the files',
  'export.making': 'Making them',
  'export.share': 'Share',
  'export.title': 'Export',
  'export.what':
    'Two files: one you can read or give to your doctor, and one another app can open.',
  'export.where':
    'Nothing is sent anywhere. The files are made on this phone, and you decide who gets them.',

  'forecast.confidence.high': 'High',
  'forecast.confidence.low': 'Low',
  'forecast.confidence.medium': 'Medium',
  'forecast.confidence.sentence': '{word} confidence, based on your last {cycles} cycles',
  'forecast.cycleMoves': 'Your cycle moves around, so the range is wider.',
  'forecast.cyclesWanted': {
    one: 'We need {count} more full cycle before we can say how sure we are.',
    other: 'We need {count} more full cycles before we can say how sure we are.',
  },
  'forecast.fertileWindow': 'Fertile window',
  /**
   * Both sentences are one string because the wording check reads a denial only where a full stop
   * comes before it, and a string literal on its own puts a quotation mark there instead.
   */
  'forecast.fertileWindow.sentence':
    'An estimate based on your last {cycles} cycles. Emi never says a day is safe, because no day is.',
  'forecast.nextPeriod': 'Your next period',
  'forecast.range.sameMonth': 'Between the {from} and the {to} of {month}',
  'forecast.range.spansMonths': 'Between the {from} of {fromMonth} and the {to} of {toMonth}',
  'forecast.range.spansYears':
    'Between the {from} of {fromMonth} {fromYear} and the {to} of {toMonth} {toYear}',
  'forecast.statedLength': "Until then, we're using the {days} day cycle you told us about.",
  'forecast.stillLearning': 'Still getting to know you',

  'history.back': 'Back',
  'history.cycleDayCount': { one: '{count} day', other: '{count} days' },
  'history.cycleFrom': 'From {day}',
  'history.cycleLengthAndPeriod': '{length}, {periodDays} of them bleeding',
  'history.cycleRange': '{from} to {to}',
  'history.cycles': 'Your cycles',
  'history.dayReads': 'the {ordinal} of {month}',
  'history.noCycles': 'No cycles yet. Log a day you bled and this fills in.',
  'history.nothingRepeats':
    "Nothing has come back in 3 cycles yet. Keep logging and we'll show you.",
  'history.pattern.cycleDay': 'About day {day} of your cycle',
  'history.pattern.evidence': 'in {withIt} of your last {read} cycles',
  'history.pattern.line': '{when}, {evidence}',
  'history.pattern.beforePeriod': 'About {days} before your period',
  'history.patternsComplete': {
    one: '{count} of yours is complete.',
    other: '{count} of yours are complete.',
  },
  'history.patternsNeed': "We'll point out a symptom once it's come back in {needs} cycles.",
  'history.patterns': 'What comes back',
  'history.running': 'Still running',
  'history.runningWithPeriod': '{running}, {periodDays} of bleeding so far',
  'history.title': 'History',

  // The line a woman who asked for a record for her doctor reads. It names her own answer back
  // to her, and it says what the press does rather than saying what the record is for.
  'home.doctorRecord':
    "You wanted a record for your doctor. It's ready whenever you are, in Export.",
  'home.cycles.line':
    'Each strip is one of your cycles, starting with this one. Tap one to see it in full.',
  'home.greeting': 'Hi, {name}',
  // What she reads where she gave no name. She is greeted either way, so the top of the screen
  // never opens on a blank line, and nothing stands where a name would be.
  'home.greeting.noName': 'Hi',
  // The one button of a screen with no ring. As soon as a ring is drawn the two round actions
  // are the way into the log, so this label is read on day one and nowhere else.
  'home.logToday': 'Log today',
  'home.loggedToday.andTheLast': '{said} and {last}',
  'home.loggedToday.energy': 'energy',
  'home.loggedToday.flow': '{flow} flow',
  'home.loggedToday.lead': 'Logged today',
  'home.loggedToday.noFlow': 'no bleeding',
  'home.loggedToday.note': 'a note',
  'home.loggedToday.temperature': 'a temperature',
  'home.loggedToday.weight': 'a weight',
  // The line a woman who said her period is hard reads on a day inside it. It names her own
  // answer back to her and offers the one group she is most likely to want, and it says what the
  // press does rather than saying anything about how she must feel.
  'home.numbers.cycleLength': 'Last cycle',
  'home.numbers.cycleLengthVariation': 'Variation',
  'home.numbers.days': { one: '{count} day', other: '{count} days' },
  'home.numbers.fractionDays': '{days} days',
  'home.numbers.hers': 'Yours',
  'home.numbers.line':
    'The published figure is the one the paper reports, and the paper is one press away.',
  'home.numbers.periodDuration': 'Last period',
  'home.numbers.press': 'Where these figures come from',
  'home.numbers.published': 'Published',
  'home.numbers.range': '{low} to {high}',
  'home.numbers.upTo': 'up to {days}',
  'home.painLine': 'You told us these days can be hard. Start with how much it hurts.',
  'home.patterns.beforePeriod': 'about {days} before your period',
  'home.patterns.card': '{name}, {when}',
  'home.patterns.line':
    "A symptom you logged once or twice isn't a pattern, so we won't call it one.",
  'home.patterns.onCycleDay': 'about day {day} of your cycle',
  'home.patterns.press': 'What comes back, in full',
  'home.roundAction.period': 'Period',
  'home.roundAction.symptoms': 'Symptoms',
  // The chart of her last complete cycles over the published range. The caption and the sentence
  // under it count the cycles the chart drew, so a woman with three of them is never told six.
  'home.trend.allInside': 'All of your last {cycles} fell inside the band.',
  'home.trend.caption': 'Your last {cycles}. The shaded band is the published range.',
  'home.trend.cycleCount': { one: '{count} complete cycle', other: '{count} complete cycles' },
  'home.trend.outside': '{outside} of your last {cycles} fell outside the band.',
  'home.trend.press': 'The same cycles, in full',
  'home.waiting.cycles.heading': 'Your cycles',
  'home.waiting.cycles.needs': 'Your numbers arrive with your second period.',
  'home.waiting.cycles.read': "So far we've seen {cycles}.",
  'home.waiting.patterns.heading': 'What comes back',
  'home.waiting.trend.heading': 'Cycle trends',
  'home.waiting.trend.needs': {
    one: 'Your chart appears once {count} cycle is complete.',
    other: 'Your chart appears once {count} cycles are complete.',
  },
  'home.waiting.trend.read': 'Emi draws nothing from nothing, and it holds no sample data.',
  'home.trend.spoken':
    'Your last {cycles}, from {shortest} to {longest} days, over the published range of {low} to {high} days.',
  'home.week.today': 'TODAY',
  'home.wordmark': 'Emi',

  'lock.cancel': 'Cancel',
  /**
   * The cover carries the wordmark and nothing else. A cover that named the screen underneath it,
   * even as a heading, would put a word about her body into the picture the operating system keeps.
   */
  'lock.cover.wordmark': 'emi',
  'lock.locked.action': 'Unlock',
  'lock.locked.line': 'Use your face, your fingerprint or your passcode to open it.',
  'lock.locked.refused': 'Still locked. Tap Unlock to try again.',
  'lock.locked.title': 'Emi is locked.',
  'lock.locked.wordmark': 'emi',
  /** What the platform prompt says. The platform draws it, so Emi writes only this line. */
  'lock.prompt': 'Unlock Emi',

  'log.day.notADay.line': "That date isn't in the calendar.",
  'log.day.notADay.title': "That's not a day",
  'log.day.notYet.line': "That day hasn't happened yet. You can log today or any day before it.",
  'log.day.notYet.title': 'Not yet',
  'log.day.back': 'Back',
  'log.energy.heading': "How's your energy?",
  'log.energy.level': 'Level {level}',
  'log.energy.name.1': 'Very low',
  'log.energy.name.2': 'Low',
  'log.energy.name.3': 'Okay',
  'log.energy.name.4': 'Good',
  'log.energy.name.5': 'High',
  'log.energy.nothingChosen': 'Not logged',
  'log.energy.hint': 'Press the one you chose again to clear it',
  'log.flow.done': 'Done',
  'log.flow.heavy': 'Heavy',
  'log.flow.light': 'Light',
  'log.flow.medium': 'Medium',
  'log.flow.none': 'None',
  'log.flow.saved': 'Saved on your phone.',
  'log.flow.spotting': 'Spotting',
  'log.flow.title': "How's your flow today?",
  'log.group.digestion': 'Digestion',
  'log.group.energy': 'Energy',
  'log.group.head': 'Head',
  'log.group.libido': 'Libido',
  'log.group.mood': 'Mood',
  'log.group.pain': 'Pain',
  'log.group.skin': 'Skin and hair',
  'log.group.sleep': 'Sleep',
  'log.sheet.found': { one: '{count} found', other: '{count} found' },
  'log.sheet.noMatch': 'No symptoms match {query}',
  'log.sheet.picked': { one: '{count} picked', other: '{count} picked' },
  'log.sheet.save': 'Save',
  'log.sheet.saved': 'Saved',
  'log.sheet.search': 'Search symptoms',
  'log.temperature.heading': 'Waking temperature',
  'log.temperature.hint': 'Take it before you get up.',
  /** The invitation the voice sets, which asks rather than labels. */
  'log.unexpected.invitation':
    "Bleeding that isn't your period? Log it here, and we'll keep an eye on the pattern.",
  'log.unexpected.mark': 'Not my period',
  /** What her mark did, said as the arithmetic behaves rather than as a reassurance. */
  'log.unexpected.marked': "Saved to your record. It won't count as the start of a cycle.",
  'log.weight.heading': 'Weight',
  'log.weight.hint': 'Once a day is plenty.',

  'onboarding.back': 'Back',
  'onboarding.birthYear.action': 'Continue',
  'onboarding.birthYear.line.years':
    'Cycles change across the years, so it helps to know where you are.',
  'onboarding.birthYear.title': 'What year were you born?',
  'onboarding.birthYear.titleNamed': 'Nice to meet you, {name}. What year were you born?',
  'onboarding.birthYear.year': 'Born in {year}',
  'onboarding.cycleLength.action': "That's about right",
  // The stepper runs from 21 to 45, so the count never reaches one and the screen said days
  // whatever she set. Moving the words kept it that way.
  'onboarding.cycleLength.days': '{count} days',
  'onboarding.cycleLength.line.count':
    'From the first day of one period to the day before the next. A rough guess is fine.',
  'onboarding.cycleLength.line.corrects':
    "Once we've seen two of your cycles, we'll use your real number.",
  'onboarding.cycleLength.longer': 'One day longer',
  'onboarding.cycleLength.shorter': 'One day shorter',
  'onboarding.cycleLength.title': 'How long is your cycle, usually?',
  'onboarding.feeling.action': 'Continue',
  'onboarding.feeling.choice.fine': "I'm fine with it",
  'onboarding.feeling.choice.hard': "Honestly, it's hard most months",
  'onboarding.feeling.choice.understand': 'I want to understand it better',
  'onboarding.feeling.line.talks': 'Your answer changes how we talk to you, and nothing else.',
  'onboarding.feeling.reply.fine': "Then we'll keep things short.",
  'onboarding.feeling.reply.hard':
    "We hear you. We'll show you when it's coming, so you can plan around it.",
  'onboarding.feeling.reply.understand':
    "You're in the right place. The more you log, the more it makes sense.",
  'onboarding.feeling.title': 'How do you feel about your period?',
  'onboarding.firstForecast.action': 'Continue',
  'onboarding.firstForecast.line.learning':
    "We're still getting to know your cycle. After two cycles, we'll tell you how sure we are.",
  'onboarding.firstForecast.noDate.cycles': {
    one: 'We need {count} full cycle before we can forecast.',
    other: 'We need {count} full cycles before we can forecast.',
  },
  'onboarding.firstForecast.noDate.first': 'Log your next period and your forecast starts there.',
  'onboarding.firstForecast.noDate.guess':
    "We won't guess a date on day one, because a guess would only mislead you.",
  'onboarding.firstForecast.noDate.title': "We don't have a date to start from yet",
  'onboarding.firstForecast.onThisPhone.line':
    'This comes from the dates you just gave us, worked out right here on your phone.',
  'onboarding.firstForecast.onThisPhone.title': 'Worked out on your phone',
  'onboarding.firstForecast.title': "Here's your next period",
  'onboarding.firstForecast.titleNamed': "{name}, here's your next period",
  'onboarding.firstForecast.why.line':
    "Cycles shift by a few days from month to month. A single date would pretend they don't.",
  'onboarding.firstForecast.why.title': 'Why a range?',
  'onboarding.focus.action': 'Continue',
  'onboarding.focus.line.first': "We'll put them first when you log your day.",
  'onboarding.focus.line.privacy': 'You can change this any time in Privacy.',
  'onboarding.focus.title': 'Does your cycle change any of these?',
  'onboarding.goals.action': 'Continue',
  'onboarding.goals.choice.doctorRecord': 'Keeping a record for my doctor',
  'onboarding.goals.choice.fertileWindow': 'Seeing my fertile window, as an estimate',
  'onboarding.goals.choice.forecast': 'Knowing when my period is coming',
  'onboarding.goals.choice.symptoms': 'Understanding my symptoms',
  'onboarding.goals.line.chooseAll': 'Pick as many as you like.',
  'onboarding.goals.title': 'What would you like help with?',
  'onboarding.hold.action': 'Hold to begin',
  'onboarding.hold.held': 'Keep holding',
  'onboarding.hold.instruction': 'Press and hold the ring to begin.',
  // What she reads when the write refuses. It says nothing was kept, because nothing was: the
  // day, the answers and the marker go in one transaction or none of them do.
  'onboarding.hold.refused': "That didn't save. Press and hold the ring again.",
  // True only because the hold is the one moment the first run writes. The key is made there if
  // this phone holds none, and it is kept in the keychain rather than anywhere a screen may name.
  'onboarding.hold.sealed':
    "When you hold the ring, we save your answers and lock them with a key that lives in this phone's keychain.",
  'onboarding.hold.title': 'Your cycle. Your data. Your key.',
  'onboarding.lastPeriod.action': 'Continue',
  'onboarding.lastPeriod.earlier': 'Earlier',
  'onboarding.lastPeriod.earlierMonth': 'Earlier month',
  'onboarding.lastPeriod.later': 'Later',
  'onboarding.lastPeriod.laterMonth': 'Later month',
  'onboarding.lastPeriod.line.remember': 'Tap the first day you bled. Close enough is fine.',
  'onboarding.lastPeriod.title': 'When did your last period start?',
  'onboarding.name.action': 'Continue',
  'onboarding.name.hint': 'Your first name',
  'onboarding.name.label': 'Your name',
  'onboarding.name.line.greets':
    'So we can say hello. Your name stays on your home screen and nowhere else.',
  'onboarding.name.title': 'What should we call you?',
  'onboarding.name.tooLong': {
    one: 'Names can be up to {count} character.',
    other: 'Names can be up to {count} characters.',
  },
  // One line for the five questions that keep an answer, rather than five sentences in three
  // languages that drift the moment somebody edits one of them.
  'onboarding.onlyYou': 'Only you can read this.',
  'onboarding.periodBefore.action': 'Add it',
  'onboarding.periodBefore.between': {
    one: '{count} day apart',
    other: '{count} days apart',
  },
  'onboarding.periodBefore.line.remember':
    'If you remember when it started, your first forecast will be closer.',
  'onboarding.periodBefore.outOfRange':
    'Cycles run from {minimum} to {maximum} days. Try a day in that range.',
  'onboarding.periodBefore.skip': "I don't remember",
  'onboarding.periodBefore.title': 'And the one before that?',
  'onboarding.periodLength.action': 'Done',
  'onboarding.periodLength.days': {
    one: '{count} day',
    other: '{count} days',
  },
  'onboarding.periodLength.line.count': 'From the first day of bleeding to the last.',
  'onboarding.periodLength.line.logged': "Once you've logged a few, we'll use those instead.",
  'onboarding.periodLength.longer': 'One day longer',
  'onboarding.periodLength.shorter': 'One day shorter',
  'onboarding.periodLength.skip': "I'm not sure",
  'onboarding.periodLength.title': 'How many days does your period usually last?',
  'onboarding.promise.action': 'Continue',
  'onboarding.promise.delete.line': 'One press removes every day from this phone.',
  'onboarding.promise.delete.title': 'Delete it all, any time',
  'onboarding.promise.encrypted.line':
    'Every day you log is locked on this phone, and only the locked copy is sent.',
  'onboarding.promise.encrypted.title': 'Encrypted with a key only you hold',
  'onboarding.promise.noTracking.line':
    "We don't ask for a password, and Emi carries no tracking tools.",
  'onboarding.promise.noTracking.title': 'No password, no trackers',
  'onboarding.promise.title': 'Only you can read your days.',
  'onboarding.regularity.action': 'Continue',
  'onboarding.regularity.choice.moves': 'No, it moves around',
  'onboarding.regularity.choice.regular': 'Yes, pretty much',
  'onboarding.regularity.choice.unknown': "I'm not sure yet",
  'onboarding.regularity.line.explains':
    'Regular means it comes after about the same number of days each time.',
  'onboarding.regularity.reply.moves':
    "That's common. We'll start with a wider range and narrow it as we learn yours.",
  'onboarding.regularity.reply.regular':
    "Good to know. We'll still show a range, because even regular cycles move a little.",
  'onboarding.regularity.reply.unknown': "That's fine. Your log will tell us soon enough.",
  'onboarding.regularity.title': 'Is your cycle regular?',
  'onboarding.skip': 'Skip',
  'onboarding.step': 'Step {step} of {of}',
  'onboarding.today.action': 'Save',
  'onboarding.today.choice.bloating': 'Bloating',
  'onboarding.today.choice.calm': 'Calm',
  'onboarding.today.choice.cramps': 'Cramps',
  'onboarding.today.choice.fatigue': 'Tired',
  'onboarding.today.choice.headache': 'Headache',
  'onboarding.today.choice.low-mood': 'Low',
  'onboarding.today.line.skip': 'Pick anything that fits, or skip it.',
  'onboarding.today.skip': 'Nothing today',
  'onboarding.today.title': 'How are you feeling today?',
  'onboarding.today.titleNamed': '{name}, how are you feeling today?',
  'onboarding.tour.back': 'Back',
  'onboarding.tour.count': '{step} of {of}',
  'onboarding.tour.range.action': 'Next',
  'onboarding.tour.range.line.arithmetic':
    "It's all arithmetic on your own records. Emi is not a contraceptive. Emi is not a medical device.",
  'onboarding.tour.range.line.confidence':
    'Next to it, we tell you how sure we are, and how many of your cycles that comes from.',
  'onboarding.tour.range.line.learning':
    'After two full cycles, the forecast is built from yours. Until then, we work from the cycle length you tell us.',
  'onboarding.tour.range.line.range':
    "Your next period will come somewhere between two days. We show you both, because bodies don't run to the day.",
  'onboarding.tour.range.title': 'A range, not a guess.',
  'onboarding.tour.records.action': 'Next',
  'onboarding.tour.records.line.log':
    'Log your flow, mood, energy, sleep, temperature, weight and more than 70 symptoms, all on one sheet.',
  'onboarding.tour.records.line.patterns':
    "After six cycles, we show you the symptoms that came back at the same point in at least three of them. One bad day is just one bad day, and we won't call it a pattern.",
  'onboarding.tour.records.title': 'Tell it how you feel. See what comes back.',
  'onboarding.tour.ring.action': 'Next',
  'onboarding.tour.ring.line.arcs':
    'The four colours are the four parts of your cycle: your period, the days after it, the days around ovulation, and the days before your next period.',
  'onboarding.tour.ring.line.ring':
    "The dot is today. The number inside it tells you which day of your cycle you're on.",
  'onboarding.tour.ring.title': 'This ring is your cycle.',
  'onboarding.tour.skip': 'Skip',
  'onboarding.tour.yours.action': 'Continue',
  'onboarding.tour.yours.line.encrypted':
    "Everything you log is encrypted on this phone, with a key that never leaves it. Our server only holds a locked copy it can't open.",
  'onboarding.tour.yours.line.price':
    "Your first month is free, then it's 29.99 pounds a year. There's no free version, because a free app is paid for with your data.",
  'onboarding.tour.yours.line.recovery':
    "Keep your recovery code, and your history follows you to a new phone. We can't open your history, so we can never hand it to anyone.",
  'onboarding.tour.yours.title': 'Your days are yours alone.',
  'onboarding.welcome.action': "Let's start",
  'onboarding.welcome.line.noAccount': 'No account, no email, no password.',
  // The two denials travel word for word, and the gate reads a denial as a claim unless a full
  // stop comes before it, so the line they close carries a sentence of its own first.
  'onboarding.welcome.line.onThisPhone':
    'Everything is worked out on this phone. Emi is not a contraceptive. Emi is not a medical device.',
  'onboarding.welcome.line.questions':
    "Let's get to know your cycle. A few questions, and you can skip any of them.",
  'onboarding.welcome.title': 'Hi, welcome to Emi!',
  'onboarding.whatEmiDoes.action': 'Continue',
  'onboarding.whatEmiDoes.forecast.line':
    'A range to start with. It gets narrower as we learn your cycle.',
  'onboarding.whatEmiDoes.forecast.title': 'Your forecast',
  'onboarding.whatEmiDoes.log.and': 'and',
  'onboarding.whatEmiDoes.log.chosen': {
    one: '{groups} comes first when you log, just as you asked.',
    other: '{groups} come first when you log, just as you asked.',
  },
  'onboarding.whatEmiDoes.log.title': 'Your log',
  'onboarding.whatEmiDoes.log.usual': "You'll see the usual order when you log.",
  'onboarding.whatEmiDoes.privacy.line':
    "It's all encrypted on this phone. Nobody else can read it.",
  'onboarding.whatEmiDoes.privacy.title': 'Your privacy',
  'onboarding.whatEmiDoes.title': "Here's what we'll do with your answers",
  'onboarding.whatEmiDoes.titleNamed': "{name}, here's what we'll do with your answers",

  'recovery.before.action': 'Show my code',
  'recovery.before.line.nobody':
    "We can't recover it for you. If we could, we could read your days.",
  'recovery.before.line.onlyWay':
    "Next, you'll see a recovery code. It's the only way to get your cycles back if you lose this phone.",
  'recovery.before.line.paper': 'Write it on paper and keep it with your other important papers.',
  'recovery.before.title': 'Your data is locked to this phone',
  'recovery.code.action': "I've written it down",
  'recovery.code.line.once':
    "{count} characters. You'll only see them once, and we don't keep a copy.",
  'recovery.code.line.writeDown': "Write them down now. Next, you'll type them back.",
  'recovery.code.title': 'Your recovery code',
  'recovery.confirm.action': 'Done',
  'recovery.confirm.label': 'Your {count} character recovery code',
  'recovery.confirm.line.checks': "Just to check you've got it right.",
  'recovery.confirm.line.case': "Capitals and spaces don't matter.",
  'recovery.confirm.title': 'Type your code back',
  'recovery.confirm.wrong': "That doesn't match. Check your paper and try again.",
  'recovery.step': 'Step {step} of {of}',

  'settings.answer.back': 'Back',
  'settings.answer.cancel': 'Cancel',
  'settings.answer.gaveAtFirstRun': 'You told us {answer} when you started.',
  'settings.answer.save': 'Save',
  'settings.answers.back': 'Back',
  'settings.answers.birthYear': 'Year of birth',
  'settings.answers.cycleLength': 'Cycle length',
  'settings.answers.feeling': 'How you feel about it',
  'settings.answers.focus': 'What changes with your cycle',
  'settings.answers.goals': 'What you want Emi for',
  'settings.answers.goalsChosen': '{chosen} of the {of}',
  'settings.answers.name': 'Your name',
  'settings.answers.periodLength': 'Period length',
  'settings.answers.regularity': 'Regular',
  'settings.answers.title': 'Your answers',
  'settings.delete.action': 'Delete everything',
  'settings.delete.back': 'Back',
  'settings.delete.goes.account': 'Your account on the server, and every day it holds',
  'settings.delete.goes.cycles': 'The cycles Emi worked out from them',
  'settings.delete.goes.days': 'Every day you logged on this phone',
  'settings.delete.goes.key': 'The key that opens any of it',
  'settings.delete.goes.settings': 'Your settings',
  'settings.delete.line':
    "One press and it's gone. No undo, no waiting period. Nobody at Emi can bring it back, because nobody at Emi can read it.",
  'settings.delete.refused':
    'Your days are gone, but your phone held on to one thing in the keychain. Press again to finish.',
  'settings.delete.title': 'Delete everything',
  'settings.delete.working': 'Deleting',
  'settings.deleted.action': 'Start again',
  'settings.deleted.line':
    'This phone holds nothing about you now. You can start fresh whenever you like.',
  'settings.deleted.title': "It's gone.",
  'settings.deleted.withoutTheServer':
    "We couldn't reach our server to remove your account. Nothing can open what's left there: the only key was on this phone, and it went with your days.",
  'settings.settings.answers': 'Your answers',
  'settings.settings.answersLine': 'What you told us when you started',
  'settings.settings.back': 'Back',
  'settings.settings.delete': 'Delete everything',
  'settings.settings.deleteLine': "One press, and it's gone for good",
  'settings.settings.export': 'Export',
  'settings.settings.exportLine': 'Two files, made on this phone',
  'settings.settings.lock': 'Lock',
  'settings.settings.lockLine': 'On, with your face or your passcode',
  'settings.settings.title': 'Privacy',
  'tab.insights': 'Insights',
  'tab.log': 'Log',
  'tab.privacy': 'Privacy',
  'tab.today': 'Today',
} as const;
