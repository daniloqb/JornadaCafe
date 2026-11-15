// SQLite user_version is managed by the native plugin; IndexedDB uses onupgradeneeded separately.
export const sqliteVersion2 = [
  'CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
  'CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL);',
  `CREATE TABLE IF NOT EXISTS coffees (id TEXT PRIMARY KEY NOT NULL, producer_id TEXT REFERENCES records(id) ON DELETE RESTRICT, property_id TEXT REFERENCES records(id) ON DELETE RESTRICT, origin_id TEXT REFERENCES records(id) ON DELETE RESTRICT, roaster_id TEXT REFERENCES records(id) ON DELETE RESTRICT, payload TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY NOT NULL, coffee_id TEXT NOT NULL REFERENCES coffees(id) ON DELETE CASCADE, initial_weight REAL NOT NULL CHECK(initial_weight > 0), remaining_weight REAL NOT NULL CHECK(remaining_weight >= 0 AND remaining_weight <= initial_weight), payload TEXT NOT NULL);`,
  'CREATE INDEX IF NOT EXISTS packages_coffee ON packages(coffee_id);',
  "UPDATE metadata SET value = '2' WHERE key = 'schema-version' AND value = '1';",
  "INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema-version', '2');",
];
