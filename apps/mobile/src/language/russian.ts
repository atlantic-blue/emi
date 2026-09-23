import type { CatalogueIn } from './words';

/**
 * Every word she reads, in Russian, under the same key as the English word. The type holds the
 * catalogues to one key set, so a word nobody translated is a compile error before it is a failing
 * test, and a screen can never draw one language beside another.
 *
 * Russian counts in three groups where English and Spanish count in two, so every key whose words
 * change with the number carries one, few and many. Two is few. Five is many. Twenty one is one,
 * because the group follows the last digit unless the last two digits are the teens, and eleven is
 * many for that reason.
 *
 * The genitive is the case a counted noun takes here: одному дню, два дня, пять дней. That is what
 * the three forms are carrying, and it is why a language with two forms cannot be stretched to fit.
 *
 * The honesty scan reads this file with the other two, against a list that holds all three
 * languages, so a Russian sentence cannot claim what the English sentence may not.
 */
export const russian: CatalogueIn<'ru'> = {
  'calendar.month.april': 'апреля',
  'calendar.month.august': 'августа',
  'calendar.month.december': 'декабря',
  'calendar.month.february': 'февраля',
  'calendar.month.january': 'января',
  'calendar.month.july': 'июля',
  'calendar.month.june': 'июня',
  'calendar.month.march': 'марта',
  'calendar.month.may': 'мая',
  'calendar.month.november': 'ноября',
  'calendar.month.october': 'октября',
  'calendar.month.september': 'сентября',
  // Russian writes a day of the month as a plain number, so it adds no suffix to any of them.
  'calendar.ordinal.first': '',
  'calendar.ordinal.other': '',
  'calendar.ordinal.second': '',
  'calendar.ordinal.third': '',
  'calendar.today': 'Сегодня',
  'calendar.weekday.friday': 'Пятница',
  'calendar.weekday.monday': 'Понедельник',
  'calendar.weekday.saturday': 'Суббота',
  'calendar.weekday.sunday': 'Воскресенье',
  'calendar.weekday.thursday': 'Четверг',
  'calendar.weekday.tuesday': 'Вторник',
  'calendar.weekday.wednesday': 'Среда',
  'calendar.yesterday': 'Вчера',

  'cycle.noRing.line': 'Кольцу нужны месячные. Отметьте день, когда шла кровь, и оно появится.',
  'cycle.noRing.title': 'Пока нечего рисовать',
  'cycle.ring.spoken': 'День {day} из {length}, {phase}',

  'export.again': 'Создать заново',
  'export.back': 'Назад',
  'export.cycleCount': { one: '{count} цикл', few: '{count} цикла', many: '{count} циклов' },
  'export.dayCount': { one: '{count} день', few: '{count} дня', many: '{count} дней' },
  'export.deleted': {
    one: '{days}, который вы удалили, есть только в файле данных.',
    few: '{days}, которые вы удалили, есть только в файле данных.',
    many: '{days}, которые вы удалили, есть только в файле данных.',
  },
  'export.document.cycles': 'Циклы',
  'export.document.days': 'Дни',
  'export.document.cycleRange': 'С {from} по {to}',
  'export.document.from': 'С {day}',
  'export.document.instant': '{date} в {time}',
  'export.document.label.firstOpened': 'Первый запуск',
  'export.document.label.length': 'Длина',
  'export.document.label.lockOnReturn': 'Блокировать при возврате',
  'export.document.label.period': 'Месячные',
  'export.document.label.predicted': 'Прогноз',
  'export.document.label.saved': 'Сохранено',
  'export.document.label.statedCycleLength': 'Длина цикла, которую вы указали',
  'export.document.label.temperature': 'Температура',
  'export.document.label.temperatureUnit': 'Единица температуры',
  'export.document.label.unexpectedBleeding': 'Неожиданное кровотечение',
  'export.document.label.weight': 'Вес',
  'export.document.label.weightUnit': 'Единица веса',
  'export.document.no': 'Нет',
  'export.document.nothing': 'Пока ничего не записано.',
  'export.document.predicted': 'прогноз',
  'export.document.settings': 'Настройки',
  'export.document.taken': 'Создано {taken}.',
  /**
   * The denial is one of the sentences the claims gate allows, word for word, because a document
   * that travels to a doctor is the first place somebody reads Emi as a medical opinion.
   */
  'export.document.what': 'Это всё, что вы записали в Emi. Emi не является медицинским изделием.',
  'export.document.title': 'Ваша запись',
  'export.document.yes': 'Да',
  'export.failed': 'Не удалось записать файлы. Возможно, на телефоне не осталось места.',
  'export.held': '{days} и {cycles}.',
  'export.make': 'Создать файлы',
  'export.making': 'Создаём',
  'export.share': 'Поделиться',
  'export.title': 'Экспорт',
  'export.what': 'Два файла. Один можно прочитать и отдать врачу, другой читает другое приложение.',
  'export.where':
    'Никуда ничего не отправляется. Файлы создаются на этом телефоне, и вы выбираете, кто их получит.',

  // The word sits inside the sentence rather than opening it, so it is written in lower case.
  'forecast.confidence.high': 'высокая',
  'forecast.confidence.low': 'низкая',
  'forecast.confidence.medium': 'средняя',
  'forecast.confidence.sentence': 'Уверенность {word}, по вашим последним {cycles} циклам',
  'forecast.cyclesWanted': {
    one: 'Emi нужен ещё {count} полный цикл, прежде чем делать прогноз.',
    few: 'Emi нужно ещё {count} полных цикла, прежде чем делать прогноз.',
    many: 'Emi нужно ещё {count} полных циклов, прежде чем делать прогноз.',
  },
  'forecast.fertileWindow': 'Фертильное окно',
  /**
   * Both sentences are one string because the wording check reads a denial only where a full stop
   * comes before it, and a string literal on its own puts a quotation mark there instead.
   */
  'forecast.fertileWindow.sentence':
    'Оценка по вашим последним {cycles} циклам. Emi никогда не говорит, что день безопасный, потому что безопасных дней нет.',
  'forecast.nextPeriod': 'Следующие месячные',
  'forecast.range.sameMonth': 'С {from} по {to} {month}',
  'forecast.range.spansMonths': 'С {from} {fromMonth} по {to} {toMonth}',
  'forecast.range.spansYears': 'С {from} {fromMonth} {fromYear} по {to} {toMonth} {toYear}',
  'forecast.statedLength':
    'До тех пор Emi считает цикл в {days} дней, ту длину, которую вы указали при первом запуске.',
  'forecast.stillLearning': 'Ещё учится',

  'history.back': 'Назад',
  'history.cycleDayCount': { one: '{count} день', few: '{count} дня', many: '{count} дней' },
  'history.cycleFrom': 'С {day}',
  'history.cycleLengthAndPeriod': '{length}, из них {periodDays} с кровью',
  'history.cycleRange': 'с {from} по {to}',
  'history.cycles': 'Ваши циклы',
  'history.dayReads': '{ordinal} {month}',
  'history.noCycles':
    'Пока нет ни одного цикла. Отметьте день, когда шла кровь, и здесь появится запись.',
  'history.nothingRepeats': 'Пока ничто не повторилось за 3 цикла.',
  'history.pattern.cycleDay': 'Около дня {day} вашего цикла',
  'history.pattern.evidence': 'в {withIt} из ваших последних {read} циклов',
  'history.pattern.line': '{when}, {evidence}',
  'history.pattern.beforePeriod': 'Примерно за {days} до месячных',
  'history.patternsWaiting': {
    one: 'Emi называет симптом, когда он вернулся за {needs} цикла. У вас завершён {count}.',
    few: 'Emi называет симптом, когда он вернулся за {needs} цикла. У вас завершено {count}.',
    many: 'Emi называет симптом, когда он вернулся за {needs} цикла. У вас завершено {count}.',
  },
  'history.patterns': 'Что возвращается',
  'history.running': 'Ещё идёт',
  'history.runningWithPeriod': '{running}, пока {periodDays} с кровью',
  'history.title': 'История',

  'home.export': 'Экспорт',
  'home.greeting': 'Здравствуйте, {name}',
  'home.history': 'История',
  'home.logToday': 'Отметить сегодня',
  'home.settings': 'Настройки',
  'home.wordmark': 'Emi',

  'lock.cancel': 'Отмена',
  /**
   * The cover carries the wordmark and nothing else. A cover that named the screen underneath it,
   * even as a heading, would put a word about her body into the picture the operating system keeps.
   */
  'lock.cover.wordmark': 'emi',
  'lock.locked.action': 'Разблокировать',
  'lock.locked.line': 'Разблокируйте лицом, отпечатком пальца или кодом.',
  'lock.locked.refused':
    'Emi всё ещё заблокирована. Нажмите Разблокировать, чтобы попробовать снова.',
  'lock.locked.title': 'Emi заблокирована.',
  'lock.locked.wordmark': 'emi',
  /** What the platform prompt says. The platform draws it, so Emi writes only this line. */
  'lock.prompt': 'Разблокировать Emi',

  'log.day.notADay.line': 'Этот адрес не называет день календаря.',
  'log.day.notADay.title': 'Не день',
  'log.day.notYet.line': 'Этот день ещё не наступил. Можно отметить сегодня и любой день до него.',
  'log.day.notYet.title': 'Ещё нет',
  'log.day.back': 'Назад',
  'log.energy.heading': 'Энергия, от одного до пяти',
  'log.energy.level': 'Уровень {level}',
  'log.energy.name.1': 'Очень низкая',
  'log.energy.name.2': 'Низкая',
  'log.energy.name.3': 'Ровная',
  'log.energy.name.4': 'Хорошая',
  'log.energy.name.5': 'Высокая',
  'log.energy.nothingChosen': 'Не отмечено',
  'log.energy.hint': 'Нажмите выбранное ещё раз, чтобы снять',
  'log.flow.done': 'Готово',
  'log.flow.heavy': 'Обильные',
  'log.flow.light': 'Скудные',
  'log.flow.medium': 'Средние',
  'log.flow.none': 'Нет',
  'log.flow.saved': 'Сохранено на этом телефоне.',
  'log.flow.spotting': 'Мазня',
  'log.flow.title': 'Ваши выделения',
  'log.group.digestion': 'Пищеварение',
  'log.group.energy': 'Энергия',
  'log.group.head': 'Голова',
  'log.group.libido': 'Либидо',
  'log.group.mood': 'Настроение',
  'log.group.pain': 'Боль',
  'log.group.skin': 'Кожа и волосы',
  'log.group.sleep': 'Сон',
  'log.sheet.found': {
    one: 'найден {count}',
    few: 'найдено {count}',
    many: 'найдено {count}',
  },
  'log.sheet.noMatch': 'Ни один симптом не подходит под {query}',
  'log.sheet.picked': {
    one: 'выбран {count}',
    few: 'выбрано {count}',
    many: 'выбрано {count}',
  },
  'log.sheet.save': 'Сохранить',
  'log.sheet.saved': 'Сохранено',
  'log.sheet.search': 'Искать симптомы',
  'log.temperature.heading': 'Температура после сна',
  'log.temperature.hint': 'До того, как встанете',
  /** The brand brief's own line, said the way a woman would say it. */
  'log.unexpected.invitation': 'Не месячные? Отметьте это. Emi проследит закономерность.',
  'log.unexpected.mark': 'Это не месячные',
  /** What her mark did, said as the arithmetic behaves rather than as a reassurance. */
  'log.unexpected.marked': 'Сохранено в вашей записи. Emi не считает цикл с этого дня.',
  'log.weight.heading': 'Вес',
  'log.weight.hint': 'Одно число в день',

  'onboarding.back': 'Назад',
  'onboarding.birthYear.action': 'Дальше',
  'onboarding.birthYear.line.noReader': 'Emi пока это не читает.',
  'onboarding.birthYear.line.sealed':
    'Emi шифрует это на телефоне, прежде чем что-то куда-то отправится.',
  'onboarding.birthYear.title': 'В каком году вы родились?',
  'onboarding.birthYear.year': '{year} год',
  'onboarding.cycleLength.action': 'Готово',
  'onboarding.cycleLength.days': '{count} дней',
  'onboarding.cycleLength.line.count':
    'Считайте от первого дня одних месячных до дня перед следующими.',
  'onboarding.cycleLength.line.corrects':
    'Emi заменит это вашим собственным числом, как только увидит два цикла.',
  'onboarding.cycleLength.longer': 'На день больше',
  'onboarding.cycleLength.shorter': 'На день меньше',
  'onboarding.cycleLength.title': 'Какой у вас цикл, примерно?',
  'onboarding.hold.action': 'Удерживайте, чтобы начать',
  'onboarding.hold.held': 'Удерживаете',
  'onboarding.hold.instruction': 'Нажмите и удерживайте кольцо, чтобы начать.',
  'onboarding.hold.refused': 'Emi ничего не сохранила. Нажмите и удерживайте кольцо ещё раз.',
  'onboarding.hold.sealed':
    'Удержание кольца сохраняет ваши ответы, зашифрованные вашим ключом. Emi создаёт ключ и хранит его в связке ключей этого телефона.',
  'onboarding.hold.title': 'Ваш цикл, ваши данные, ваш ключ.',
  'onboarding.lastPeriod.action': 'Дальше',
  'onboarding.lastPeriod.earlier': 'Раньше',
  'onboarding.lastPeriod.earlierMonth': 'Предыдущий месяц',
  'onboarding.lastPeriod.later': 'Позже',
  'onboarding.lastPeriod.laterMonth': 'Следующий месяц',
  'onboarding.lastPeriod.line.privacy':
    'Emi шифрует это на телефоне, прежде чем что-то куда-то отправится.',
  'onboarding.lastPeriod.line.remember':
    'Первый день, когда шла кровь. Ближайший день, который вы помните, вполне подойдёт.',
  'onboarding.lastPeriod.title': 'Когда начались ваши последние месячные?',
  'onboarding.name.action': 'Дальше',
  'onboarding.name.hint': 'Имя или ничего',
  'onboarding.name.label': 'Ваше имя',
  'onboarding.name.line.greets': 'Emi обращается к вам по нему. Больше его ничто не использует.',
  'onboarding.name.line.sealed':
    'Emi шифрует это на телефоне, прежде чем что-то куда-то отправится.',
  'onboarding.name.title': 'Как Emi вас называть?',
  'onboarding.name.tooLong': {
    one: 'В имени не больше {count} символа.',
    few: 'В имени не больше {count} символов.',
    many: 'В имени не больше {count} символов.',
  },
  'onboarding.periodBefore.action': 'Добавить',
  'onboarding.periodBefore.between': {
    one: '{count} день между ними',
    few: '{count} дня между ними',
    many: '{count} дней между ними',
  },
  'onboarding.periodBefore.line.remember': 'Помните, когда начались месячные перед этими?',
  'onboarding.periodBefore.line.surer': 'Каждые добавленные месячные делают первый прогноз точнее.',
  'onboarding.periodBefore.outOfRange':
    'Цикл длится от {minimum} до {maximum} дней. Выберите день в этом диапазоне.',
  'onboarding.periodBefore.skip': 'Не помню',
  'onboarding.periodBefore.title': 'Предыдущие месячные',
  'onboarding.periodLength.action': 'Готово',
  'onboarding.periodLength.days': { one: '{count} день', few: '{count} дня', many: '{count} дней' },
  'onboarding.periodLength.line.count': 'С первого дня крови до того дня, когда она прекратилась.',
  'onboarding.periodLength.line.logged':
    'Emi берёт дни, которые вы отмечаете, как только вы начнёте их отмечать.',
  'onboarding.periodLength.longer': 'На день больше',
  'onboarding.periodLength.shorter': 'На день меньше',
  'onboarding.periodLength.skip': 'Не знаю точно',
  'onboarding.periodLength.title': 'Сколько дней обычно идут месячные?',
  'onboarding.skip': 'Пропустить',
  'onboarding.step': 'Шаг {step} из {of}',
  'onboarding.tour.back': 'Назад',
  'onboarding.tour.count': '{step} из {of}',
  'onboarding.tour.range.action': 'Дальше',
  'onboarding.tour.range.line.arithmetic':
    'Это арифметика по вашим собственным записям. Emi не является средством контрацепции. Emi не является медицинским изделием.',
  'onboarding.tour.range.line.confidence':
    'Рядом с диапазоном она пишет высокую, среднюю или низкую уверенность и сколько ваших собственных циклов она посчитала.',
  'onboarding.tour.range.line.learning':
    'Emi нужно 2 полных цикла, прежде чем она делает прогноз. До этого она говорит, что ещё учится, и считает по длине цикла, которую вы указали.',
  'onboarding.tour.range.line.range':
    'Emi говорит, что следующая менструация начнётся между двумя днями. Она никогда не называет один день, потому что в названном дне она может ошибиться.',
  'onboarding.tour.range.title': 'Диапазон, и насколько Emi уверена.',
  'onboarding.tour.records.action': 'Дальше',
  'onboarding.tour.records.line.log':
    'Записывайте выделения, настроение, энергию, температуру, вес и более 70 симптомов на одном листе.',
  'onboarding.tour.records.line.patterns':
    'После шести циклов Emi называет симптомы, которые вернулись в той же точке цикла в 3 из них или больше. Симптом, записанный один раз, не является закономерностью, и Emi так его не называет.',
  'onboarding.tour.records.title': 'То, что вы записали, прочитано вам обратно.',
  'onboarding.tour.ring.action': 'Дальше',
  'onboarding.tour.ring.line.arcs':
    'Кольцо делится на четыре дуги: дни, когда идёт кровь, дни после них, дни вокруг овуляции и дни перед следующей менструацией.',
  'onboarding.tour.ring.line.ring':
    'Кольцо показывает ваш цикл. Точка отмечает сегодня, а число внутри говорит, какой у вас день.',
  'onboarding.tour.ring.title': 'Ваш цикл, в одном кольце.',
  'onboarding.tour.skip': 'Пропустить',
  'onboarding.tour.yours.action': 'Дальше',
  'onboarding.tour.yours.line.encrypted':
    'Каждый записанный день шифруется на этом телефоне ключом, который его никогда не покидает. Сервер хранит результат и не может прочитать ни одного дня.',
  'onboarding.tour.yours.line.price':
    'Один месяц бесплатно, затем 29,99 фунта в год. Бесплатной версии нет, потому что за бесплатную версию платят вашими данными.',
  'onboarding.tour.yours.line.recovery':
    'Код восстановления, который вы храните, переносит вашу историю на новый телефон. Никто в Emi не может открыть вашу историю, поэтому никто в Emi не может её передать.',
  'onboarding.tour.yours.title': 'Ваше, и остаётся вашим.',
  'onboarding.welcome.action': 'Дальше',
  'onboarding.welcome.line.noAccount':
    'Никакой учётной записи нет. Emi никогда не спрашивает вашу почту или пароль.',
  'onboarding.welcome.line.nothingSent':
    'Ваш цикл считается на этом телефоне. Никуда ничего не отправляется.',
  'onboarding.welcome.line.showsYou':
    'Emi показывает вам то, что говорят ваши собственные записи, и больше ничего. Emi не является средством контрацепции. Emi не является медицинским изделием.',
  'onboarding.welcome.title': 'Emi изучает ваш цикл. Данные остаются у вас.',

  'recovery.before.action': 'Показать мой код',
  'recovery.before.line.nobody':
    'Никто в Emi не может восстановить его за вас. Emi, которая могла бы восстановить ваш код, могла бы читать ваши дни.',
  'recovery.before.line.onlyWay':
    'Emi сейчас покажет вам код восстановления. Это единственный путь назад к вашим циклам, если вы потеряете этот телефон.',
  'recovery.before.line.paper':
    'Запишите его на бумаге. Держите бумагу там, где держите другие важные бумаги.',
  'recovery.before.title': 'Ваши данные привязаны к этому телефону',
  'recovery.code.action': 'Я записала',
  'recovery.code.line.once': '{count} знаков. Emi показывает их один раз и нигде не хранит.',
  'recovery.code.line.writeDown':
    'Запишите их сейчас. На следующем экране Emi попросит ввести их обратно.',
  'recovery.code.title': 'Ваш код восстановления',
  'recovery.confirm.action': 'Готово',
  'recovery.confirm.label': 'Ваш код восстановления из {count} знаков',
  'recovery.confirm.line.checks': 'Emi сверяет то, что вы вводите, с кодом, который показала.',
  'recovery.confirm.line.case':
    'Emi читает заглавные и строчные буквы одинаково и не учитывает пробелы, которые вы поставите.',
  'recovery.confirm.title': 'Введите код обратно',
  'recovery.confirm.wrong':
    'Это не тот код, который показала Emi. Прочитайте его с бумаги и введите снова.',
  'recovery.step': 'Шаг {step} из {of}',

  'settings.delete.action': 'Удалить всё',
  'settings.delete.back': 'Назад',
  'settings.delete.goes.account': 'Вашу учётную запись на сервере и все дни, которые она держит',
  'settings.delete.goes.cycles': 'Циклы, которые Emi посчитала по ним',
  'settings.delete.goes.days': 'Каждый день, который вы отметили на этом телефоне',
  'settings.delete.goes.key': 'Ключ, который открывает всё это',
  'settings.delete.goes.settings': 'Ваши настройки',
  'settings.delete.line':
    'Одно нажатие, и всё исчезнет. Отменить нельзя, ждать не нужно, и никто в Emi не вернёт это обратно, потому что никто в Emi не может это прочитать.',
  'settings.delete.refused':
    'Ваши дни удалены. Этот телефон не отдал одну вещь, которую Emi держит в связке ключей. Нажмите ещё раз.',
  'settings.delete.title': 'Удалить всё',
  'settings.delete.working': 'Удаляем',
  'settings.deleted.action': 'Начать заново',
  'settings.deleted.line': 'Этот телефон не хранит о вас ничего. Emi начинает с пустого кольца.',
  'settings.deleted.title': 'Всё удалено.',
  'settings.deleted.withoutTheServer':
    'Emi не смогла связаться с сервером, чтобы убрать вашу учётную запись. Теперь то, что там осталось, не открыть ничем: единственный ключ был на этом телефоне и ушёл вместе с вашими днями.',
  'settings.settings.back': 'Назад',
  'settings.settings.delete': 'Удалить всё',
  'settings.settings.title': 'Настройки',
  'tab.insights': 'Обзор',
  'tab.log': 'Запись',
  'tab.privacy': 'Приватность',
  'tab.today': 'Сегодня',
};
