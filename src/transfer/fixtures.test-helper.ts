import { applyMutation, emptyCollection, newEntity, type CollectionData } from '../domain/collection';
import type { BrewRecipe } from '../domain/brewing';
import { makeSession } from '../domain/preparation';
import { BrewClock } from '../domain/brew-clock';
import type { ArchiveState, PortablePreferences } from './core';
export const preferences:PortablePreferences={appearance:'dark',textSize:115,alerts:{sound:true,vibration:true}};
export function fixture(marker='PRIVATE_A'):ArchiveState{
 let d=emptyCollection();const photoIds=Array.from({length:6},()=>crypto.randomUUID());
 const origin={...newEntity(),kind:'origin' as const,name:`${marker}_ORIGIN`,photoId:photoIds[5],country:`${marker}_COUNTRY`,region:`${marker}_REGION`};
 const property={...newEntity(),kind:'property' as const,name:`${marker}_FARM`};
 const producer={...newEntity(),kind:'producer' as const,name:`${marker}_PRODUCER`,propertyId:property.id,originId:origin.id,website:'https://example.com/private-contact'};
 const roaster={...newEntity(),kind:'roaster' as const,name:`${marker}_ROASTER`};const species={...newEntity(),kind:'species' as const,name:`${marker}_SPECIES`};const tag={...newEntity(),kind:'sensoryTag' as const,name:`${marker}_SENSORY`};
 for(const value of [origin,property,producer,roaster,species,tag])d=applyMutation(d,{type:'record',value});
 const coffee={...newEntity(),name:`${marker}_COFFEE`,photoId:photoIds[0],producerId:producer.id,propertyId:property.id,originId:origin.id,roasterId:roaster.id,speciesId:species.id,sensoryTagIds:[tag.id],tried:true,favorite:true,ratings:{overall:0,acidity:0},commercialNotes:`${marker}_COMMERCIAL`,description:`${marker}_DESCRIPTION`,process:`${marker}_PROCESS`,variety:`${marker}_VARIETY`,additional:`${marker}_ADDITIONAL`};d=applyMutation(d,{type:'coffee',value:coffee});
 const method={...newEntity(),name:'V60',description:'Método de percolação',notes:'Filtro cônico',photoId:photoIds[3],referenceKey:`${marker}_METHOD_ORIGIN`};d=applyMutation(d,{type:'method',value:method});
 const technique={...newEntity(),name:'Três despejos',methodId:method.id,creator:'Crédito público',principle:'Dividir em três despejos',guidance:'Observar a cama',notes:'Notas técnicas',photoId:photoIds[4],referenceKey:`${marker}_TECHNIQUE_ORIGIN`,sources:[{id:crypto.randomUUID(),title:'Referência pública',author:'Autor público',url:'https://example.com/technique',notes:'Apresentação pública'}]};d=applyMutation(d,{type:'technique',value:technique});
 const entity=newEntity();const first:BrewRecipe={...entity,familyId:entity.id,version:1,name:'V60 equilibrado',methodId:method.id,techniqueId:technique.id,coffeeId:coffee.id,dose:20,water:300,temperature:92,grind:'27/40',grinder:'Moedor de referência',filter:'Papel',estimatedSeconds:180,notes:'Três despejos e observação',source:{id:crypto.randomUUID(),title:'Vídeo público',url:'https://example.com/recipe'},steps:[{id:crypto.randomUUID(),order:0,name:'Despejo',type:'pour',water:300,cumulativeWater:300,advance:'manual'}]};d=applyMutation(d,{type:'recipe',value:first});
 const second={...first,...newEntity(),version:2,previousVersionId:first.id,versionNote:'Mais água',water:320,steps:[{...first.steps[0],id:crypto.randomUUID(),water:320,cumulativeWater:320}]};d=applyMutation(d,{type:'recipe',value:second,fromId:first.id});
 const packet={...newEntity(),coffeeId:coffee.id,description:`${marker}_PACKET`,initialWeight:250,remainingWeight:250,lot:`${marker}_LOT`,purchasedAt:`${marker}_STORE`,notes:`${marker}_STOCK_NOTES`,adjustments:[]};d=applyMutation(d,{type:'package',value:packet});
 for(const [i,recipe]of [first,second].entries()){
  const session=makeSession(d,recipe,coffee.id,packet.id,Date.parse('2026-11-20T12:00:00Z')+i*3600000,'running');d=applyMutation(d,{type:'startSession',value:session});
  const preparation=new BrewClock(session,0).preparation('completed',`${marker}_PREPARATION`,false,1000,Date.parse(session.startedAt)+1000);d=applyMutation(d,{type:'finishPreparation',value:preparation});
  d=applyMutation(d,{type:'evaluatePreparation',id:preparation.id,value:{overall:i===0?0:9,acidity:i===0?0:undefined,tags:[`${marker}_EXPERIENCE_TAG`],createdAt:preparation.finishedAt,updatedAt:preparation.finishedAt}});
 }
 const p=d.preparations[0];d=applyMutation(d,{type:'correctPreparationParameters',id:p.id,value:{coffeeId:coffee.id,dose:18,water:324,temperature:95,grind:'31/60',grinder:'Moedor real',filter:'Papel'}});
 d.preparations[0].parameterCorrections!.original.coffee={...coffee,photoId:photoIds[1]};d.preparations[0].snapshot.coffee={...coffee,photoId:photoIds[2]};
 d=applyMutation(d,{type:'reflection',value:{...newEntity(),occurredOn:'2026-11-20',title:`${marker}_MEMORY`,text:`${marker}_REFLECTION`,category:`${marker}_KNOWLEDGE`,featured:true,association:{kind:'preparation',id:p.id}}});
 const session=makeSession(d,second,coffee.id,packet.id,Date.parse('2026-11-20T16:00:00Z'),'running');session.elapsedMs=45000;d=applyMutation(d,{type:'startSession',value:session});
 const image=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCUcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
 return {data:d,photos:photoIds.map(id=>({id,blob:new Blob([image],{type:'image/png'})}))};
}
export function personalPart(d:CollectionData){return {coffees:d.coffees,records:d.records,packages:d.packages,preparations:d.preparations,sessions:d.sessions,reflections:d.reflections};}

export function stableCollection(d:CollectionData):CollectionData{return Object.fromEntries(Object.entries(d).map(([table,rows])=>[table,[...rows].sort((a:{id:string},b:{id:string})=>a.id.localeCompare(b.id))])) as unknown as CollectionData;}
