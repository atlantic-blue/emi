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
    delete: words('settings.settings.delete'),
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
