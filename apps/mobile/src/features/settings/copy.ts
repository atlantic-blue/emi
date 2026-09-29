import { words } from '../../language';

/**
 * The words of the settings screens. The delete screen says what goes and what it costs in the same
 * breath, and it never asks twice. Reaching the screen is the deliberate act; a second confirmation,
 * a countdown or a window in which she could change her mind would each be a way of keeping her data
 * after she asked for it to go.
 */
export const settingsCopy = {
  settings: {
    title: words('settings.settings.title'),
    back: words('settings.settings.back'),
    rows: {
      answers: {
        lead: words('settings.settings.answers'),
        line: words('settings.settings.answersLine'),
      },
      lock: {
        lead: words('settings.settings.lock'),
        line: words('settings.settings.lockLine'),
      },
      export: {
        lead: words('settings.settings.export'),
        line: words('settings.settings.exportLine'),
      },
      delete: {
        lead: words('settings.settings.delete'),
        line: words('settings.settings.deleteLine'),
      },
    },
  },
  delete: {
    title: words('settings.delete.title'),
    line: words('settings.delete.line'),
    goes: [
      words('settings.delete.goes.days'),
      words('settings.delete.goes.cycles'),
      words('settings.delete.goes.settings'),
      words('settings.delete.goes.key'),
      words('settings.delete.goes.account'),
    ],
    action: words('settings.delete.action'),
    back: words('settings.delete.back'),
    working: words('settings.delete.working'),
    refused: words('settings.delete.refused'),
  },
  deleted: {
    title: words('settings.deleted.title'),
    line: words('settings.deleted.line'),
    action: words('settings.deleted.action'),
    withoutTheServer: words('settings.deleted.withoutTheServer'),
  },
} as const;

/**
 * The words of the screen that reads her first run back to her. The lead of a row is the
 * question she was asked, shortened to what fits a row, so she recognises the answer under it as
 * the one she gave.
 */
export const yourAnswersCopy = {
  title: words('settings.answers.title'),
  back: words('settings.answers.back'),
  rows: {
    name: words('settings.answers.name'),
    birthYear: words('settings.answers.birthYear'),
    cycleLength: words('settings.answers.cycleLength'),
    periodLength: words('settings.answers.periodLength'),
    regularity: words('settings.answers.regularity'),
    feeling: words('settings.answers.feeling'),
    goals: words('settings.answers.goals'),
    focus: words('settings.answers.focus'),
  },
} as const;

/** How many of the four she chose, which is what the drawing reads back rather than the list. */
export function goalsChosenLabel(chosen: number, of: number): string {
  return words('settings.answers.goalsChosen', undefined, { chosen, of });
}

/**
 * The words of a screen where she changes one answer. The question itself, the lines under it and
 * the stepper's own labels are not here: they come from the first run, because this screen asks
 * the same question with the same control and giving it a second wording would make it a second
 * question.
 */
export const answerCopy = {
  back: words('settings.answer.back'),
  cancel: words('settings.answer.cancel'),
  save: words('settings.answer.save'),
} as const;

/** What she gave the first time, said under the control she is changing it with. */
export function gaveAtFirstRunSentence(answer: string): string {
  return words('settings.answer.gaveAtFirstRun', undefined, { answer });
}
