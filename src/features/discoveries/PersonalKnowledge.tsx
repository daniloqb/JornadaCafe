import { useMemo, useState } from 'react';
import { BookOpen, Feather } from 'lucide-react';
import { normalizeText, type CollectionData } from '../../domain/collection';
import { associatedReflectionCoffee, knowledgeReflections } from '../../domain/discoveries';
import { journeyDate, type Reflection } from '../../domain/journey';
import { ReflectionForm } from '../journey/ReflectionForm';
import { ActionLink, Button, Card, EmptyState } from '../../components/ui';
import { Field } from '../../components/forms';

export function PersonalKnowledge({ data }: { data: CollectionData }) {
  const [category, setCategory] = useState(''); const [coffeeId, setCoffeeId] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [limit, setLimit] = useState(12);
  const [editing, setEditing] = useState<Reflection>();
  const categories = useMemo(() => {
    const priorities = ['aprendizado', 'percepcao sensorial', 'experimento', 'experimentos', 'preferencia', 'preferencias'];
    return [...new Set(data.reflections.flatMap(r => r.category ? [r.category] : []))].sort((a, b) => {
      const priority = (name: string) => { const i = priorities.indexOf(normalizeText(name)); return i < 0 ? priorities.length : i; };
      return priority(a) - priority(b) || a.localeCompare(b, 'pt-BR');
    });
  }, [data]);
  const coffees = useMemo(() => [...new Set(data.reflections.map(r => associatedReflectionCoffee(data, r)).filter((id): id is string => !!id))].map(id => ({ id, name: data.coffees.find(c => c.id === id)?.name ?? data.preparations.find(p => p.snapshot.coffee?.id === id)?.snapshot.coffee?.name ?? 'Café associado indisponível' })), [data]);
  const invalidPeriod = !!from && !!to && from > to;
  const reflections = useMemo(() => knowledgeReflections(data, { category, coffeeId, from, to }), [data, category, coffeeId, from, to]);
  return <div className="discovery-content"><Card className="discovery-panel"><div className="discovery-card-heading"><BookOpen size={29} aria-hidden="true" /><h3>O conhecimento nas suas palavras</h3></div><p>Consulte aqui as reflexões da sua Jornada. Os textos são seus; observações e hipóteses automáticas não se tornam aprendizados confirmados.</p><ActionLink href="#/jornada/diario" variant="secondary"><Feather size={18} aria-hidden="true" />Registrar em Minha Jornada</ActionLink></Card>
    <div className="knowledge-filters"><label className="form-field"><span>Categoria</span><select value={category} onChange={e => { setCategory(e.target.value); setLimit(12); }}><option value="">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="form-field"><span>Café associado</span><select value={coffeeId} onChange={e => { setCoffeeId(e.target.value); setLimit(12); }}><option value="">Todas as reflexões, inclusive sem café</option>{coffees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field label="De" type="date" value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); setLimit(12); }} /><Field label="Até" type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setLimit(12); }} /></div>
    {invalidPeriod && <p role="alert">A data inicial deve ser anterior ou igual à data final.</p>}
    <div className="discovery-section-heading"><h2>Reflexões pessoais ({invalidPeriod ? 0 : reflections.length})</h2><Button variant="secondary" onClick={() => { setCategory(''); setCoffeeId(''); setFrom(''); setTo(''); setLimit(12); }}>Limpar filtros</Button></div>
    {!invalidPeriod && reflections.length ? <><div className="knowledge-grid">{reflections.slice(0, limit).map(r => {
      const a = r.association;
      const record = a?.kind === 'coffee' ? data.coffees.find(c => c.id === a.id) : a?.kind === 'preparation' ? data.preparations.find(p => p.id === a.id) : undefined;
      return <Card className="discovery-panel knowledge-card" key={r.id}><span className="eyebrow">REFLEXÃO PESSOAL</span><time dateTime={r.occurredOn}>{journeyDate(r.occurredOn)}</time><h3>{r.title || 'Uma reflexão da minha Jornada'}</h3><p className="knowledge-excerpt">{r.text}</p>{r.category && <span className="knowledge-category">{r.category}</span>}{a && (record ? <a className="text-link" href={a.kind === 'coffee' ? `#/cafes/${a.id}` : `#/preparar/historico/${a.id}`}>Ver {a.kind === 'coffee' ? 'café' : 'preparo'} associado →</a> : <p className="field-hint">Registro associado indisponível. A reflexão permanece preservada.</p>)}<Button variant="secondary" onClick={() => setEditing(r)}>Ler ou editar reflexão</Button></Card>;
    })}</div>{reflections.length > limit && <Button variant="secondary" onClick={() => setLimit(n => n + 12)}>Mostrar mais reflexões</Button>}</> : !invalidPeriod && <Card className="discovery-panel"><EmptyState icon={BookOpen} title={data.reflections.length ? 'Nenhuma reflexão com estes filtros' : 'Uma página para seus aprendizados'}>{data.reflections.length ? 'Experimente outra categoria, café ou período. Reflexões sem associação também fazem parte deste espaço.' : 'As reflexões registradas em Minha Jornada aparecerão aqui, inclusive aquelas sem café ou preparo associado.'}</EmptyState></Card>}
    {editing && <ReflectionForm existing={editing} onClose={() => setEditing(undefined)} />}
  </div>;
}
