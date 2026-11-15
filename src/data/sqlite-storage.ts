import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { LocalStorage } from '../domain/local-storage';
import { applyMutation, emptyCollection, collectionTables, type CollectionData, type CollectionMutation } from '../domain/collection';
import { sqliteVersion2, sqliteVersion3 } from './sqlite-schema';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const DATABASE = 'minha_jornada_pelo_cafe';

export class SQLiteStorage implements LocalStorage {
  readonly engine = 'sqlite';
  private readonly connections = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;
  private operations: Promise<unknown> = Promise.resolve();

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operations.then(operation);
    this.operations = result.catch(() => undefined);
    return result;
  }

  async initialize(): Promise<void> {
    if (this.database) return;
    await this.connections.addUpgradeStatement(DATABASE, [{ toVersion: 2, statements: sqliteVersion2 }, { toVersion: 3, statements: sqliteVersion3 }]);
    const consistent = (await this.connections.checkConnectionsConsistency()).result;
    const exists = (await this.connections.isConnection(DATABASE, false)).result;
    const database = consistent && exists
      ? await this.connections.retrieveConnection(DATABASE, false)
      : await this.connections.createConnection(DATABASE, false, 'no-encryption', 3, false);
    try {
      await database.open();
      await database.execute('PRAGMA foreign_keys = ON;', false);
      // New databases start at user_version 3, so also install the schema on first creation.
      await database.execute([...sqliteVersion2, ...sqliteVersion3].join('\n'));
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

  private async readCollection(): Promise<CollectionData> {
    if (!this.database) throw new Error('Armazenamento não inicializado.');
    const data = emptyCollection();
    for (const table of collectionTables) {
      const result = await this.database.query(`SELECT payload FROM ${table};`);
      try { Object.assign(data, { [table]: (result.values ?? []).map(row => JSON.parse(row.payload)) }); }
      catch { throw new Error('Há um registro local inválido. Os dados não foram alterados.'); }
    }
    return data;
  }
  loadCollection(): Promise<CollectionData> { return this.serial(() => this.readCollection()); }

  mutateCollection(mutation: CollectionMutation): Promise<void> {
    return this.serial(async () => {
      const database = this.database;
      if (!database) throw new Error('Armazenamento não inicializado.');
      await database.beginTransaction();
      try {
        const data = await this.readCollection();
        const next = applyMutation(data, mutation);
        if (mutation.type === 'deleteCoffee') {
          await database.run('DELETE FROM packages WHERE coffee_id = ?;', [mutation.id], false);
          await database.run('DELETE FROM coffees WHERE id = ?;', [mutation.id], false);
        } else if (mutation.type === 'deleteRecord') await database.run('DELETE FROM records WHERE id = ?;', [mutation.id], false);
        else if (mutation.type === 'record') {
          const record = next.records.find(r => r.id === mutation.value.id)!;
          await database.run('INSERT INTO records (id,kind,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', [record.id, record.kind, JSON.stringify(record)], false);
        } else if (mutation.type === 'coffee') {
          const coffee = next.coffees.find(c => c.id === mutation.value.id)!;
          await database.run('INSERT INTO coffees (id,producer_id,property_id,origin_id,roaster_id,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET producer_id=excluded.producer_id,property_id=excluded.property_id,origin_id=excluded.origin_id,roaster_id=excluded.roaster_id,payload=excluded.payload;', [coffee.id, coffee.producerId ?? null, coffee.propertyId ?? null, coffee.originId ?? null, coffee.roasterId ?? null, JSON.stringify(coffee)], false);
        } else if (mutation.type === 'package') {
          const packet = next.packages.find(p => p.id === mutation.value.id)!;
          await database.run('INSERT INTO packages (id,coffee_id,initial_weight,remaining_weight,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET initial_weight=excluded.initial_weight,remaining_weight=excluded.remaining_weight,payload=excluded.payload;', [packet.id, packet.coffeeId, packet.initialWeight, packet.remainingWeight, JSON.stringify(packet)], false);
        }        else if (mutation.type === 'method') {
          const value = next.methods.find(v => v.id === mutation.value.id)!;
          await database.run('INSERT INTO methods (id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', [value.id, JSON.stringify(value)], false);
        } else if (mutation.type === 'technique') {
          const value = next.techniques.find(v => v.id === mutation.value.id)!;
          await database.run('INSERT INTO techniques (id,method_id,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET method_id=excluded.method_id,payload=excluded.payload;', [value.id, value.methodId ?? null, JSON.stringify(value)], false);
        } else if (mutation.type === 'recipe') {
          const value = next.recipes.find(v => v.id === mutation.value.id)!;
          await database.run('INSERT INTO recipes (id,family_id,version,previous_id,method_id,technique_id,coffee_id,payload) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET method_id=excluded.method_id,technique_id=excluded.technique_id,coffee_id=excluded.coffee_id,payload=excluded.payload;', [value.id, value.familyId, value.version, value.previousVersionId ?? null, value.methodId, value.techniqueId ?? null, value.coffeeId ?? null, JSON.stringify(value)], false);
        } else {
          const table = mutation.type === 'deleteMethod' ? 'methods' : mutation.type === 'deleteTechnique' ? 'techniques' : 'recipes';
          await database.run(`DELETE FROM ${table} WHERE id = ?;`, [mutation.id], false);
        }

        await database.commitTransaction();
      } catch (error) { await database.rollbackTransaction().catch(() => undefined); throw error; }
    });
  }

  private photoPath(id: string) {
    if (!/^[a-f\d-]{36}$/i.test(id)) throw new Error('Referência de fotografia inválida.');
    return `photos/${id}.jpg`;
  }
  async savePhoto(id: string, blob: Blob): Promise<void> {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Falha ao ler a fotografia.'));
      reader.readAsDataURL(blob);
    });
    await Filesystem.writeFile({ path: this.photoPath(id), directory: Directory.Data, data, recursive: true });
  }
  async photoUrl(id: string): Promise<string | undefined> {
    try {
      const path = this.photoPath(id);
      await Filesystem.stat({ path, directory: Directory.Data });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    } catch { return undefined; }
  }
  async deletePhoto(id: string): Promise<void> { await Filesystem.deleteFile({ path: this.photoPath(id), directory: Directory.Data }); }
}
