import { type ReactNode, createContext, useContext, useMemo } from 'react';

import type { Database } from './database';
import { openEmiDatabase } from './expoDatabase';
import { migrate } from './schema';

const DatabaseContext = createContext<Database | undefined>(undefined);

/** One database for the whole application, opened and migrated before any screen reads it. */
export function DatabaseProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useMemo(() => {
    const opened = openEmiDatabase();
    migrate(opened);
    return opened;
  }, []);

  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): Database {
  const database = useContext(DatabaseContext);
  if (!database) {
    throw new Error('a screen read the database from outside the database provider');
  }
  return database;
}
