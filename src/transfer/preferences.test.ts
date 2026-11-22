import 'fake-indexeddb/auto';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {IndexedDBStorage} from '../data/indexeddb-storage';
import {PENDING_PREFERENCES} from './core';
import {preferences} from './fixtures.test-helper';
const state=vi.hoisted(()=>({values:new Map<string,string>(),fail:false}));
vi.mock('../theme/appearance',()=>({normalizeAppearance:(v:string)=>['light','dark'].includes(v)?v:'system',applyAppearance:vi.fn()}));
vi.mock('../theme/text-size',()=>({TEXT_SIZE_KEY:'jornada-cafe:text-size',normalizeTextSize:(v:string)=>[85,90,100,110,115].includes(Number(v))?Number(v):100,saveTextSize:(v:number)=>{try{localStorage.setItem('jornada-cafe:text-size',String(v));return true;}catch{return false;}}}));
vi.mock('../features/preparations/platform',()=>({readAlertPreferences:()=>JSON.parse(localStorage.getItem('jornada-cafe:brew-alerts')??'{"sound":false,"vibration":false}'),saveAlertPreferences:(v:unknown)=>{localStorage.setItem('jornada-cafe:brew-alerts',JSON.stringify(v));return true;}}));
import {readPortablePreferences,recoverPreferences} from './preferences';
afterEach(()=>{vi.unstubAllGlobals();state.values.clear();state.fail=false;});
function globals(){vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:(k:string)=>state.values.get(k)??null,setItem:(k:string,v:string)=>{if(state.fail&&k==='jornada-cafe:text-size')throw Error('Quota');state.values.set(k,v);}});}
describe('preferências portáveis e recuperação após interrupção',()=>{
 it('exporta somente a lista permitida de preferências',()=>{globals();localStorage.setItem('private-device-id','SENTINEL_DEVICE');localStorage.setItem('jornada-cafe:appearance','dark');localStorage.setItem('jornada-cafe:text-size','115');localStorage.setItem('jornada-cafe:brew-alerts',JSON.stringify(preferences.alerts));expect(readPortablePreferences()).toEqual(preferences);expect(JSON.stringify(readPortablePreferences())).not.toContain('SENTINEL_DEVICE');});
 it('aplica as preferências confirmadas e limpa a pendência depois de concluir',async()=>{globals();const s=new IndexedDBStorage(`prefs-${crypto.randomUUID()}`);await s.initialize();try{await s.setMetadata(PENDING_PREFERENCES,JSON.stringify(preferences));await recoverPreferences(s);expect(readPortablePreferences()).toEqual(preferences);expect(await s.getMetadata(PENDING_PREFERENCES)).toBe('');}finally{await s.close();}});
 it('mantém o marcador para repetir a aplicação se localStorage falhar',async()=>{globals();const s=new IndexedDBStorage(`prefs-${crypto.randomUUID()}`);await s.initialize();try{await s.setMetadata(PENDING_PREFERENCES,JSON.stringify(preferences));state.fail=true;await expect(recoverPreferences(s)).rejects.toThrow('aguardam');expect(await s.getMetadata(PENDING_PREFERENCES)).not.toBe('');state.fail=false;await recoverPreferences(s);expect(await s.getMetadata(PENDING_PREFERENCES)).toBe('');expect(readPortablePreferences()).toEqual(preferences);}finally{await s.close();}});
});
