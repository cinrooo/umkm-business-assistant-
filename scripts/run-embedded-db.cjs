const { default: EmbeddedPostgres } = require('embedded-postgres');
const path = require('path');
const fs = require('fs');

async function main() {
  const dbDir = path.resolve(__dirname, '../.db_data');
  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'password',
    persistent: true,
  });

  const isInitialised = fs.existsSync(path.join(dbDir, 'PG_VERSION'));
  if (!isInitialised) {
    console.log('Initialising embedded Postgres in', dbDir);
    await pg.initialise();
  }

  console.log('Starting embedded Postgres...');
  await pg.start();
  console.log('Postgres started on port 5432!');

  try {
    await pg.createDatabase('umkm_assistant');
    console.log('Database umkm_assistant ready.');
  } catch (e) {
    console.log('Note on createDatabase:', e.message || e);
  }

  console.log('Embedded Postgres is active on localhost:5432.');
  
  // Keep process alive
  setInterval(() => {}, 60000);
}

main().catch(err => {
  console.error('Failed to start embedded Postgres:', err);
  process.exit(1);
});
