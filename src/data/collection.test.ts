import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { IndexedDBStorage } from './indexeddb-storage';
import { sqliteVersion2 } from './sqlite-schema';
import { applyMutation, emptyCollection, inventory, newEntity, shelfCoffees, type Coffee, type CoffeePackage, type RelatedRecord } from '../domain/collection';
import { validateStorage } from '../domain/local-storage';

const opened: IndexedDBStorage[] = [];
const storage = () => { const store = new IndexedDBStorage(`phase2-${crypto.randomUUID()}`); opened.push(store); return store; };
const coffee = (): Coffee => ({ ...newEntity(), name: 'Café de teste', tried: false, favorite: false });
const packet = (coffeeId: string): CoffeePackage => ({ ...newEntity(), coffeeId, initialWeight: 250, remainingWeight: 250, adjustments: [] });
afterEach(async () => { await Promise.all(opened.splice(0).map(s => s.close())); });

describe('coleção e migração', () => {
  it('migra IndexedDB 1 → 4 sem perder metadados existentes', async () => {
    const name = `legacy-${crypto.randomUUID()}`;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => { const meta = request.result.createObjectStore('metadata'); meta.put('1', 'schema-version'); meta.put('preservar', 'existing'); };
      request.onsuccess = () => { request.result.close(); resolve(); }; request.onerror = () => reject(request.error);
    });
    const local = new IndexedDBStorage(name); opened.push(local);
    await validateStorage(local);
    expect(await local.getMetadata('existing')).toBe('preservar');
    expect(await local.getMetadata('schema-version')).toBe('4');
    expect(await local.loadCollection()).toEqual(emptyCollection());
  });
  it('persiste café sem pacote, relações, edição e fotografia separada após reabrir', async () => {
    const local = storage(); await validateStorage(local);
    const producer: RelatedRecord = { ...newEntity(), kind: 'producer', name: 'Família de teste' };
    await local.mutateCollection({ type: 'record', value: producer });
    const item = { ...coffee(), producerId: producer.id, photoId: crypto.randomUUID() };
    await local.savePhoto(item.photoId, new Blob(['image'], { type: 'image/jpeg' }));
    await local.mutateCollection({ type: 'coffee', value: item });
    await local.mutateCollection({ type: 'coffee', value: { ...item, name: 'Nome editado', tried: true } });
    await local.close(); await local.initialize();
    const data = await local.loadCollection();
    expect(data.coffees[0]).toMatchObject({ name: 'Nome editado', producerId: producer.id, tried: true });
    expect(data.packages).toHaveLength(0);
    const url = await local.photoUrl(item.photoId); expect(url).toMatch(/^blob:/); URL.revokeObjectURL(url!);
    await local.deletePhoto(item.photoId); expect(await local.photoUrl(item.photoId)).toBeUndefined();
  });
  it('calcula estoque de vários pacotes, mantém esgotados e registra motivos de correção', async () => {
    const local = storage(); await validateStorage(local);
    const item = coffee(); await local.mutateCollection({ type: 'coffee', value: item });
    const first = packet(item.id), second = packet(item.id);
    await local.mutateCollection({ type: 'package', value: first }); await local.mutateCollection({ type: 'package', value: second });
    await local.mutateCollection({ type: 'package', value: { ...first, remainingWeight: 50 }, reason: 'Acerto na balança' });
    await local.mutateCollection({ type: 'package', value: { ...second, remainingWeight: 0 } });
    const data = await local.loadCollection();
    expect(inventory(data, item.id)).toEqual({ total: 50, active: 1, everOwned: true });
    expect(data.packages).toHaveLength(2);
    expect(data.packages.find(p => p.id === first.id)?.adjustments[0].reason).toBe('Acerto na balança');
  });
  it('rejeita pesos inválidos, referência ausente e exclusão de produtor em uso; exclusão do café remove pacotes', async () => {
    const local = storage(); await validateStorage(local);
    const producer: RelatedRecord = { ...newEntity(), kind: 'producer', name: 'Produtor' };
    await local.mutateCollection({ type: 'record', value: producer });
    const item = { ...coffee(), producerId: producer.id };
    await local.mutateCollection({ type: 'coffee', value: item });
    for (const invalid of [{ initialWeight: 0, remainingWeight: 0 }, { initialWeight: 250, remainingWeight: -1 }, { initialWeight: 250, remainingWeight: 251 }]) {
      await expect(local.mutateCollection({ type: 'package', value: { ...packet(item.id), ...invalid } })).rejects.toThrow();
    }
    await expect(local.mutateCollection({ type: 'package', value: packet('missing') })).rejects.toThrow('não está disponível');
    await expect(local.mutateCollection({ type: 'deleteRecord', id: producer.id })).rejects.toThrow('está em uso');
    await local.mutateCollection({ type: 'package', value: packet(item.id) });
    await local.mutateCollection({ type: 'deleteCoffee', id: item.id });
    expect((await local.loadCollection()).packages).toHaveLength(0);
    await local.mutateCollection({ type: 'deleteRecord', id: producer.id });
    expect((await local.loadCollection()).records).toHaveLength(0);
  });
  it('permite ampliar explicitamente o peso inicial e mantém favorito sem estoque', () => {
    const item = { ...coffee(), favorite: true };
    let data = applyMutation(emptyCollection(), { type: 'coffee', value: item });
    const pack = packet(item.id);
    data = applyMutation(data, { type: 'package', value: pack });
    data = applyMutation(data, { type: 'package', value: { ...pack, initialWeight: 500, remainingWeight: 400 } });
    expect(inventory(data, item.id).total).toBe(400);
    data = applyMutation(data, { type: 'package', value: { ...pack, remainingWeight: 0 } });
    expect(shelfCoffees(data)[0].id).toBe(item.id);
  });
  it('aplica o SQL de migração preservando metadados e valida FKs e limites no SQLite', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec("PRAGMA foreign_keys=ON; CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO metadata VALUES ('schema-version','1'), ('existing','preservar'); PRAGMA user_version=1;");
      db.exec('BEGIN;'); for (const statement of sqliteVersion2) db.exec(statement); db.exec('PRAGMA user_version=2; COMMIT;');
      expect(db.prepare("SELECT value FROM metadata WHERE key='existing'").get()?.value).toBe('preservar');
      expect(db.prepare("SELECT value FROM metadata WHERE key='schema-version'").get()?.value).toBe('2');
      expect(() => db.exec("INSERT INTO packages VALUES ('p','missing',250,250,'{}')")).toThrow();
      db.exec("INSERT INTO records VALUES ('r','producer','{}'); INSERT INTO coffees VALUES ('c','r',NULL,NULL,NULL,'{}');");
      expect(() => db.exec("DELETE FROM records WHERE id='r'")).toThrow();
      expect(() => db.exec("INSERT INTO packages VALUES ('p','c',250,251,'{}')")).toThrow();
      db.exec("INSERT INTO packages VALUES ('p','c',250,100,'{}'); DELETE FROM coffees WHERE id='c';");
      expect(db.prepare('SELECT COUNT(*) AS count FROM packages').get()?.count).toBe(0);
    } finally { db.close(); }
  });
});
