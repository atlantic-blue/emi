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

  heroHeadline: 'Понимайте своё тело бережно.',
  heroLine:
    'Emi начинает с вашего цикла: прогноз по вашим собственным данным и то, насколько он точен. Затем точные знания и сообщество, где можно спросить о том, о чём говорить не принято. Ваши данные всегда зашифрованы.',
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
  cycleNextRange: 'Между 8 и 14 октября',
  cycleNextConfidence: 'Высокая уверенность, по вашим последним 6 циклам',
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

  // The band that the board the operator drew last took off the page. Still here so the
  // page above compiles while the tests of this step go red.
  priceEyebrow: 'ОДНА ЦЕНА',
  priceHeadline: '29,99 фунта в месяц. Первый месяц бесплатно.',
  priceLine: 'Платите так, как вам удобно.',
  priceAppStoreNote: 'Месяц бесплатно, затем каждый месяц. Отменить можно в настройках Apple.',
  priceCardTitle: 'Картой, на этом сайте',
  priceCardNote: 'Оплатите здесь, затем войдите на iPhone.',
  priceStarsTitle: 'Звёзды Telegram',
  priceStarsNote: 'Оплатите в боте Emi, затем войдите через Telegram.',
  noteBody:
    'У меня две дочери. Я создаю Emi, чтобы у них было спокойное место, где можно понять своё тело: точные сведения, знания о том, что до сих пор под запретом, и сообщество, где можно спросить без осуждения, с юных лет. И попутно помочь всем остальным, кому нужно то же самое.',
  founderName: 'Julian Tellez',
  founderRole: 'Основатель Emi',

  privacyHeadline: 'Ваши данные всегда зашифрованы.',
  privacyLink: 'Как Emi оберегает ваши данные ›',

  tryTitle: 'Пока не готовы скачивать?',
  tryLine: 'Попробуйте бесплатный калькулятор. Ничего из введённого не покидает страницу.',
  tryLink: 'Когда мои следующие месячные? ›',
  askTitle: 'Вопросы?',
  askLine: 'Мы отвечаем на английском, русском и испанском.',
  askLink: 'Перейти в поддержку ›',

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
