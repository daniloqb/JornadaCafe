import { collectionTables, relationFields, recordLabels, type CollectionData, type Coffee, type RelatedRecord, type CoffeePackage } from '../domain/collection';
import { validateRecipe, safeReferenceUrl, type BrewRecipe, type BrewMethod, type BrewTechnique, type SourceReference } from '../domain/brewing';
import type { Preparation, PreparationSnapshot, BrewSession, StepExecution } from '../domain/preparation';
import { validDay, type Reflection, type PreparationEvaluation } from '../domain/journey';
import { LIMITS, requiredPhotoIds, type PortablePreferences } from './core';
export function fail(message = 'O arquivo contém dados inválidos ou incompatíveis.'): never { throw new Error(message); }
export function object(value: unknown, fields?: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => ['__proto__','prototype','constructor'].includes(key) || (fields && !fields.includes(key)))) fail('O arquivo contém campos inesperados.');
  return result;
}
export function text(value: unknown, optional = false): asserts value is string {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || value.length > 100000 || (!optional && !value.trim())) fail();
}
export function number(value: unknown, min = 0, max = Number.MAX_VALUE): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail();
}
export function list(value: unknown): unknown[] { if (!Array.isArray(value) || value.length > LIMITS.entities) return fail('Quantidade de registros excedida.'); return value; }
function date(value: unknown) { text(value); if (!Number.isFinite(Date.parse(value))) fail(); }
function optionalTexts(o: Record<string, unknown>, names: string[]) { for (const name of names) text(o[name], true); }
function entity(value: unknown, fields: string[]) { const o = object(value, ['id','createdAt','updatedAt',...fields]); text(o.id); date(o.createdAt); date(o.updatedAt); return o; }
function bool(value: unknown) { if (typeof value !== 'boolean') fail(); }
const coffeeFields = ['name','roasterId','producerId','propertyId','originId','photoId','description','altitude','species','variety','speciesId','sensoryTagIds','ratings','process','roast','commercialNotes','additional','tried','favorite'];
function coffee(value: unknown): asserts value is Coffee {
  const o = entity(value, coffeeFields); text(o.name); bool(o.tried); bool(o.favorite);
  optionalTexts(o, coffeeFields.filter(f => !['name','tried','favorite','altitude','sensoryTagIds','ratings'].includes(f)));
  if (o.altitude !== undefined) number(o.altitude);
  if (o.sensoryTagIds !== undefined) list(o.sensoryTagIds).forEach(v => text(v));
  if (o.ratings !== undefined) scores(o.ratings, ['overall','roast','acidity','sweetness','intensity']);
}
function scores(value: unknown, fields: string[]) { const o = object(value, fields); for (const n of Object.values(o)) if (n !== undefined) { number(n, 0, 10); if (!Number.isInteger(n)) fail(); } }
function record(value: unknown): asserts value is RelatedRecord {
  const names = ['kind','name','photoId','website','propertyId','originId','country','state','city','region','description','additional'];
  const o = entity(value, names); text(o.name); if (typeof o.kind !== 'string' || !Object.hasOwn(recordLabels,o.kind)) fail(); optionalTexts(o,names.filter(k => !['name','kind'].includes(k)));
  if (o.website && !safeReferenceUrl(String(o.website))) fail();
}
function packet(value: unknown): asserts value is CoffeePackage {
  const o = entity(value,['coffeeId','description','initialWeight','remainingWeight','purchasedOn','roastedOn','openedOn','lot','price','purchasedAt','notes','adjustments']);
  text(o.coffeeId); number(o.initialWeight,Number.MIN_VALUE); number(o.remainingWeight,0,o.initialWeight);
  optionalTexts(o,['description','lot','purchasedAt','notes']);
  for (const key of ['purchasedOn','roastedOn','openedOn']) if (o[key] !== undefined && (typeof o[key] !== 'string' || !validDay(o[key]))) fail();
  if (o.price !== undefined) number(o.price);
  unique(list(o.adjustments), item => { const a = object(item,['id','at','previous','remaining','initial','reason']); text(a.id); date(a.at); number(a.initial,Number.MIN_VALUE); number(a.previous); number(a.remaining,0,a.initial); text(a.reason,true); return a.id; });
}
export function source(value: unknown): asserts value is SourceReference {
  const o=object(value,['id','title','author','url','notes']); text(o.id); optionalTexts(o,['title','author','url','notes']); if(o.url && !safeReferenceUrl(String(o.url))) fail('Há uma referência com endereço inválido.');
}
export function method(value: unknown): asserts value is BrewMethod { const o=entity(value,['name','description','photoId','notes','referenceKey']); text(o.name); optionalTexts(o,['description','photoId','notes','referenceKey']); }
export function technique(value: unknown): asserts value is BrewTechnique {
  const o=entity(value,['name','methodId','creator','sources','principle','guidance','notes','photoId','referenceKey']);text(o.name);optionalTexts(o,['methodId','creator','principle','guidance','notes','photoId','referenceKey']);unique(list(o.sources),v=>{source(v);return v.id;});
}
export function recipe(value: unknown): asserts value is BrewRecipe {
  const o=entity(value,['familyId','version','previousVersionId','versionNote','name','methodId','techniqueId','coffeeId','dose','water','temperature','grind','grinder','filter','estimatedSeconds','notes','source','steps','referenceKey','photoId']);
  text(o.photoId,true);
  for(const key of ['familyId','name','methodId'])text(o[key]);optionalTexts(o,['previousVersionId','versionNote','techniqueId','coffeeId','grind','grinder','filter','notes','referenceKey']);number(o.version,1);if(!Number.isInteger(o.version))fail();number(o.dose,Number.MIN_VALUE);number(o.water,Number.MIN_VALUE);
  if(o.temperature!==undefined)number(o.temperature,Number.MIN_VALUE,100);if(o.estimatedSeconds!==undefined){number(o.estimatedSeconds);if(!Number.isInteger(o.estimatedSeconds))fail();}if(o.source!==undefined)source(o.source);
  unique(list(o.steps),v=>{const step=object(v,['id','order','name','type','water','cumulativeWater','startSeconds','durationSeconds','advance','condition','notes']);text(step.id);text(step.name);optionalTexts(step,['condition','notes']);return step.id;});
}
function snapshot(value: unknown): asserts value is PreparationSnapshot {
  const s=object(value,['recipe','method','technique','coffee','packet']);recipe(s.recipe);method(s.method);if(s.technique!==undefined)technique(s.technique);if(s.coffee!==undefined)coffee(s.coffee);if(s.packet!==undefined)packet(s.packet);
  const snap=value as PreparationSnapshot;
  if(snap.recipe.methodId!==snap.method.id || snap.recipe.techniqueId!==snap.technique?.id || (snap.technique?.methodId && snap.technique.methodId!==snap.method.id))fail('Snapshot com dependência técnica inconsistente.');
  // Corrected historical water is independent of the ORIGINAL pour schedule.
  const r={...snap.recipe,water:snap.recipe.steps.reduce((n,s)=>n+s.water,0),coffeeId:undefined};
  validateRecipe(r,{coffees:[],methods:[snap.method],techniques:snap.technique?[snap.technique]:[]} as unknown as CollectionData);
}
function executions(value: unknown, s: PreparationSnapshot, elapsed: number): asserts value is StepExecution[] {
  unique(list(value),v=>{const e=object(v,['id','stepId','enteredMs','leftMs','exit']);text(e.id);text(e.stepId);number(e.enteredMs,0,elapsed);if(e.leftMs!==undefined)number(e.leftMs,e.enteredMs,elapsed);if(e.exit!==undefined&&!['manual','automatic','previous','completed','interrupted'].includes(String(e.exit)))fail();if(!s.recipe.steps.some(step=>step.id===e.stepId))fail();return e.id;});
}
function evaluation(value: unknown): asserts value is PreparationEvaluation {
  const o=object(value,['overall','acidity','sweetness','body','intensity','tags','createdAt','updatedAt']);date(o.createdAt);date(o.updatedAt);for(const k of ['overall','acidity','sweetness','body','intensity'])if(o[k]!==undefined){number(o[k],0,10);if(!Number.isInteger(o[k]))fail();}list(o.tags).forEach(v=>text(v));
}
function preparation(value: unknown): asserts value is Preparation {
  const o=entity(value,['snapshot','startedAt','finishedAt','elapsedMs','executions','state','notes','consumedGrams','evaluation','parameterCorrections']);snapshot(o.snapshot);date(o.startedAt);date(o.finishedAt);if(Date.parse(o.finishedAt as string)<Date.parse(o.startedAt as string))fail();number(o.elapsedMs);number(o.consumedGrams);text(o.notes,true);if(!['completed','interrupted'].includes(String(o.state)))fail();executions(o.executions,o.snapshot,o.elapsedMs);if(o.evaluation!==undefined)evaluation(o.evaluation);
  if(o.parameterCorrections!==undefined){const c=object(o.parameterCorrections,['updatedAt','original']);date(c.updatedAt);const orig=object(c.original,['coffee','dose','water','temperature','grind','grinder','filter']);for(const [key,v]of Object.entries(orig)){if(key==='coffee'){if(v!==null)coffee(v);}else if(['dose','water','temperature'].includes(key)){if(v!==null||key!=='temperature')number(v,Number.MIN_VALUE,key==='temperature'?100:undefined);}else if(v!==null)text(v,true);}}
}
function session(value: unknown): asserts value is BrewSession {
  const o=entity(value,['snapshot','startedAt','checkpointAt','elapsedMs','status','stepIndex','stepStartedMs','executions','needsConfirmation']);snapshot(o.snapshot);date(o.startedAt);date(o.checkpointAt);number(o.elapsedMs);number(o.stepStartedMs,0,o.elapsedMs);number(o.stepIndex);if(!Number.isInteger(o.stepIndex)||!o.snapshot.recipe.steps[o.stepIndex])fail();bool(o.needsConfirmation);if(!['paused','running'].includes(String(o.status)))fail();executions(o.executions,o.snapshot,o.elapsedMs);if(!list(o.executions).length)fail();
}
function reflection(value: unknown): asserts value is Reflection {
  const o=entity(value,['occurredOn','title','text','category','association','featured']);text(o.occurredOn);if(!validDay(o.occurredOn))fail();text(o.text);optionalTexts(o,['title','category']);if(o.featured!==undefined)bool(o.featured);if(o.association!==undefined){const a=object(o.association,['kind','id']);text(a.id);if(!['coffee','preparation'].includes(String(a.kind)))fail();}
}
export function unique<T>(values: T[], key: (value: T)=>string) { const ids=new Set<string>();for(const v of values){const id=key(v);if(ids.has(id))fail('O arquivo contém identificadores duplicados.');ids.add(id);} }
export function validateCollection(value: unknown): asserts value is CollectionData {
  const o=object(value,[...collectionTables]);const validators={coffees:coffee,records:record,packages:packet,methods:method,techniques:technique,recipes:recipe,preparations:preparation,sessions:session,reflections:reflection};
  let count=0;for(const table of collectionTables){const rows=list(o[table]);count+=rows.length;unique(rows,row=>{validators[table](row as never);return (row as {id:string}).id;});}if(count>LIMITS.entities)fail();
  const d=value as CollectionData;if(d.sessions.length>1||d.sessions.some(s=>d.preparations.some(p=>p.id===s.id)))fail('Sessão de preparo inconsistente.');
  for(const c of d.coffees){for(const [key,kind]of Object.entries(relationFields)){const id=c[key as keyof typeof relationFields];if(id&&!d.records.some(r=>r.id===id&&r.kind===kind))fail('Café com referência de origem ausente.');}if(c.speciesId&&!d.records.some(r=>r.id===c.speciesId&&r.kind==='species'))fail();for(const id of c.sensoryTagIds??[])if(!d.records.some(r=>r.id===id&&r.kind==='sensoryTag'))fail();}
  for(const r of d.records)if(r.kind==='producer'){if(r.propertyId&&!d.records.some(x=>x.id===r.propertyId&&x.kind==='property'))fail();if(r.originId&&!d.records.some(x=>x.id===r.originId&&x.kind==='origin'))fail();}
  for(const p of d.packages)if(!d.coffees.some(c=>c.id===p.coffeeId))fail('Pacote com café ausente.');
  for(const t of d.techniques)if(t.methodId&&!d.methods.some(m=>m.id===t.methodId))fail('Técnica com método ausente.');
  const versions=new Set<string>();for(const r of d.recipes){validateRecipe(r,d);const key=`${r.familyId}:${r.version}`;if(versions.has(key))fail();versions.add(key);const previous=d.recipes.find(p=>p.id===r.previousVersionId);if(r.previousVersionId&&(!previous||previous.familyId!==r.familyId||previous.version>=r.version))fail('Sequência de versões inválida.');}
  for(const r of d.reflections)if(r.association?.kind==='preparation'&&!d.preparations.some(p=>p.id===r.association!.id))fail('Reflexão com preparação ausente.');
  if(requiredPhotoIds(d).some(id=>!/^[-a-f\d]{36}$/i.test(id)))fail('Referência de fotografia inválida.');
}
export function validatePreferences(value: unknown): asserts value is PortablePreferences {
  const o=object(value,['appearance','textSize','alerts']);if(!['light','dark','system'].includes(String(o.appearance))||![85,90,100,110,115].includes(o.textSize as number))fail('Preferências incompatíveis.');const alerts=object(o.alerts,['sound','vibration']);bool(alerts.sound);bool(alerts.vibration);
}
