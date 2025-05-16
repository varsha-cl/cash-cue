import { PGlite } from "@electric-sql/pglite";
import { postgreIDBConnection } from "./idb";

// Store PGlite instances by database name
const pgliteInstances: Record<string, PGlite> = {};

/**
 * Get or create a PGlite instance for a database
 * This ensures we only create one instance per database
 */
export const getPGliteInstance = (dbName: string): PGlite => {
  if (!pgliteInstances[dbName]) {
    console.log(`Creating new PGlite instance for database: ${dbName}`);
    pgliteInstances[dbName] = new PGlite(postgreIDBConnection(dbName));
  } else {
    console.log(`Reusing existing PGlite instance for database: ${dbName}`);
  }
  
  return pgliteInstances[dbName];
};

/**
 * Clear a PGlite instance when a database is removed
 */
export const clearPGliteInstance = (dbName: string): void => {
  delete pgliteInstances[dbName];
}; 