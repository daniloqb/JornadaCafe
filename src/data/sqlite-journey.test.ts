import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { newEntity } from '../domain/collection';
import { sqliteVersion2, sqliteVersion3, sqliteVersion4 } from './sqlite-schema';
import { validateStorage } from '../domain/local-storage';

const native = vi.hoisted(() => ({
  open: vi.fn(), execute: vi.fn(), query: vi.fn(), run: vi.fn(), beginTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(),
}));
const upgrade = vi.hoisted(() => vi.fn());
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: class {
    addUpgradeStatement = upgrade;
    checkConnectionsConsistency = async () => ({ result: false });
    isConnection = async () => ({ result: false });
    createConnection = async () => native;
    closeConnection = async () => {};
  },
}));
import { SQLiteStorage } from './sqlite-storage';

describe('adaptador SQLite da Jornada com SQLite real no host', () => {
  it('registra upgrade 5, preserva payloads v4 e executa CRUD e avaliação em transações', async () => {
    const sql = new DatabaseSync(':memory:');
    const execute = (text: string) => { sql.exec(text); return Promise.resolve({}); };
    native.open.mockResolvedValue(undefined);
    native.execute.mockImplementation(execute);
    native.query.mockImplementation(async (text: string, values: (string | number | null)[] = []) => ({ values: sql.prepare(text).all(...values) }));
    native.run.mockImplementation(async (text: string, values: (string | number | null)[] = []) => ({ changes: sql.prepare(text).run(...values) }));
    native.beginTransaction.mockImplementation(() => execute('BEGIN'));
    native.commitTransaction.mockImplementation(() => execute('COMMIT'));
    native.rollbackTransaction.mockImplementation(() => execute('ROLLBACK'));
    const local = new SQLiteStorage();
    try {
      [...sqliteVersion2, ...sqliteVersion3, ...sqliteVersion4].forEach(s => sql.exec(s));
      const coffee = { ...newEntity(), name: 'Original', tried: false, favorite: false };
      sql.prepare('INSERT INTO coffees(id,payload) VALUES (?,?)').run(coffee.id, JSON.stringify(coffee));
      const preparation = { ...newEntity(), state: 'completed', snapshot: { coffee }, consumedGrams: 0 };
      sql.prepare('INSERT INTO preparations(id,payload) VALUES (?,?)').run(preparation.id, JSON.stringify(preparation));
      await validateStorage(local);
      expect(upgrade.mock.calls[0][1]).toEqual(expect.arrayContaining([expect.objectContaining({ toVersion: 5 })]));
      expect((await local.loadCollection()).coffees).toEqual([coffee]);
      const reflection = { ...newEntity(), occurredOn: '2026-11-16', text: 'Minha autoria.', association: { kind: 'coffee' as const, id: coffee.id } };
      await local.mutateCollection({ type: 'reflection', value: reflection });
      await local.close(); await validateStorage(local);
      expect((await local.loadCollection()).reflections[0].text).toBe(reflection.text);
      await local.mutateCollection({ type: 'deleteCoffee', id: coffee.id });
      await local.mutateCollection({ type: 'reflection', value: { ...reflection, title: 'Vínculo preservado' } });
      await expect(local.mutateCollection({ type: 'reflection', value: { ...reflection, text: '' } })).rejects.toThrow();
      expect((await local.loadCollection()).reflections[0].title).toBe('Vínculo preservado');
      const now = new Date().toISOString();
      await local.mutateCollection({ type: 'evaluatePreparation', id: preparation.id, value: { overall: 0, tags: ['Floral'], createdAt: now, updatedAt: now } });
      expect((await local.loadCollection()).preparations[0]).toMatchObject({ id: preparation.id, snapshot: preparation.snapshot, consumedGrams: 0, evaluation: { overall: 0, tags: ['Floral'] } });
      await local.mutateCollection({ type: 'deleteReflection', id: reflection.id });
      expect((await local.loadCollection()).reflections).toEqual([]);
    } finally { await local.close(); sql.close(); }
  });
});
