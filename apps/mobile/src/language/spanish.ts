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
  'calendar.today': 'Hoy',
  'calendar.weekday.friday': 'Viernes',
  'calendar.weekday.monday': 'Lunes',
  'calendar.weekday.saturday': 'Sábado',
  'calendar.weekday.sunday': 'Domingo',
  'calendar.weekday.thursday': 'Jueves',
  'calendar.weekday.tuesday': 'Martes',
  'calendar.weekday.wednesday': 'Miércoles',
  'calendar.yesterday': 'Ayer',

  'cycle.noRing.line': 'El anillo necesita un periodo. Registra un día en que sangraste y aparece.',
  'cycle.noRing.title': 'Todavía no hay nada que dibujar',
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
    one: 'Emi necesita {count} ciclo completo más antes de hacer una previsión.',
    other: 'Emi necesita {count} ciclos completos más antes de hacer una previsión.',
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
  'history.patternsWaiting': {
    one: 'Emi nombra un síntoma cuando ha vuelto en {needs} ciclos. {count} de los tuyos está completo.',
    other:
      'Emi nombra un síntoma cuando ha vuelto en {needs} ciclos. {count} de los tuyos están completos.',
  },
  'history.patterns': 'Lo que vuelve',
  'history.running': 'Todavía en curso',
  'history.runningWithPeriod': '{running}, {periodDays} de sangrado hasta ahora',
  'history.title': 'Historial',

  'home.export': 'Exportar',
  'home.greeting': 'Hola, {name}',
  'home.history': 'Historial',
  'home.logToday': 'Registrar hoy',
  'home.settings': 'Ajustes',
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
  'onboarding.birthYear.line.sealed':
    'Emi cifra esto en el teléfono antes de que salga a ningún sitio.',
  'onboarding.birthYear.title': '¿En qué año naciste?',
  'onboarding.birthYear.year': 'Año {year}',
  'onboarding.cycleLength.action': 'Hecho',
  'onboarding.cycleLength.days': '{count} días',
  'onboarding.cycleLength.line.count':
    'Cuenta desde el primer día de un periodo hasta el día anterior al siguiente.',
  'onboarding.cycleLength.line.corrects':
    'Emi lo sustituye por tu propio número en cuanto ha visto dos ciclos.',
  'onboarding.cycleLength.longer': 'Un día más',
  'onboarding.cycleLength.shorter': 'Un día menos',
  'onboarding.cycleLength.title': '¿Cuánto dura tu ciclo, más o menos?',
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
  'onboarding.lastPeriod.line.privacy':
    'Emi cifra esto en el teléfono antes de que salga a ningún sitio.',
  'onboarding.lastPeriod.line.remember':
    'El primer día que sangraste. El día más cercano que recuerdes es suficiente.',
  'onboarding.lastPeriod.title': '¿Cuándo empezó tu último periodo?',
  'onboarding.name.action': 'Continuar',
  'onboarding.name.hint': 'Un nombre, o nada',
  'onboarding.name.label': 'Tu nombre',
  'onboarding.name.line.greets': 'Emi te saluda con él. Nada más lo usa.',
  'onboarding.name.line.sealed': 'Emi cifra esto en el teléfono antes de que salga a ningún sitio.',
  'onboarding.name.title': '¿Cómo quieres que Emi te llame?',
  'onboarding.name.tooLong': {
    one: 'Un nombre tiene como máximo {count} carácter.',
    other: 'Un nombre tiene como máximo {count} caracteres.',
  },
  'onboarding.periodBefore.action': 'Añadirlo',
  'onboarding.periodBefore.between': {
    one: '{count} día entre ellos',
    other: '{count} días entre ellos',
  },
  'onboarding.periodBefore.line.remember': '¿Recuerdas cuándo empezó el periodo anterior a ese?',
  'onboarding.periodBefore.line.surer':
    'Cada uno que añadas hace más certera la primera previsión.',
  'onboarding.periodBefore.outOfRange':
    'Un ciclo dura de {minimum} a {maximum} días. Elige un día en ese rango.',
  'onboarding.periodBefore.skip': 'No me acuerdo',
  'onboarding.periodBefore.title': 'El periodo anterior',
  'onboarding.periodLength.action': 'Hecho',
  'onboarding.periodLength.days': { one: '{count} día', other: '{count} días' },
  'onboarding.periodLength.line.count': 'Desde el primer día de sangrado hasta que para.',
  'onboarding.periodLength.line.logged':
    'Emi usa los días que registras, en cuanto empieces a registrarlos.',
  'onboarding.periodLength.longer': 'Un día más',
  'onboarding.periodLength.shorter': 'Un día menos',
  'onboarding.periodLength.skip': 'No lo sé',
  'onboarding.periodLength.title': '¿Cuántos días suele durar tu periodo?',
  'onboarding.regularity.action': 'Continuar',
  'onboarding.regularity.choice.moves': 'No, se mueve',
  'onboarding.regularity.choice.regular': 'Sí, casi todos los meses',
  'onboarding.regularity.choice.unknown': 'Todavía no lo sé',
  'onboarding.regularity.line.explains': 'Esto solo cambia cómo Emi explica tu previsión.',
  'onboarding.regularity.title': 'Regular',
  'onboarding.skip': 'Omitir',
  'onboarding.step': 'Paso {step} de {of}',
  'onboarding.tour.back': 'Atrás',
  'onboarding.tour.count': '{step} de {of}',
  'onboarding.tour.range.action': 'Siguiente',
  'onboarding.tour.range.line.arithmetic':
    'Esto es aritmética sobre tus propios registros. Emi no es un anticonceptivo. Emi no es un dispositivo médico.',
  'onboarding.tour.range.line.confidence':
    'Junto al rango escribe confianza alta, media o baja, y cuántos ciclos tuyos contó.',
  'onboarding.tour.range.line.learning':
    'Emi necesita 2 ciclos completos antes de hacer un pronóstico. Hasta entonces dice que todavía está aprendiendo, y cuenta con la duración de ciclo que le des.',
  'onboarding.tour.range.line.range':
    'Emi dice que tu próximo periodo cae entre dos días. Nunca nombra un solo día, porque un día que nombra es un día en el que puede equivocarse.',
  'onboarding.tour.range.title': 'Un rango, y cuánta certeza tiene Emi.',
  'onboarding.tour.records.action': 'Siguiente',
  'onboarding.tour.records.line.log':
    'Registra flujo, ánimo, energía, temperatura, peso y más de 70 síntomas, en una sola hoja.',
  'onboarding.tour.records.line.patterns':
    'Después de seis ciclos Emi nombra los síntomas que volvieron en el mismo punto en 3 de ellos o más. Un síntoma que registraste una vez no es un patrón, y Emi no lo llama así.',
  'onboarding.tour.records.title': 'Lo que escribes, leído de vuelta.',
  'onboarding.tour.ring.action': 'Siguiente',
  'onboarding.tour.ring.line.arcs':
    'Cuatro arcos dividen el anillo: los días que sangras, los días que vienen después, los días alrededor de la ovulación, y los días antes de tu próximo periodo.',
  'onboarding.tour.ring.line.ring':
    'El anillo es tu ciclo. Una cuenta marca hoy, y el número que hay dentro es el día en el que estás.',
  'onboarding.tour.ring.title': 'Tu ciclo, en un solo anillo.',
  'onboarding.tour.skip': 'Omitir',
  'onboarding.tour.yours.action': 'Continuar',
  'onboarding.tour.yours.line.encrypted':
    'Cada día que registras se cifra en este teléfono, con una clave que nunca sale de él. El servidor guarda el resultado y no puede leer ni un solo día.',
  'onboarding.tour.yours.line.price':
    'Un mes gratis, después 29,99 libras al año. No hay versión gratuita, porque una versión gratuita se paga con tus datos.',
  'onboarding.tour.yours.line.recovery':
    'Un código de recuperación que guardas lleva tu historial a un teléfono nuevo. Nadie en Emi puede abrir tu historial, así que nadie en Emi puede entregarlo.',
  'onboarding.tour.yours.title': 'Tuyo, y sigue siendo tuyo.',
  'onboarding.welcome.action': 'Continuar',
  'onboarding.welcome.line.noAccount':
    'No hay ninguna cuenta. Emi nunca te pide tu correo electrónico ni una contraseña.',
  'onboarding.welcome.line.nothingSent':
    'Tu ciclo se calcula en este teléfono. No se envía nada a ninguna parte.',
  'onboarding.welcome.line.showsYou':
    'Emi te muestra lo que dicen tus propios registros, y nada más. Emi no es un anticonceptivo. Emi no es un dispositivo médico.',
  'onboarding.welcome.title': 'Emi aprende tu ciclo. Tus datos son tuyos.',

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
  'settings.settings.back': 'Atrás',
  'settings.settings.delete': 'Borrarlo todo',
  'settings.settings.title': 'Ajustes',
  'tab.insights': 'Análisis',
  'tab.log': 'Registro',
  'tab.privacy': 'Privacidad',
  'tab.today': 'Hoy',
};
