import { describe, expect, it } from 'vitest';
import type { Preparation } from '../../domain/preparation';
import { newEntity } from '../../domain/collection';
import { emptyHistoryFilters, historyBounds, historyDay, historyOptions, historyRows, preparationScore } from './history-view';

function row(id: string, startedAt: string, coffee = 'c1', method = 'm1'): Preparation {
  const e = newEntity();
  return { ...e, id, startedAt, finishedAt: startedAt, elapsedMs: 0, consumedGrams: 0, executions: [], state: 'completed', snapshot: {
    coffee: { ...e, id: coffee, name: `Café histórico ${coffee}`, tried: true, favorite: false, ratings: { overall: 10 } },
    method: { ...e, id: method, name: `Método histórico ${method}` },
    recipe: { ...e, id: 'r1', familyId: 'r1', methodId: method, name: 'Receita preservada', version: 2, dose: 20, water: 300, steps: [], grind: '27/40' },
  } };
}

describe('apresentação do histórico de preparações', () => {
  it('filtra período, método e café em conjunto sem substituir snapshots ou modificar registros', () => {
    const a = row('a','2026-11-01T12:00:00Z');
    const b = row('b','2026-11-12T12:00:00Z');
    const c = row('c','2026-11-13T12:00:00Z','c2','m2');
    const original = structuredClone([a,b,c]);
    const rows = historyRows([a,b,c], { ...emptyHistoryFilters, period: 'custom', from: '2026-11-10', to: '2026-11-12', methodId: 'm1', coffeeId: 'c1' }, 'recent');
    expect(rows).toEqual([b]); expect(rows[0]).toBe(b);
    expect(rows[0].snapshot.recipe).toMatchObject({ name:'Receita preservada', version:2, grind:'27/40' });
    expect([a,b,c]).toEqual(original);
  });
  it('mantém recentes como padrão, inclui interrompidos e permite mais antigas com desempate estável', () => {
    const a = row('a','2026-11-01T12:00:00Z'); const b = { ...row('b','2026-11-12T12:00:00Z'), state:'interrupted' as const };
    const c = row('c','2026-11-12T12:00:00Z');
    expect(historyRows([c,b,a],emptyHistoryFilters,'recent').map(p=>p.id)).toEqual(['b','c','a']);
    expect(historyRows([c,b,a],emptyHistoryFilters,'oldest').map(p=>p.id)).toEqual(['a','b','c']);
  });
  it('compara dias locais inclusivos e usa a data do preparo em vez da edição', () => {
    const a = row('a',new Date(2026,10,12,0,0).toISOString()); const b = row('b',new Date(2026,10,12,23,59).toISOString());
    a.updatedAt = '2030-01-01T00:00:00Z';
    expect(historyRows([a,b],{...emptyHistoryFilters,period:'custom',from:'2026-11-12',to:'2026-11-12'},'recent')).toHaveLength(2);
    const now = new Date(2026,10,17,23,59);
    expect(historyBounds({...emptyHistoryFilters,period:'7'},now)).toEqual({from:'2026-11-11',to:'2026-11-17'});
    expect(historyDay(new Date(2026,10,12,0,1).toISOString())).toBe('2026-11-12');
    expect(historyRows([a,b],{...emptyHistoryFilters,period:'custom',from:'2026-11-13'},'recent')).toEqual([]);
  });
  it('reúne opções por identidade histórica, sem depender da coleção atual ou confundir técnica e método', () => {
    const a = row('a','2026-11-01T12:00:00Z'); const b = row('b','2026-11-12T12:00:00Z');
    b.snapshot.method.name = 'Nome histórico mais recente';
    expect(historyOptions([a,b],'method')).toEqual([{id:'m1',name:'Nome histórico mais recente'}]);
    expect(historyOptions([a,b],'coffee')).toEqual([{id:'c1',name:'Café histórico c1'}]);
    a.snapshot.coffee = undefined;
    expect(historyOptions([a],'coffee')).toEqual([]);
  });
  it('apresenta nota zero e omite ausência/inválidas sem usar a avaliação comercial do café', () => {
    const a = row('a','2026-11-12T12:00:00Z');
    expect(preparationScore(a)).toBeUndefined();
    a.evaluation={overall:0,tags:[],createdAt:a.startedAt,updatedAt:a.startedAt};
    expect(preparationScore(a)).toBe(0);
    for (const overall of [NaN,11,-1]) { a.evaluation.overall=overall; expect(preparationScore(a)).toBeUndefined(); }
  });
});
