import pg from 'pg';
// This standalone example never selects a production/default database implicitly.
export function createPool() {
  const database = process.env.PGDATABASE;
  if (!database || !/^rainfrog_secret_reference(?:_test)?$/.test(database)) {
    throw new Error('Set PGDATABASE=rainfrog_secret_reference or rainfrog_secret_reference_test');
  }
  return new pg.Pool({ database });
}
