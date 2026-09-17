import type { Migration } from '../schema';

/**
 * A STRICT table converts a number written into a text column rather than refusing it, so a length
 * she stated is always text by the time it is read back. What STRICT cannot express is that a
 * setting carries something, and the checks below are that.
 */
const createSetting = `
CREATE TABLE setting (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  CHECK (length(key) > 0),
  CHECK (length(value) > 0)
) STRICT
`;

export const settingMigration: Migration = {
  version: 2,
  name: 'setting',
  statements: [createSetting],
};
