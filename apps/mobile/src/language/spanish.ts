import type { CatalogueIn } from './words';

/**
 * Every word she reads, in Spanish, under the same key as the English word. The type holds the two
 * catalogues to one key set, so a word nobody translated is a compile error before it is a failing
 * test, and a screen can never draw one language beside the other.
 *
 * Spanish uses two plural forms, as English does, so a key whose words change with the number
 * carries one and other. The gender is the woman's where a word agrees with her.
 *
 * A month is written in lower case, because it is read inside a sentence more often than it is read
 * as a heading. A weekday is written in upper case, because it opens the label it sits in and the
 * calendar takes its first letter for a column.
 *
 * The honesty scan reads this file with the English one, against a list that holds both languages,
 * so a Spanish sentence cannot claim what the English sentence may not.
 */
export const spanish: CatalogueIn<'es'> = {
  'calendar.daySheet.andLogged': '{said}. {logged}',
  'calendar.daySheet.cycleDay': 'Día {day}, {phase}',
  'calendar.daySheet.day': 'El {date} de {month}',
  'calendar.editPeriod.aDay': 'el {date}',
  'calendar.editPeriod.added': 'Añadiste {days}.',
  'calendar.editPeriod.back': 'Atrás',
  'calendar.editPeriod.bothChanges': '{added} {removed}',
  'calendar.editPeriod.cancel': 'Cancelar',
  'calendar.editPeriod.lead': {
    one: 'Pulsa los días que sangraste. Emi guarda {count} día, desde {date}.',
    other: 'Pulsa los días que sangraste. Emi guarda {count} días, desde {date}.',
  },
  'calendar.editPeriod.leadWithNoDay':
    'Pulsa los días que sangraste. Emi no guarda ningún día de este mes.',
  'calendar.editPeriod.noDayLeft': 'Un periodo tiene al menos un día. Pulsa un día que sangraste.',
  'calendar.editPeriod.nothingChanged': 'Nada que guardar todavía.',
  'calendar.editPeriod.removed': 'Quitaste {days}.',
  'calendar.editPeriod.save': 'Guardar',
  'calendar.editPeriod.title': 'Editar mi periodo',
  'calendar.legend.fertile': 'Fértil',
  'calendar.legend.period': 'Periodo',
  'calendar.month.april': 'abril',
  'calendar.month.august': 'agosto',
  'calendar.month.december': 'diciembre',
  'calendar.month.february': 'febrero',
  'calendar.month.january': 'enero',
  'calendar.month.july': 'julio',
  'calendar.month.june': 'junio',
  'calendar.month.march': 'marzo',
  'calendar.month.may': 'mayo',
  'calendar.month.november': 'noviembre',
  'calendar.month.october': 'octubre',
  'calendar.month.september': 'septiembre',
  // Spanish writes a day of the month as a plain number, so it adds no suffix to any of them.
  'calendar.ordinal.first': '',
  'calendar.ordinal.other': '',
  'calendar.ordinal.second': '',
  'calendar.ordinal.third': '',
  'calendar.screen.back': 'Atrás',
  'calendar.screen.earlier': 'Anterior',
  'calendar.screen.earlierMonth': 'Mes anterior',
  'calendar.screen.editPeriod': 'Editar mi periodo',
  'calendar.screen.later': 'Siguiente',
  'calendar.screen.laterMonth': 'Mes siguiente',
  'calendar.today': 'Hoy',
  'calendar.weekday.friday': 'Viernes',
  'calendar.weekday.monday': 'Lunes',
  'calendar.weekday.saturday': 'Sábado',
  'calendar.weekday.sunday': 'Domingo',
  'calendar.weekday.thursday': 'Jueves',
  'calendar.weekday.tuesday': 'Martes',
  'calendar.weekday.wednesday': 'Miércoles',
  'calendar.yesterday': 'Ayer',

  'cycle.day.bled': 'sangraste',
  'cycle.day.cycleDay': 'día {cycle} del ciclo',
  'cycle.day.expected': 'se espera tu periodo',
  'cycle.day.notYet': 'todavía no, este día no ha ocurrido',
  'cycle.figures.back': 'Atrás',
  'cycle.figures.cycleLength': 'Duración del ciclo',
  'cycle.figures.cycleLengthVariation': 'Variación de la duración del ciclo',
  'cycle.figures.periodDuration': 'Duración de la regla',
  'cycle.figures.printed': 'Cada estudio se nombra como lo imprime su revista.',
  'cycle.figures.quoted':
    'Cada cifra se cita con las palabras del estudio que la informa, para que puedas comprobarla en vez de creerla.',
  'cycle.figures.title': 'De dónde vienen estas cifras',
  'cycle.noRing.line': 'El anillo necesita un periodo. Registra un día en que sangraste y aparece.',
  'cycle.noRing.title': 'Todavía no hay nada que dibujar',
  'cycle.phaseLine.day': 'Día {day}',
  'cycle.phaseLine.follicular': {
    one: 'Fase folicular, un ciclo de {count} día',
    other: 'Fase folicular, un ciclo de {count} días',
  },
  'cycle.phaseLine.luteal': {
    one: 'Fase lútea, un ciclo de {count} día',
    other: 'Fase lútea, un ciclo de {count} días',
  },
  'cycle.phaseLine.ovulation': {
    one: 'Fase de ovulación, un ciclo de {count} día',
    other: 'Fase de ovulación, un ciclo de {count} días',
  },
  'cycle.phaseLine.period': 'Tu periodo, día {day} de unos {days}',
  'cycle.ring.of': 'de {length}',
  'cycle.ring.spoken': 'Día {day} de {length}, {phase}',

  'export.again': 'Crearlos de nuevo',
  'export.back': 'Atrás',
  'export.cycleCount': { one: '{count} ciclo', other: '{count} ciclos' },
  'export.dayCount': { one: '{count} día', other: '{count} días' },
  'export.deleted': {
    one: '{days} que borraste está solo en el archivo de datos.',
    other: '{days} que borraste están solo en el archivo de datos.',
  },
  'export.document.cycles': 'Ciclos',
  'export.document.days': 'Días',
  'export.document.cycleRange': 'Del {from} al {to}',
  'export.document.from': 'Desde {day}',
  'export.document.instant': '{date} a las {time}',
  'export.document.label.firstOpened': 'Primera vez abierta',
  'export.document.label.length': 'Duración',
  'export.document.label.lockOnReturn': 'Bloquear al volver',
  'export.document.label.period': 'Periodo',
  'export.document.label.predicted': 'Prevista',
  'export.document.label.saved': 'Guardado',
  'export.document.label.statedCycleLength': 'Duración del ciclo que indicaste',
  'export.document.label.temperature': 'Temperatura',
  'export.document.label.temperatureUnit': 'Unidad de temperatura',
  'export.document.label.unexpectedBleeding': 'Sangrado inesperado',
  'export.document.label.weight': 'Peso',
  'export.document.label.weightUnit': 'Unidad de peso',
  'export.document.no': 'No',
  'export.document.nothing': 'Todavía no hay nada registrado.',
  'export.document.predicted': 'prevista',
  'export.document.settings': 'Ajustes',
  'export.document.taken': 'Creado el {taken}.',
  /**
   * The denial is one of the sentences the claims gate allows, word for word, because a document
   * that travels to a doctor is the first place somebody reads Emi as a medical opinion.
   */
  'export.document.what':
    'Esto es todo lo que registraste en Emi. Emi no es un dispositivo médico.',
  'export.document.title': 'Tu registro',
  'export.document.yes': 'Sí',
  'export.failed':
    'Los archivos no se pudieron escribir. Puede que no quede espacio en el teléfono.',
  'export.held': '{days} y {cycles}.',
  'export.make': 'Crear los archivos',
  'export.making': 'Creándolos',
  'export.share': 'Compartir',
  'export.title': 'Exportar',
  'export.what':
    'Dos archivos. Uno que puedes leer y dar a un médico, y otro que puede leer otra aplicación.',
  'export.where':
    'No se envía nada a ninguna parte. Los archivos se crean en este teléfono y tú eliges quién los recibe.',

  // The word sits inside the sentence rather than opening it, so it is written in lower case.
  'forecast.confidence.high': 'alta',
  'forecast.confidence.low': 'baja',
  'forecast.confidence.medium': 'media',
  'forecast.confidence.sentence': 'Confianza {word}, a partir de tus últimos {cycles} ciclos',
  'forecast.cycleMoves': 'Tu ciclo se mueve, así que el rango es más amplio.',
  'forecast.cyclesWanted': {
    one: 'Emi necesita {count} ciclo completo más antes de decir cuánta confianza tiene.',
    other: 'Emi necesita {count} ciclos completos más antes de decir cuánta confianza tiene.',
  },
  'forecast.fertileWindow': 'Ventana fértil',
  /**
   * Both sentences are one string because the wording check reads a denial only where a full stop
   * comes before it, and a string literal on its own puts a quotation mark there instead.
   */
  'forecast.fertileWindow.sentence':
    'Una estimación a partir de tus últimos {cycles} ciclos. Emi nunca dice que un día es seguro, porque ninguno lo es.',
  'forecast.nextPeriod': 'Próximo periodo',
  'forecast.range.sameMonth': 'Entre el {from} y el {to} de {month}',
  'forecast.range.spansMonths': 'Entre el {from} de {fromMonth} y el {to} de {toMonth}',
  'forecast.range.spansYears':
    'Entre el {from} de {fromMonth} de {fromYear} y el {to} de {toMonth} de {toYear}',
  'forecast.statedLength':
    'Hasta entonces Emi cuenta un ciclo de {days} días, la duración que indicaste al empezar.',
  'forecast.stillLearning': 'Todavía aprendiendo',

  'history.back': 'Atrás',
  'history.cycleDayCount': { one: '{count} día', other: '{count} días' },
  'history.cycleFrom': 'Desde {day}',
  'history.cycleLengthAndPeriod': '{length}, {periodDays} de ellos con sangrado',
  'history.cycleRange': 'del {from} al {to}',
  'history.cycles': 'Tus ciclos',
  'history.dayReads': 'el {ordinal} de {month}',
  'history.noCycles':
    'Todavía no hay ningún ciclo registrado. Registra un día en que sangraste y esto se rellena.',
  'history.nothingRepeats': 'Nada ha vuelto en 3 ciclos todavía.',
  'history.pattern.cycleDay': 'Hacia el día {day} de tu ciclo',
  'history.pattern.evidence': 'en {withIt} de tus últimos {read} ciclos',
  'history.pattern.line': '{when}, {evidence}',
  'history.pattern.beforePeriod': 'Unos {days} antes de tu periodo',
  'history.patternsComplete': {
    one: '{count} de los tuyos está completo.',
    other: '{count} de los tuyos están completos.',
  },
  'history.patternsNeed': 'Emi nombra un síntoma cuando ha vuelto en {needs} ciclos.',
  'history.patterns': 'Lo que vuelve',
  'history.running': 'Todavía en curso',
  'history.runningWithPeriod': '{running}, {periodDays} de sangrado hasta ahora',
  'history.title': 'Historial',

  'home.doctorRecord': 'Pediste un registro para tu médico. Abre la exportación.',
  'home.cycles.line':
    'Cada franja es uno de tus ciclos, primero el que estás viviendo. Pulsa una franja para leer ese ciclo en Análisis.',
  'home.greeting': 'Hola, {name}',
  'home.logToday': 'Registrar hoy',
  'home.loggedToday.andTheLast': '{said} y {last}',
  'home.loggedToday.energy': 'energía',
  'home.loggedToday.flow': 'flujo {flow}',
  'home.loggedToday.lead': 'Registrado hoy',
  'home.loggedToday.noFlow': 'sin sangrado',
  'home.loggedToday.note': 'una nota',
  'home.loggedToday.temperature': 'una temperatura',
  'home.loggedToday.weight': 'un peso',
  'home.numbers.cycleLength': 'Último ciclo',
  'home.numbers.cycleLengthVariation': 'Variación',
  'home.numbers.days': { one: '{count} día', other: '{count} días' },
  'home.numbers.fractionDays': '{days} días',
  'home.numbers.hers': 'Tuyo',
  'home.numbers.line':
    'La cifra publicada es la que informa el estudio, y el estudio está a un toque.',
  'home.numbers.periodDuration': 'Último periodo',
  'home.numbers.press': 'De dónde vienen estas cifras',
  'home.numbers.published': 'Publicado',
  'home.numbers.range': 'de {low} a {high}',
  'home.numbers.upTo': 'hasta {days}',
  'home.painLine': 'Dijiste que estos días son difíciles. Registra el dolor primero.',
  'home.patterns.beforePeriod': 'unos {days} antes de tu periodo',
  'home.patterns.card': '{name}, {when}',
  'home.patterns.line':
    'Un síntoma que registraste una o dos veces no es un patrón, y Emi no lo llama así.',
  'home.patterns.onCycleDay': 'hacia el día {day} de tu ciclo',
  'home.patterns.press': 'Lo que vuelve, completo',
  'home.roundAction.period': 'Regla',
  'home.roundAction.symptoms': 'Síntomas',
  // El gráfico de sus últimos ciclos completos sobre el rango publicado. El pie y la frase debajo
  // cuentan los ciclos que dibujó el gráfico, así que una mujer con tres nunca lee seis.
  'home.trend.allInside': 'Todos tus últimos {cycles} quedaron dentro de la banda.',
  'home.trend.caption': 'Tus últimos {cycles}. La banda es el rango publicado.',
  'home.trend.cycleCount': { one: '{count} ciclo completo', other: '{count} ciclos completos' },
  'home.trend.outside': '{outside} de tus últimos {cycles} quedaron fuera de la banda.',
  'home.trend.press': 'Los mismos ciclos, completos',
  'home.waiting.cycles.heading': 'Tus ciclos',
  'home.waiting.cycles.needs': 'Tus tres cifras llegan con tu segundo periodo.',
  'home.waiting.cycles.read': 'Emi ha leído {cycles}.',
  'home.waiting.patterns.heading': 'Lo que vuelve',
  'home.waiting.trend.heading': 'Tendencias del ciclo',
  'home.waiting.trend.needs': {
    one: 'El gráfico llega cuando {count} ciclo esté completo.',
    other: 'El gráfico llega cuando {count} ciclos estén completos.',
  },
  'home.waiting.trend.read': 'Emi no dibuja nada de nada, y no guarda datos de ejemplo.',
  'home.trend.spoken':
    'Tus últimos {cycles}, de {shortest} a {longest} días, sobre el rango publicado de {low} a {high} días.',
  'home.week.today': 'HOY',
  'home.wordmark': 'Emi',

  'lock.cancel': 'Cancelar',
  /**
   * The cover carries the wordmark and nothing else. A cover that named the screen underneath it,
   * even as a heading, would put a word about her body into the picture the operating system keeps.
   */
  'lock.cover.wordmark': 'emi',
  'lock.locked.action': 'Desbloquear',
  'lock.locked.line': 'Desbloquea con tu cara, tu huella o tu código.',
  'lock.locked.refused': 'Emi sigue bloqueada. Pulsa Desbloquear para intentarlo otra vez.',
  'lock.locked.title': 'Emi está bloqueada.',
  'lock.locked.wordmark': 'emi',
  /** What the platform prompt says. The platform draws it, so Emi writes only this line. */
  'lock.prompt': 'Desbloquear Emi',

  'log.day.notADay.line': 'Esa dirección no nombra un día del calendario.',
  'log.day.notADay.title': 'No es un día',
  'log.day.notYet.line': 'Ese día no ha ocurrido. Puedes registrar hoy y cualquier día anterior.',
  'log.day.notYet.title': 'Todavía no',
  'log.day.back': 'Atrás',
  'log.energy.heading': 'Energía, de uno a cinco',
  'log.energy.level': 'Nivel {level}',
  'log.energy.name.1': 'Muy baja',
  'log.energy.name.2': 'Baja',
  'log.energy.name.3': 'Estable',
  'log.energy.name.4': 'Buena',
  'log.energy.name.5': 'Alta',
  'log.energy.nothingChosen': 'Sin registrar',
  'log.energy.hint': 'Pulsa otra vez la que elegiste para quitarla',
  'log.flow.done': 'Hecho',
  'log.flow.heavy': 'Abundante',
  'log.flow.light': 'Ligero',
  'log.flow.medium': 'Medio',
  'log.flow.none': 'Ninguno',
  'log.flow.saved': 'Guardado en este teléfono.',
  'log.flow.spotting': 'Manchado',
  'log.flow.title': 'Tu flujo',
  'log.group.digestion': 'Digestión',
  'log.group.energy': 'Energía',
  'log.group.head': 'Cabeza',
  'log.group.libido': 'Libido',
  'log.group.mood': 'Ánimo',
  'log.group.pain': 'Dolor',
  'log.group.skin': 'Piel y pelo',
  'log.group.sleep': 'Sueño',
  'log.sheet.found': { one: '{count} encontrado', other: '{count} encontrados' },
  'log.sheet.noMatch': 'Ningún síntoma coincide con {query}',
  'log.sheet.picked': { one: '{count} elegido', other: '{count} elegidos' },
  'log.sheet.save': 'Guardar',
  'log.sheet.saved': 'Guardado',
  'log.sheet.search': 'Buscar síntomas',
  'log.temperature.heading': 'Temperatura al despertar',
  'log.temperature.hint': 'Antes de levantarte',
  /** The brand brief's own line, said the way a woman would say it. */
  'log.unexpected.invitation': '¿No es tu periodo? Regístralo. Emi seguirá el patrón.',
  'log.unexpected.mark': 'No es mi periodo',
  /** What her mark did, said as the arithmetic behaves rather than as a reassurance. */
  'log.unexpected.marked': 'Guardado en tu registro. Emi no cuenta ningún ciclo desde este día.',
  'log.weight.heading': 'Peso',
  'log.weight.hint': 'Un número al día',

  'onboarding.back': 'Atrás',
  'onboarding.birthYear.action': 'Continuar',
  'onboarding.birthYear.line.years':
    'El ciclo cambia con los años, así que ayuda saber dónde estás.',
  'onboarding.birthYear.title': '¿En qué año naciste?',
  'onboarding.birthYear.titleNamed': 'Nos alegra conocerte, {name}. ¿En qué año naciste?',
  'onboarding.birthYear.year': 'Año {year}',
  'onboarding.cycleLength.action': 'Más o menos eso',
  'onboarding.cycleLength.days': '{count} días',
  'onboarding.cycleLength.line.count':
    'Del primer día de un periodo al día anterior al siguiente. Con aproximarlo vale.',
  'onboarding.cycleLength.line.corrects':
    'Cuando hayamos visto dos de tus ciclos, usaremos tu número de verdad.',
  'onboarding.cycleLength.longer': 'Un día más',
  'onboarding.cycleLength.shorter': 'Un día menos',
  'onboarding.cycleLength.title': '¿Cuánto dura tu ciclo, normalmente?',
  'onboarding.feeling.action': 'Continuar',
  'onboarding.feeling.choice.fine': 'Estoy bien con ello',
  'onboarding.feeling.choice.hard': 'La verdad, es difícil casi todos los meses',
  'onboarding.feeling.choice.understand': 'Quiero entenderlo mejor',
  'onboarding.feeling.line.talks': 'Tu respuesta cambia cómo te hablamos, y nada más.',
  'onboarding.feeling.reply.fine': 'Entonces seremos breves.',
  'onboarding.feeling.reply.hard':
    'Te escuchamos. Te mostramos cuándo llega, para que puedas organizarte.',
  'onboarding.feeling.reply.understand':
    'Estás en el sitio adecuado. Cuanto más anotes, más sentido tendrá.',
  'onboarding.feeling.title': '¿Cómo te sientes con tu periodo?',
  'onboarding.firstForecast.action': 'Continuar',
  'onboarding.firstForecast.line.learning':
    'Emi todavía está aprendiendo. Después de dos ciclos dice cuánta confianza tiene.',
  'onboarding.firstForecast.noDate.cycles': {
    one: 'Emi necesita {count} ciclo completo antes de hacer una previsión.',
    other: 'Emi necesita {count} ciclos completos antes de hacer una previsión.',
  },
  'onboarding.firstForecast.noDate.first': 'La primera regla que registres lo empieza todo.',
  'onboarding.firstForecast.noDate.guess':
    'Emi no hace ninguna previsión a partir de una fecha que haya supuesto, porque una suposición el primer día es una frase falsa el primer día.',
  'onboarding.firstForecast.noDate.title': 'Emi no tiene una fecha desde la que contar',
  'onboarding.firstForecast.onThisPhone.line':
    'Emi calcula el rango en este teléfono, con las fechas que diste.',
  'onboarding.firstForecast.onThisPhone.title': 'Calculado en este teléfono',
  'onboarding.firstForecast.title': 'Tu próxima regla',
  'onboarding.firstForecast.why.line':
    'Un ciclo puede moverse unos días de un mes al siguiente. Un rango lo dice. Una sola fecha lo escondería.',
  'onboarding.firstForecast.why.title': '¿Por qué un rango?',
  'onboarding.focus.action': 'Continuar',
  'onboarding.focus.line.first': 'Lo pondremos primero cuando anotes tu día.',
  'onboarding.focus.line.privacy': 'Puedes cambiarlo cuando quieras en Privacidad.',
  'onboarding.focus.title': '¿Tu ciclo cambia algo de esto?',
  'onboarding.goals.action': 'Continuar',
  'onboarding.goals.choice.doctorRecord': 'Llevar un registro para mi médico',
  'onboarding.goals.choice.fertileWindow': 'Ver mi ventana fértil, como estimación',
  'onboarding.goals.choice.forecast': 'Saber cuándo va a llegar mi periodo',
  'onboarding.goals.choice.symptoms': 'Entender mis síntomas',
  'onboarding.goals.line.chooseAll': 'Elige todas las que quieras.',
  'onboarding.goals.title': '¿Con qué te gustaría que te ayudemos?',
  'onboarding.hold.action': 'Mantén para empezar',
  'onboarding.hold.held': 'Manteniendo',
  'onboarding.hold.instruction': 'Mantén pulsado el anillo para empezar.',
  'onboarding.hold.refused': 'Emi no guardó nada. Mantén pulsado el anillo otra vez.',
  'onboarding.hold.sealed':
    'Al mantener el anillo se guardan tus respuestas, cifradas con tu clave. Emi crea la clave y la guarda en el llavero de este teléfono.',
  'onboarding.hold.title': 'Tu ciclo, tus datos, tu clave.',
  'onboarding.lastPeriod.action': 'Continuar',
  'onboarding.lastPeriod.earlier': 'Anterior',
  'onboarding.lastPeriod.earlierMonth': 'Mes anterior',
  'onboarding.lastPeriod.later': 'Siguiente',
  'onboarding.lastPeriod.laterMonth': 'Mes siguiente',
  'onboarding.lastPeriod.line.remember':
    'Toca el primer día que sangraste. Con acercarte es suficiente.',
  'onboarding.lastPeriod.title': '¿Cuándo empezó tu último periodo?',
  'onboarding.name.action': 'Continuar',
  'onboarding.name.hint': 'Tu nombre de pila',
  'onboarding.name.label': 'Tu nombre',
  'onboarding.name.line.greets':
    'Para poder saludarte. Tu nombre se queda en tu pantalla de inicio y en ningún otro sitio.',
  'onboarding.name.title': '¿Cómo quieres que te llamemos?',
  'onboarding.name.tooLong': {
    one: 'Los nombres admiten hasta {count} carácter.',
    other: 'Los nombres admiten hasta {count} caracteres.',
  },
  'onboarding.onlyYou': 'Solo tú puedes leer esto.',
  'onboarding.periodBefore.action': 'Añadirlo',
  'onboarding.periodBefore.between': {
    one: '{count} día de diferencia',
    other: '{count} días de diferencia',
  },
  'onboarding.periodBefore.line.remember':
    'Si recuerdas cuándo empezó, tu primera previsión será más cercana.',
  'onboarding.periodBefore.outOfRange':
    'Los ciclos duran de {minimum} a {maximum} días. Prueba un día en ese rango.',
  'onboarding.periodBefore.skip': 'No me acuerdo',
  'onboarding.periodBefore.title': '¿Y el anterior a ese?',
  'onboarding.periodLength.action': 'Hecho',
  'onboarding.periodLength.days': { one: '{count} día', other: '{count} días' },
  'onboarding.periodLength.line.count': 'Del primer día de sangrado al último.',
  'onboarding.periodLength.line.logged': 'Cuando hayas anotado unos cuantos, usaremos esos.',
  'onboarding.periodLength.longer': 'Un día más',
  'onboarding.periodLength.shorter': 'Un día menos',
  'onboarding.periodLength.skip': 'No lo sé',
  'onboarding.periodLength.title': '¿Cuántos días suele durar tu periodo?',
  'onboarding.promise.action': 'Continuar',
  'onboarding.promise.delete.line': 'Borrar todo quita cada día de este teléfono.',
  'onboarding.promise.delete.title': 'Borrar todo, con una pulsación',
  'onboarding.promise.encrypted.line':
    'Emi cifra cada día en el teléfono, con una clave que se queda en el teléfono, y solo envía el resultado.',
  'onboarding.promise.encrypted.title':
    'Cifrado en este teléfono, con una clave que solo tienes tú',
  'onboarding.promise.noTracking.line':
    'Emi no te pide ninguna contraseña y no lleva herramientas de seguimiento.',
  'onboarding.promise.noTracking.title': 'Sin contraseña, sin herramientas de seguimiento',
  'onboarding.promise.title': 'Solo tú puedes leer tus días.',
  'onboarding.regularity.action': 'Continuar',
  'onboarding.regularity.choice.moves': 'No, se mueve bastante',
  'onboarding.regularity.choice.regular': 'Sí, casi siempre',
  'onboarding.regularity.choice.unknown': 'Todavía no lo sé',
  'onboarding.regularity.line.explains':
    'Regular quiere decir que llega más o menos cada mismo número de días.',
  'onboarding.regularity.reply.moves':
    'Es muy común. Empezamos con un rango más amplio y lo estrechamos cuando conozcamos el tuyo.',
  'onboarding.regularity.reply.regular':
    'Bien saberlo. Aun así te mostramos un rango, porque incluso un ciclo regular se mueve un poco.',
  'onboarding.regularity.reply.unknown': 'No pasa nada. Tu registro nos lo dirá pronto.',
  'onboarding.regularity.title': '¿Tu ciclo es regular?',
  'onboarding.skip': 'Omitir',
  'onboarding.step': 'Paso {step} de {of}',
  'onboarding.today.action': 'Guardar',
  'onboarding.today.choice.bloating': 'Hinchazón',
  'onboarding.today.choice.calm': 'Calma',
  'onboarding.today.choice.cramps': 'Cólicos',
  'onboarding.today.choice.fatigue': 'Cansada',
  'onboarding.today.choice.headache': 'Dolor de cabeza',
  'onboarding.today.choice.low-mood': 'Bajón',
  'onboarding.today.line.skip': 'Elige lo que encaje, o sáltalo.',
  'onboarding.today.skip': 'Nada hoy',
  'onboarding.today.title': '¿Cómo te sientes hoy?',
  'onboarding.today.titleNamed': '{name}, ¿cómo te sientes hoy?',
  'onboarding.tour.back': 'Atrás',
  'onboarding.tour.count': '{step} de {of}',
  'onboarding.tour.range.action': 'Siguiente',
  'onboarding.tour.range.line.arithmetic':
    'Todo es aritmética sobre tus propios registros. Emi no es un anticonceptivo. Emi no es un dispositivo médico.',
  'onboarding.tour.range.line.confidence':
    'Al lado te decimos cuánta certeza tenemos, y de cuántos de tus ciclos viene.',
  'onboarding.tour.range.line.learning':
    'Después de dos ciclos completos, el pronóstico se construye con los tuyos. Hasta entonces contamos con la duración de ciclo que nos digas.',
  'onboarding.tour.range.line.range':
    'Tu próximo periodo llegará entre dos días. Te mostramos los dos, porque el cuerpo no llega al día exacto.',
  'onboarding.tour.range.title': 'Un rango, no una adivinanza.',
  'onboarding.tour.records.action': 'Siguiente',
  'onboarding.tour.records.line.log':
    'Registra tu flujo, ánimo, energía, sueño, temperatura, peso y más de 70 síntomas, todo en una hoja.',
  'onboarding.tour.records.line.patterns':
    'Después de seis ciclos te mostramos los síntomas que volvieron en el mismo punto en al menos tres de ellos. Un día malo es solo un día malo, y no lo llamamos un patrón.',
  'onboarding.tour.records.title': 'Cuéntale cómo te sientes. Mira lo que vuelve.',
  'onboarding.tour.ring.action': 'Siguiente',
  'onboarding.tour.ring.line.arcs':
    'Los cuatro colores son las cuatro partes de tu ciclo: tu periodo, los días que vienen después, los días alrededor de la ovulación y los días antes de tu próximo periodo.',
  'onboarding.tour.ring.line.ring':
    'El punto es hoy. El número que hay dentro te dice en qué día de tu ciclo estás.',
  'onboarding.tour.ring.title': 'Este anillo es tu ciclo.',
  'onboarding.tour.skip': 'Omitir',
  'onboarding.tour.yours.action': 'Continuar',
  'onboarding.tour.yours.line.encrypted':
    'Todo lo que registras se cifra en este teléfono, con una clave que nunca sale de él. Nuestro servidor solo guarda una copia cerrada que no puede abrir.',
  'onboarding.tour.yours.line.price':
    'Tu primer mes es gratis, después cuesta 29,99 libras al año. No hay versión gratuita, porque una aplicación gratuita se paga con tus datos.',
  'onboarding.tour.yours.line.recovery':
    'Guarda tu código de recuperación y tu historial te sigue a un teléfono nuevo. No podemos abrir tu historial, así que no podemos entregarlo a nadie.',
  'onboarding.tour.yours.title': 'Tus días son solo tuyos.',
  'onboarding.welcome.action': 'Empecemos',
  'onboarding.welcome.line.noAccount': 'Sin cuenta, sin correo, sin contraseña.',
  'onboarding.welcome.line.onThisPhone':
    'Todo se calcula en este teléfono. Emi no es un anticonceptivo. Emi no es un dispositivo médico.',
  'onboarding.welcome.line.questions':
    'Vamos a conocer tu ciclo. Son unas preguntas, y puedes saltarte cualquiera.',
  'onboarding.welcome.title': '¡Hola, bienvenida a Emi!',
  'onboarding.whatEmiDoes.action': 'Continuar',
  'onboarding.whatEmiDoes.forecast.line':
    'Primero un rango. Se estrecha a medida que Emi aprende tus ciclos.',
  'onboarding.whatEmiDoes.forecast.title': 'Tu previsión: un rango, y qué seguridad tiene Emi',
  'onboarding.whatEmiDoes.log.and': 'y',
  'onboarding.whatEmiDoes.log.chosen': {
    one: '{groups} va primero cuando anotas un día, como elegiste.',
    other: '{groups} van primero cuando anotas un día, como elegiste.',
  },
  'onboarding.whatEmiDoes.log.title': 'Tu registro: lo que ves primero',
  'onboarding.whatEmiDoes.log.usual': 'El registro se abre en su orden habitual.',
  'onboarding.whatEmiDoes.privacy.line': 'Cifrado en este teléfono. Nadie más puede leerlo.',
  'onboarding.whatEmiDoes.privacy.title': 'Tu privacidad: solo tú puedes leer nada de esto',
  'onboarding.whatEmiDoes.title': 'Esto es lo que Emi hace con lo que le contaste',

  'recovery.before.action': 'Mostrar mi código',
  'recovery.before.line.nobody':
    'Nadie en Emi puede recuperarlo por ti. Una Emi que pudiera recuperar tu código sería una Emi que podría leer tus días.',
  'recovery.before.line.onlyWay':
    'Emi está a punto de mostrarte un código de recuperación. Es la única forma de volver a tus ciclos si pierdes este teléfono.',
  'recovery.before.line.paper':
    'Escríbelo en papel. Guarda el papel donde guardas otros papeles que importan.',
  'recovery.before.title': 'Tus datos están atados a este teléfono',
  'recovery.code.action': 'Lo he escrito',
  'recovery.code.line.once':
    '{count} caracteres. Emi los muestra una vez y no los guarda en ninguna parte.',
  'recovery.code.line.writeDown':
    'Escríbelos ahora. La siguiente pantalla te pide que los escribas de nuevo.',
  'recovery.code.title': 'Tu código de recuperación',
  'recovery.confirm.action': 'Hecho',
  'recovery.confirm.label': 'Tu código de recuperación de {count} caracteres',
  'recovery.confirm.line.checks': 'Emi compara lo que escribes con el código que te mostró.',
  'recovery.confirm.line.case':
    'Emi lee las mayúsculas y las minúsculas igual, y no tiene en cuenta los espacios que pongas.',
  'recovery.confirm.title': 'Escribe el código de nuevo',
  'recovery.confirm.wrong':
    'Ese no es el código que Emi te mostró. Léelo del papel y escríbelo otra vez.',
  'recovery.step': 'Paso {step} de {of}',

  'settings.answer.back': 'Atrás',
  'settings.answer.cancel': 'Cancelar',
  'settings.answer.gaveAtFirstRun': 'Al empezar indicaste {answer}.',
  'settings.answer.save': 'Guardar',
  'settings.answers.back': 'Atrás',
  'settings.answers.birthYear': 'Año de nacimiento',
  'settings.answers.cycleLength': 'Duración del ciclo',
  'settings.answers.feeling': 'Cómo te sientes con ello',
  'settings.answers.focus': 'Qué cambia con tu ciclo',
  'settings.answers.goals': 'Para qué quieres Emi',
  'settings.answers.goalsChosen': '{chosen} de {of}',
  'settings.answers.name': 'Tu nombre',
  'settings.answers.periodLength': 'Duración del periodo',
  'settings.answers.regularity': 'Regular',
  'settings.answers.title': 'Tus respuestas',
  'settings.delete.action': 'Borrarlo todo',
  'settings.delete.back': 'Atrás',
  'settings.delete.goes.account': 'Tu cuenta en el servidor, y todos los días que guarda',
  'settings.delete.goes.cycles': 'Los ciclos que Emi calculó a partir de ellos',
  'settings.delete.goes.days': 'Todos los días que registraste en este teléfono',
  'settings.delete.goes.key': 'La clave que abre cualquiera de esas cosas',
  'settings.delete.goes.settings': 'Tus ajustes',
  'settings.delete.line':
    'Una pulsación y desaparece. No hay vuelta atrás, ni periodo de espera, y nadie en Emi puede recuperarlo, porque nadie en Emi puede leerlo.',
  'settings.delete.refused':
    'Tus días ya no están. Este teléfono no ha soltado una cosa que Emi guarda en el llavero. Pulsa otra vez.',
  'settings.delete.title': 'Borrarlo todo',
  'settings.delete.working': 'Borrando',
  'settings.deleted.action': 'Empezar de nuevo',
  'settings.deleted.line':
    'Este teléfono no guarda nada sobre ti. Emi empieza desde un anillo vacío.',
  'settings.deleted.title': 'Ya no está.',
  'settings.deleted.withoutTheServer':
    'Emi no pudo llegar al servidor para quitar tu cuenta de él. Nada puede abrir lo que hay allí ahora: la única clave estaba en este teléfono, y se fue con tus días.',
  'settings.settings.answers': 'Tus respuestas',
  'settings.settings.answersLine': 'Las ocho cosas que le contaste a Emi al empezar',
  'settings.settings.back': 'Atrás',
  'settings.settings.delete': 'Borrarlo todo',
  'settings.settings.deleteLine': 'Una pulsación, y no hay vuelta atrás',
  'settings.settings.export': 'Exportar',
  'settings.settings.exportLine': 'Dos archivos, creados en este teléfono',
  'settings.settings.lock': 'Bloqueo',
  'settings.settings.lockLine': 'Activado, con tu cara o tu código de acceso',
  'settings.settings.title': 'Privacidad',
  'tab.insights': 'Análisis',
  'tab.log': 'Registro',
  'tab.privacy': 'Privacidad',
  'tab.today': 'Hoy',
};
