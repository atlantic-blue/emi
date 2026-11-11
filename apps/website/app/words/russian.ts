import type { SiteWords } from './words';

/**
 * Every word the site draws in Russian. The notes in english.ts hold for this file too.
 *
 * The honesty gate holds this file to a list of Russian stems, and the ordinary words for keeping
 * something out of reach are on it, because in Russian they read as the promise Emi does not make.
 * So the sentences about her records reach for other words: `оберегает` where the English says
 * protects, `зашифрованы` for encrypted, and `спокойно` where the English says safe.
 */
export const russian: SiteWords = {
  brandLine: 'Emi. Every Month Insights.',
  store: 'Загрузите в App Store',
  storeSmall: 'Загрузите в',
  price: 'Первый месяц бесплатно, затем 29,99 фунта в месяц.',
  languageLabel: 'Язык',
  pageDescription: 'Трекер цикла и менструаций, который оставляет ваши записи вам.',
  sharePictureAlt:
    'Иконка Emi, заголовок «Понимайте своё тело бережно» и кольцо цикла на дне 8 из примерно 31, фолликулярная фаза.',

  heroHeadline: 'Понимайте своё тело бережно.',
  heroLine:
    'Emi начинает с вашего цикла: прогноз по вашим собственным данным и то, насколько он точен. Затем точные знания и сообщество, где можно спросить о том, о чём говорить не принято. Ваши записи зашифрованы на вашем телефоне.',
  heroPriceLine: 'Первый месяц бесплатно.',
  heroCancel: 'Отменить можно в любой момент.',
  ringLabel: 'Кольцо цикла, день {day} из примерно 31, {phase}.',
  ringPeriod: 'МЕСЯЧНЫЕ',
  ringFollicular: 'ФОЛЛИКУЛЯРНАЯ ФАЗА',
  ringOvulation: 'ОВУЛЯЦИЯ',
  ringLuteal: 'ЛЮТЕИНОВАЯ ФАЗА',
  ringDay: 'День {day}',
  ringOfAbout: 'из примерно 31',
  ringMove: 'Пройдите по циклу',

  cycleEyebrow: 'ВАШ ЦИКЛ',
  cycleHeadline: 'Диапазон дней и то, насколько Emi уверена.',
  cycleLine:
    'Emi учится на ваших собственных циклах, а не на среднем значении. Она даёт окно, а не одну дату, и говорит, насколько уверена. Пока у неё нет двух полных циклов, она говорит, что ещё учится.',
  cycleScreenAlt: 'Главный экран Emi с кольцом на дне 8 из примерно 31.',
  cycleNextLabel: 'Ваши следующие месячные',
  cycleNextRange: 'Между {from} и {to} {month}',
  cycleNextRangeAcrossMonths: 'Между {from} {fromMonth} и {to} {toMonth}',
  cycleNextConfidence: 'По вашим последним 6 циклам',
  cycleMonthJanuary: 'января',
  cycleMonthFebruary: 'февраля',
  cycleMonthMarch: 'марта',
  cycleMonthApril: 'апреля',
  cycleMonthMay: 'мая',
  cycleMonthJune: 'июня',
  cycleMonthJuly: 'июля',
  cycleMonthAugust: 'августа',
  cycleMonthSeptember: 'сентября',
  cycleMonthOctober: 'октября',
  cycleMonthNovember: 'ноября',
  cycleMonthDecember: 'декабря',
  cycleDayFirst: '{day}',
  cycleDaySecond: '{day}',
  cycleDayThird: '{day}',
  cycleDayOther: '{day}',
  cycleDenial: 'Emi не является средством контрацепции и не является медицинским изделием.',

  learnEyebrow: 'ОБУЧЕНИЕ',
  learnHeadline: 'Точные ответы на вопросы, которые не принято задавать.',
  learnLine:
    'Понятные руководства о том, что делает ваше тело в каждой фазе и что может помочь. Написано просто, без стеснения.',
  learnPeriodLabel: 'МЕСЯЧНЫЕ',
  learnPeriodTitle: 'Спазмы, усталость и что может помочь.',
  learnFollicularLabel: 'ФОЛЛИКУЛЯРНАЯ',
  learnFollicularTitle: 'Дни после месячных.',
  learnOvulationLabel: 'ОВУЛЯЦИЯ',
  learnOvulationTitle: 'Оценка по вашим прошлым циклам.',
  learnLutealLabel: 'ЛЮТЕИНОВАЯ',
  learnLutealTitle: 'Спазмы в лютеиновой фазе и не только.',

  communityEyebrow: 'СООБЩЕСТВО',
  communityHeadline: 'Место, где можно спросить и помочь друг другу.',
  communityLine:
    'Сообщество Emi собирает людей, которые задают вопросы, делятся тем, что им помогло, и предлагают, что Emi сделать дальше.',
  communityJoin: 'Присоединиться к сообществу Emi в Telegram ›',
  parentsEyebrow: 'ДЛЯ РОДИТЕЛЕЙ И ДОЧЕРЕЙ',
  parentsHeadline: 'Начните разговор раньше.',
  parentsLine:
    'Точные сведения, которыми можно поделиться с дочерью, о том, о чём до сих пор трудно говорить. Учитесь вместе, там, где спокойно.',

  noteEyebrow: 'ПОЧЕМУ МЫ СОЗДАЁМ EMI',
  founderControlsLabel: 'управление рассказами основателей',
  founderPrevious: 'Предыдущий основатель',
  founderNext: 'Следующий основатель',
  founderIuliiaRole: 'Соосновательница Emi, ведущая сообщества Emi',
  founderIuliiaNote:
    'За 9 лет психологической практики и работы более чем с 1 500 женщинами я создала Emi как спокойное пространство без стыда. Место, где женщины любого возраста могут свободно изучать своё тело, получать точные знания на самые табуированные темы и по-настоящему чувствовать себя собой.',
  founderJulianRole: 'Сооснователь Emi',
  founderJulianNote:
    'У меня две дочери. Я создаю Emi, чтобы у них было спокойное место, где можно понять своё тело: точные сведения, знания о том, что до сих пор под запретом, и сообщество, где можно спросить без осуждения, с юных лет. И попутно помочь всем остальным, кому нужно то же самое.',

  reviewsEyebrow: 'ОТЗЫВЫ',
  reviewsHeadline: 'Что люди говорят об Emi.',
  reviewsRating: '[RATING] в App Store, из [COUNT] оценок',
  reviewControlsLabel: 'управление отзывами',
  reviewPrevious: 'Предыдущий отзыв',
  reviewNext: 'Следующий отзыв',
  reviewFromTheStore: 'Отзыв в App Store',
  reviewFromTheCommunity: 'Участница сообщества Emi',
  reviewFromTheBeta: 'Тестировщица в TestFlight',

  carouselPause: 'Пауза',
  carouselPlay: 'Пуск',

  privacyHeadline: 'Ваши записи зашифрованы на вашем телефоне.',
  privacyLink: 'Как Emi оберегает ваши данные ›',

  tryTitle: 'Пока не готовы скачивать?',
  tryLine: 'Попробуйте бесплатный калькулятор. Ничего из введённого не покидает страницу.',
  tryLink: 'Когда мои следующие месячные? ›',
  askTitle: 'Вопросы?',
  askLine: 'Мы отвечаем на английском, русском и испанском.',
  askLink: 'Перейти в поддержку ›',

  protectionEyebrow: 'Приватность',
  protectionHeadline: 'Ваши дни принадлежат вам.',
  protectionHeadlineQuiet: 'Не нам.',
  protectionLine:
    'Emi шифрует каждый день на вашем телефоне ключом, который остаётся на телефоне. Код открыт, и вы можете сверить эту страницу с ним.',
  protectionReadTheCode: 'Открыть код',
  protectionReadTheDocument: 'Читать полный документ ›',
  protectionAlsoBefore:
    'У Emi также есть необязательный аккаунт, она принимает платежи и отправляет анонимные отчёты о сбоях и об использовании, только если вы это включите. Прочитайте',
  protectionAlsoPolicy: 'политику конфиденциальности',
  protectionAlsoAfter: ', чтобы узнать, что хранит каждый из них и зачем.',
  protectionScreenAlt:
    'Экран «Приватность» в Emi. На нём написано: ваши дни можете читать только вы. Зашифровано на этом телефоне ключом, который есть только у вас.',

  protectionDayHeadline: 'Что происходит с одним днём.',
  protectionLogTitle: 'Вы записываете день.',
  protectionLogLine: 'Месячные, симптомы, настроение или секс.',
  protectionSealTitle: 'Телефон запечатывает его.',
  protectionSealLine:
    'Emi шифрует день до того, как записать его. Ключ лежит в связке ключей вашего iPhone.',
  protectionLeavesTitle: 'Наружу уходит только результат.',
  protectionLeavesLine:
    'При синхронизации сервер хранит шифртекст, номер ревизии и время записи. Ключа у него нет.',
  protectionBuilt: 'Уже в приложении',
  protectionNotBuilt: 'Спроектировано, ещё не сделано',

  protectionKeysHeadline: 'У кого ключи.',
  protectionKeysHeadlineQuiet: 'Не у Emi.',
  protectionPhoneTitle: 'Ваш телефон',
  protectionPhoneLine: 'Ключ хранилища шифрует каждый день. Он никогда не покидает телефон.',
  protectionYouTitle: 'Вы',
  protectionYouLine:
    'Код восстановления из 26 символов, показанный один раз. Держите его отдельно от телефона.',
  protectionEmiLine:
    'Ключа нет. Поэтому ни один запрос к Emi или к Amazon Web Services не вернёт ни одного вашего дня.',

  protectionLimitsHeadline: 'От чего Emi не спасает.',
  protectionLimitsLine:
    'Четыре предела, названные здесь и не спрятанные. Каждый говорит, что вы можете сделать.',
  protectionLostTitle: 'Потерянный телефон',
  protectionLostLine:
    'Восстановления пока нет, поэтому дни уходят вместе с телефоном. Нажмите «Скачать данные» в Emi, чтобы сохранить копию.',
  protectionUnlockedTitle: 'Телефон, который кто-то может разблокировать',
  protectionUnlockedLine:
    'Он прочитает экран. Держите блокировку приложения включённой. Она включена по умолчанию.',
  protectionHostileTitle: 'Телефон с враждебной программой',
  protectionHostileLine:
    'Ни одно приложение не устоит против системы изнутри. Обновляйте iOS вовремя.',
  protectionOutsideTitle: 'Что узнаёт внешний мир',
  protectionOutsideLine:
    'При синхронизации сервер узнаёт, сколько у вас записей и когда была сделана каждая.',

  // Политика приватности, по boards/Privacy.dc.html.
  policyUpdated: 'ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ 4 НОЯБРЯ 2026',
  policyTitle: 'Политика приватности',
  policyLine: 'Мы не можем прочитать ваши записи. На этой странице сказано почему.',
  policyAccountOptional: 'Аккаунт не обязателен',
  policyUsageOptional: 'Анонимная статистика, только с вашего согласия',
  policyEncrypted: 'Зашифровано на вашем телефоне',
  policyWhoTitle: 'Кто мы',
  policyWhoLine: 'Emi делает Atlantic Blue Solutions Limited.',
  policyStoresTitle: 'Что хранит Emi',
  policyStoresLine:
    'Emi хранит даты, симптомы, настроение и секс, которые вы отмечаете. Они остаются на вашем телефоне. Emi шифрует каждый день перед записью, ключом, который лежит в связке ключей вашего iPhone.',
  policyHowTheEncryptionWorks: 'Как работает шифрование ›',
  policyCollectTitle: 'Что мы собираем',
  policyCollectLine:
    'Emi не может прочитать ваши записи. Ваш аккаунт знает только то, за что вы заплатили. Всё остальное анонимно и необязательно.',
  policyAccountTitle: 'Ваш аккаунт',
  policyAccountLine:
    'Ваш аккаунт хранит хешированный идентификатор, способ входа и то, за что вы заплатили. Его хранит Amazon Web Services, в Amazon Cognito. С ним вы можете заплатить на сайте или через Telegram Stars. С ним вы можете вернуть покупки на новом телефоне. С ним вы можете управлять подпиской. Он никогда не хранит данные о здоровье. Он необязателен: Emi работает и без него.',
  policyPaymentsTitle: 'Платежи',
  policyPaymentsAppleLine: 'В App Store платёж принимает Apple.',
  policyPaymentsTelegramLine: 'При оплате через Telegram Stars платёж принимает Telegram.',
  policyPaymentsWebBefore: 'На сайте',
  policyPaymentsWebAfter: 'принимает платёж.',
  policyUsageTitle: 'Анонимная статистика и отчёты об ошибках',
  policyUsageLine:
    'Emi может отправлять названия событий и отчёты об ошибках в Sentry и TelemetryDeck. Оба размещены в Европейском союзе. Они не связаны с вами и не содержат данных о здоровье. Emi отправляет их только если вы это включите. Они нужны, чтобы мы исправляли ошибки, считали пользователей и узнавали, какие руководства помогают.',
  policyProcessorsTitle: 'Кто обрабатывает данные для нас',
  policyProcessorsApple: 'принимает платёж в App Store.',
  policyProcessorsAmazon: 'хранит ваш аккаунт.',
  policyProcessorsTelegram: 'принимает платёж через Telegram Stars.',
  policyProcessorsCard: 'принимает платёж на сайте.',
  policyProcessorsSentry: 'получает отчёты об ошибках.',
  policyProcessorsTelemetry: 'получает названия событий.',
  policyRetentionTitle: 'Сколько мы это храним',
  policyRightsTitle: 'Ваши права',
  policyRightsBefore:
    'Вы можете запросить свои данные, попросить нас их удалить и отозвать согласие в любое время. Пишите на',
  policyLegalBasisTitle: 'Правовое основание',
  policySharingTitle: 'Передача',
  policySharingLine:
    'Ваши записи покидают телефон только когда вы выгружаете файл. Вы выбираете, куда он идёт.',
  policyRemindersTitle: 'Напоминания и Face ID',
  policyRemindersLine:
    'Напоминания планируются на вашем телефоне. Их не отправляет никакой сервер. Face ID обрабатывает iOS, поэтому Emi никогда не видит данные вашего лица.',
  policyDeletingTitle: 'Удаление',
  policyDeletingLine:
    'Удалите Emi или нажмите «Удалить данные» в приложении. Любое из двух убирает с телефона всё.',
  policyDeletingAccountBefore:
    'Удаление Emi не удаляет ваш аккаунт. Чтобы удалить аккаунт, напишите на',
  policyChildrenTitle: 'Дети',
  policyChildrenLine: 'Emi не предназначена для детей младше 13 лет.',
  policyContactTitle: 'Связь и изменения',
  policyContactBefore: 'Вопросы о приватности пишите на',
  policyContactAfter: '. Когда политика меняется, меняется и дата сверху.',

  // Страница поддержки, по boards/Support.dc.html.
  supportTitle: 'Поддержка Emi',
  supportSearch: 'Поиск по поддержке',
  supportNothingFound: 'Ничего не нашлось.',
  supportNothingFoundAfter: 'и мы ответим на английском, русском или испанском.',
  supportCannotLookUp:
    'Мы не видим ваши записи, поэтому не можем найти ваш аккаунт. Расскажите, что у вас на экране.',
  supportEmailUs: 'Напишите нам',
  supportEmailUsLine: 'На английском, русском или испанском',
  supportCommunity: 'Сообщество Emi',
  supportCommunityLine: 'Спросите других людей, в Telegram',
  supportBeta: 'Тестовая версия',
  supportBetaLine: 'Попробуйте следующую версию в TestFlight',
  supportSubscription: 'Подписка',
  supportSubscriptionLine: 'Продлить, отменить или получить чек',
  supportQuestionsHeadline: 'Частые вопросы.',
  supportLostPhoneQuestion: 'Я потеряла телефон. Вы можете вернуть мои записи?',
  supportLostPhoneAnswer:
    'Нет. Синхронизация спроектирована и ещё не сделана, поэтому ваши дни живут только на том телефоне. Остаётся лишь файл, который вы сохранили сами, через «Скачать данные».',
  supportLearningQuestion: 'Почему Emi говорит, что ещё учится?',
  supportLearningAnswer:
    'Emi нужно 2 полных цикла, прежде чем она строит прогноз. До этого она считает по длине цикла, которую вы указали.',
  supportDeleteQuestion: 'Как удалить всё?',
  supportDeleteAnswer:
    'Откройте «Приватность» в приложении и выберите «Удалить данные». Это убирает каждый день, каждый ответ и ключ. Удаление приложения уносит ваши дни и оставляет ключ в связке ключей iPhone.',
  supportCancelQuestion: 'Как отменить подписку?',
  supportCancelAnswer: 'Если вы платили в App Store, отмените в настройках аккаунта Apple.',

  signInTitle: 'Вход в Emi',
  signInLine: 'Войдите так же, как на вашем iPhone.',
  signInApple: 'Войти через Apple',
  signInGoogle: 'Войти через Google',
  signInTelegram: 'Войти через Telegram',
  signInOr: 'или',
  signInAddressLabel: 'Почта',
  signInSendCode: 'Отправить код',
  signInWeSendACode: 'Мы отправим код на этот адрес.',
  signInNoAccountNeeded:
    'Аккаунт не нужен, чтобы пользоваться Emi. Входите только чтобы оплатить на этом сайте или управлять подпиской.',
  signInWhatTheAccountHolds:
    'Аккаунт хранит идентификатор, способ входа и то, что вы оплатили. Он никогда не хранит ваши дни и ключ к ним.',
  signInCodeSentTo: 'Мы отправили код на {address}.',
  signInCodeLabel: 'Код',
  signInCodeSubmit: 'Войти',
  signInCodeLasts: 'Код действует 15 минут.',
  signInSendANewCode: 'Отправить новый код ›',
  signInUseAnotherAddress: 'Другой адрес ›',
  signInNeedsAnAddress: 'Сначала введите адрес почты.',
  signInNeedsTheCode: 'Введите код из письма.',
  signInAnotherCodeIsOnItsWay: 'Проверьте почту ещё раз и введите самый новый код.',
  signInCodeIsWrong: 'Этот код не подходит. Проверьте его и введите снова.',
  signInCodeHasExpired: 'Срок кода истёк. Отправьте новый.',
  signInTooManyTries: 'Слишком много попыток. Подождите несколько минут и отправьте новый код.',
  signInNothingReached: 'Браузер не смог связаться с Emi. Проверьте соединение и попробуйте снова.',
  signInSending: 'Отправляем код…',
  signInChecking: 'Проверяем код…',
  signInCouldNotStart:
    'Emi не смог начать этот вход. Попробуйте снова или запросите код в поле ниже.',
  returningTitle: 'Выполняем вход',
  returningWait: 'Одну минуту. Emi завершает ваш вход.',
  returningDidNotFinish: 'Этот вход не завершился. Откройте страницу входа и нажмите снова.',
  returningTryAgain: 'Вернуться к входу ›',
  accountTitle: 'Аккаунт',
  accountRecordsStayOnYourPhone: 'Ваши записи остаются на телефоне, поэтому их здесь нет.',
  accountSignOut: 'Выйти',

  headerHomeLabel: 'Главная страница Emi',
  headerMainLabel: 'Основное',
  headerEmi: 'Emi',
  headerPrivacy: 'Приватность',
  headerCalculator: 'Калькулятор',
  headerPulse: 'Пульс',
  headerBuy: 'Купить',
  headerSupport: 'Поддержка',
  headerLanguageLabel: 'Сменить язык',
  headerMenuLabel: 'Открыть меню',
  headerSignInLabel: 'Войти',

  footerDisclaimer:
    'Emi не является средством контрацепции и не является медицинским изделием. Прогноз даёт оценку по вашим прошлым циклам. Первый месяц бесплатно при месячной подписке в App Store.',
  footerEmiGroup: 'Emi',
  footerAppStore: 'App Store',
  footerBeta: 'Участвовать в тестировании',
  footerBuyOnTheWeb: 'Купить на сайте',
  footerPrivacyGroup: 'Приватность',
  footerHowEmiProtects: 'Как Emi оберегает ваши данные',
  footerOpenCode: 'Открытый код',
  footerTransparency: 'Отчёт о прозрачности',
  footerLearnGroup: 'Обучение',
  footerCalculator: 'Калькулятор следующих месячных',
  footerGuides: 'Руководства по фазам',
  footerPulse: 'Emi Пульс',
  footerHelpGroup: 'Помощь',
  footerSupport: 'Поддержка',
  footerCommunity: 'Сообщество Emi',
  footerAccount: 'Ваш аккаунт',
  footerCopyright: 'Авторское право 2026 Atlantic Blue Solutions Limited.',
  footerPrivacyPolicy: 'Политика приватности',
  footerTerms: 'Условия',
};
