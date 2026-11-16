import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { applyMutation, emptyCollection, newEntity } from '../domain/collection';
import { type BrewRecipe, recalculateSteps } from '../domain/brewing';
import { makeSession, scaleStepWater } from '../domain/preparation';
import { BrewClock } from '../domain/brew-clock';
import { IndexedDBStorage } from './indexeddb-storage';
import { sqliteVersion2, sqliteVersion3, sqliteVersion4 } from './sqlite-schema';
import { validateStorage } from '../domain/local-storage';
const wall = Date.parse('2026-11-15T12:00:00Z');
function fixture() {
  const method = { ...newEntity(), name: 'Método de teste' };
  const coffee = { ...newEntity(), name: 'Café de teste', tried: false, favorite: false };
  const packet = { ...newEntity(), coffeeId: coffee.id, initialWeight: 250, remainingWeight: 50, adjustments: [] };
  const entity = newEntity();
  const recipe: BrewRecipe = { ...entity, familyId: entity.id, version: 1, name: 'Receita de teste', methodId: method.id, dose: 20, water: 300, steps: recalculateSteps([
    { id: 'a', order: 0, name: 'Pré-infusão', type: 'pour', water: 60, cumulativeWater: 0, advance: 'time', durationSeconds: 10 },
    { id: 'b', order: 1, name: 'Observar cama', type: 'pour', water: 120, cumulativeWater: 0, advance: 'observable', condition: 'Cama aparecendo', durationSeconds: 10 },
    { id: 'c', order: 2, name: 'Último despejo', type: 'pour', water: 120, cumulativeWater: 0, advance: 'manual', durationSeconds: 10 },
  ]) };
  let data = emptyCollection();
  data = applyMutation(data, { type: 'method', value: method }); data = applyMutation(data, { type: 'coffee', value: coffee }); data = applyMutation(data, { type: 'package', value: packet }); data = applyMutation(data, { type: 'recipe', value: recipe });
  const session = makeSession(data, recipe, coffee.id, packet.id, wall, 'running');
  return { data, method, coffee, packet, recipe, session };
}
describe('preparo e estoque', () => {
  it('confirma a revisão sem contar tempo nem avançar etapas antes de Iniciar, inclusive após recuperar', () => {
    const { data, recipe } = fixture();
    const session = makeSession(data, recipe, undefined, undefined, wall);
    const saved = applyMutation(data, { type: 'startSession', value: session });
    const clock = new BrewClock(saved.sessions[0], 0);
    expect(clock.tick(60000, wall + 60000).session).toMatchObject({ status: 'paused', elapsedMs: 0, stepIndex: 0, needsConfirmation: false });
    const recovered = BrewClock.recover(clock.read(60000, wall + 60000), 0, wall + 120000);
    expect(recovered.read(60000, wall + 180000)).toMatchObject({ status: 'paused', elapsedMs: 0, stepIndex: 0 });
    recovered.resume(60000, wall + 180000);
    expect(recovered.tick(61000, wall + 181000).session).toMatchObject({ status: 'running', elapsedMs: 1000, stepIndex: 0 });
    expect(saved.recipes).toEqual(data.recipes);
    expect(saved.preparations).toHaveLength(0);
  });
  it('usa tempo monotônico, respeita pausa e avança uma etapa automática; manual/observável aguardam', () => {
    const { session } = fixture(); const clock = new BrewClock(session, 0);
    clock.tick(1500, wall + 1500); clock.pause(2000, wall + 2000);
    expect(clock.read(12000, wall + 12000).elapsedMs).toBe(2000);
    clock.resume(12000, wall + 12000);
    for (let n=13000;n<=20000;n+=1000) clock.tick(n,wall+n);
    const current = clock.read(20000,wall+20000);
    expect(current.elapsedMs).toBe(10000); expect(current.stepIndex).toBe(1);
    clock.tick(21000,wall+21000);clock.tick(50000,wall+50000);
    expect(clock.read(50000,wall+50000).stepIndex).toBe(1);
    clock.next(50000,wall+50000);clock.tick(100000,wall+100000);
    expect(clock.read(100000,wall+100000).stepIndex).toBe(2);
    expect(clock.read(100000,wall+100000).executions[0].leftMs).toBe(10000);
  });
  it('retorna de suspensão sem pular despejos e recupera checkpoint ativo como pausado', () => {
    const { session } = fixture();const clock = new BrewClock(session, 0);
    clock.suspend(2000,wall+2000);clock.returnToForeground(2100,wall+32000);
    const current=clock.read(2100,wall+32000);
    expect(current.elapsedMs).toBe(32000);expect(current.stepIndex).toBe(0);expect(current.needsConfirmation).toBe(true);
    const recovered=BrewClock.recover(current,0,wall+42000).read(0,wall+42000);
    expect(recovered.elapsedMs).toBe(42000);expect(recovered.status).toBe('paused');expect(recovered.stepIndex).toBe(0);
    const delayed=new BrewClock(session,0);expect(delayed.tick(30000,wall+30000).session.needsConfirmation).toBe(true);
  });
  it('recalcula despejos somente por ação explícita, mantendo ordem/condições e fechando o total', () => {
    const { recipe } = fixture();const adjusted=scaleStepWater(recipe.steps,375);
    expect(adjusted.map(s=>s.water)).toEqual([75,150,150]);expect(adjusted.at(-1)?.cumulativeWater).toBe(375);
    expect(recipe.steps[0].water).toBe(60);expect(adjusted[1].condition).toBe('Cama aparecendo');
    expect(() => scaleStepWater([{ ...recipe.steps[0], water: NaN }], 375)).toThrow();
  });
  it('grava preparo/estoque uma única vez, recusa saldo insuficiente e preserva snapshot após editar café', async () => {
    const { data, session, packet, coffee } = fixture();const local=new IndexedDBStorage(`prep-${crypto.randomUUID()}`);
    try {
      await validateStorage(local);
      for(const value of data.methods)await local.mutateCollection({type:'method',value});
      await local.mutateCollection({type:'coffee',value:coffee});await local.mutateCollection({type:'package',value:packet});
      for(const value of data.recipes)await local.mutateCollection({type:'recipe',value});
      await local.mutateCollection({type:'startSession',value:session});
      const record=new BrewClock(session,0).preparation('completed','Primeiro',false,1000,wall+1000);
      await Promise.all([local.mutateCollection({type:'finishPreparation',value:record}),local.mutateCollection({type:'finishPreparation',value:record})]);
      let loaded=await local.loadCollection();expect(loaded.packages[0].remainingWeight).toBe(30);expect(loaded.preparations).toHaveLength(1);expect(loaded.sessions).toHaveLength(0);
      await local.mutateCollection({type:'coffee',value:{...coffee,name:'Nome novo'}});
      expect((await local.loadCollection()).preparations[0].snapshot.coffee?.name).toBe('Café de teste');
      const second=makeSession(loaded,loaded.recipes[0],coffee.id,packet.id,wall+2000);await local.mutateCollection({type:'startSession',value:second});
      await local.mutateCollection({type:'package',value:{...loaded.packages[0],remainingWeight:5}});
      const finish=new BrewClock(second,0).preparation('completed','',false,1000,wall+3000);
      await expect(local.mutateCollection({type:'finishPreparation',value:finish})).rejects.toThrow('estoque');
      loaded=await local.loadCollection();expect(loaded.preparations).toHaveLength(1);expect(loaded.sessions).toHaveLength(1);expect(loaded.packages[0].remainingWeight).toBe(5);
      await local.mutateCollection({type:'finishPreparation',value:{...finish,state:'interrupted',consumedGrams:0}});
      await local.close();await local.initialize();loaded=await local.loadCollection();expect(loaded.preparations).toHaveLength(2);expect(loaded.packages[0].remainingWeight).toBe(5);
      const newSession=makeSession(loaded,loaded.recipes[0]);await local.mutateCollection({type:'startSession',value:newSession});await local.mutateCollection({type:'discardSession',id:newSession.id});await local.mutateCollection({type:'checkpoint',value:newSession});expect((await local.loadCollection()).sessions).toHaveLength(0);
    } finally {await local.close();}
  });
  it('migra IndexedDB 3 → 4 mantendo receitas/metadados e acrescentando apenas preparos e sessão', async () => {
    const {data}=fixture();const name=`phase3-${crypto.randomUUID()}`;
    await new Promise<void>((resolve,reject)=>{const r=indexedDB.open(name,3);r.onupgradeneeded=()=>{const db=r.result;const meta=db.createObjectStore('metadata');meta.put('3','schema-version');meta.put('manter','custom');for(const table of ['coffees','packages','records','methods','techniques','recipes','photos'])db.createObjectStore(table,{keyPath:'id'});for(const recipe of data.recipes)r.transaction!.objectStore('recipes').put(recipe);};r.onsuccess=()=>{r.result.close();resolve();};r.onerror=()=>reject(r.error);});
    const local=new IndexedDBStorage(name);try{await validateStorage(local);const loaded=await local.loadCollection();expect(loaded.recipes).toEqual(data.recipes);expect(loaded.preparations).toEqual([]);expect(await local.getMetadata('custom')).toBe('manter');}finally{await local.close();}
  });
  it('migra SQLite 3 → 4 e reverte um desconto quando a gravação do preparo falha', () => {
    const db=new DatabaseSync(':memory:');try{
      db.exec('PRAGMA foreign_keys=ON;');[...sqliteVersion2,...sqliteVersion3].forEach(s=>db.exec(s));
      db.exec("INSERT INTO coffees VALUES ('c',NULL,NULL,NULL,NULL,'{}');INSERT INTO packages VALUES ('p','c',250,50,'{}');INSERT INTO methods VALUES ('m','{}');INSERT INTO recipes VALUES ('r','r',1,NULL,'m',NULL,NULL,'{}');");
      sqliteVersion4.forEach(s=>db.exec(s));expect(db.prepare("SELECT value FROM metadata WHERE key='schema-version'").get()?.value).toBe('4');expect(db.prepare('SELECT COUNT(*) AS n FROM recipes').get()?.n).toBe(1);
      db.exec("INSERT INTO preparations VALUES ('done','{}'); BEGIN;UPDATE packages SET remaining_weight=30 WHERE id='p';");expect(()=>db.exec("INSERT INTO preparations VALUES ('done','{}')")).toThrow();db.exec('ROLLBACK;');expect(db.prepare("SELECT remaining_weight FROM packages WHERE id='p'").get()?.remaining_weight).toBe(50);
    }finally{db.close();}
  });
});
