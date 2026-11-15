import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { LocalStorage } from '../domain/local-storage';

const DATABASE = 'minha_jornada_pelo_cafe';

export class SQLiteStorage implements LocalStorage {
  readonly engine = 'sqlite';
  private readonly connections = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;

  async initialize(): Promise<void> {
    if (this.database) return;
    const consistent = (await this.connections.checkConnectionsConsistency()).result;
    const exists = (await this.connections.isConnection(DATABASE, false)).result;
    const database = consistent && exists
      ? await this.connections.retrieveConnection(DATABASE, false)
      : await this.connections.createConnection(DATABASE, false, 'no-encryption', 1, false);
    try {
      await database.open();
      await database.execute('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
      this.database = database;
    } catch (error) {
      await this.connections.closeConnection(DATABASE, false).catch(() => undefined);
      throw error;
    }
  }

  async getMetadata(key: string): Promise<string | undefined> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    const result = await this.database.query('SELECT value FROM metadata WHERE key = ?;', [key]);
    return result.values?.[0]?.value;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    await this.database.run('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);', [key, value]);
  }

  async close(): Promise<void> {
    await this.connections.closeConnection(DATABASE, false);
    this.database = undefined;
  }
}
