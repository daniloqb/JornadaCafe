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

export const sqliteVersion3 = [
  'CREATE TABLE IF NOT EXISTS methods (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);',
  'CREATE TABLE IF NOT EXISTS techniques (id TEXT PRIMARY KEY NOT NULL, method_id TEXT REFERENCES methods(id) ON DELETE RESTRICT, payload TEXT NOT NULL);',
  `CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY NOT NULL, family_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0), previous_id TEXT REFERENCES recipes(id) ON DELETE RESTRICT, method_id TEXT NOT NULL REFERENCES methods(id) ON DELETE RESTRICT, technique_id TEXT REFERENCES techniques(id) ON DELETE RESTRICT, coffee_id TEXT REFERENCES coffees(id) ON DELETE RESTRICT, payload TEXT NOT NULL, UNIQUE(family_id, version));`,
  'CREATE INDEX IF NOT EXISTS recipes_method ON recipes(method_id);',
  'CREATE INDEX IF NOT EXISTS recipes_technique ON recipes(technique_id);',
  "UPDATE metadata SET value = '3' WHERE key = 'schema-version' AND value = '2';",
];
