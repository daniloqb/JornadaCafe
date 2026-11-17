import { useMemo, useState } from 'react';
import { Coffee, Info, Lightbulb, Scale } from 'lucide-react';
import type { CollectionData } from '../../domain/collection';
import { coffeeExperiences, coffeeObservations, configurationHypothesis } from '../../domain/discoveries';
import { ActionLink, Button, Card, EmptyState } from '../../components/ui';
import { Evidence, HypothesisCard, comparisonUrl } from './shared';

export function ObservedDiscoveries({ data }: { data: CollectionData }) {
  const groups = useMemo(() => coffeeExperiences(data), [data]);
  const [coffeeId, setCoffeeId] = useState(''); const [limit, setLimit] = useState(8);
  const considered = useMemo(() => groups.filter(g => !coffeeId || g.id === coffeeId).map(g => ({ ...g, observations: coffeeObservations(g.preparations), hypothesis: configurationHypothesis(g.preparations) })), [groups, coffeeId]);
  const featured = considered.find(g => g.hypothesis);
  return <div className="discovery-content"><label className="form-field discovery-coffee-select"><span>Observar os registros de</span><select value={coffeeId} onChange={e => { setCoffeeId(e.target.value); setLimit(8); }}><option value="">Todos os cafés</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    {featured ? <HypothesisCard preparations={featured.preparations} /> : <Card className="discovery-panel"><div className="discovery-card-heading"><Lightbulb size={29} aria-hidden="true" /><h3>Novas perguntas começam nos registros</h3></div><p>Para sugerir uma configuração a investigar, precisamos de pelo menos dois preparos avaliados do mesmo café e uma maior nota sem empate.</p><p className="discovery-empty-text">As observações disponíveis continuam abaixo. Nenhuma conclusão será criada para preencher este espaço.</p><ActionLink href="#/preparar/historico" variant="secondary">Consultar e avaliar preparos</ActionLink></Card>}
    <div className="discovery-section-heading"><h2>Preparos e padrões observados</h2><ActionLink href="#/descobertas/comparar" variant="secondary" arrow={false}><Scale size={19} aria-hidden="true" />Comparar experiências</ActionLink></div>
    {considered.length ? considered.slice(0, limit).map(group => <Card className="discovery-panel discovery-observation-group" key={group.id}><div className="discovery-card-heading"><span className="discovery-icon discovery-icon--olive"><Coffee size={27} aria-hidden="true" /></span><div><h3>{group.name}</h3><p>Mesmo café · {group.preparations.length} {group.preparations.length === 1 ? 'preparo concluído' : 'preparos concluídos'}</p></div></div>{group.observations.map(observation => <div className="discovery-observation" key={observation.id}><span className="eyebrow">OBSERVAÇÃO AUTOMÁTICA</span><p>{observation.text}</p><details className="discovery-rule"><summary>Critério utilizado</summary><p>{observation.criterion}</p></details><Evidence preparations={group.preparations.filter(p => observation.preparationIds.includes(p.id))} /></div>)}{group.hypothesis && group.id !== featured?.id && <HypothesisCard preparations={group.preparations} />}{group.preparations.length > 1 && <ActionLink href={comparisonUrl(group.id, group.preparations)} variant="secondary">Comparar este café</ActionLink>}</Card>) : <Card className="discovery-panel"><EmptyState icon={Coffee} title="Suas descobertas começam com suas experiências">Conclua preparos associados a um café. As observações se apoiarão somente no que você registrar.</EmptyState><ActionLink href="#/preparar">Preparar um café</ActionLink></Card>}
    {considered.length > limit && <Button variant="secondary" onClick={() => setLimit(n => n + 8)}>Mostrar mais cafés</Button>}
    <div className="discovery-caution"><Info size={22} aria-hidden="true" /><p>Uma observação automática descreve registros; uma hipótese propõe uma pergunta. Somente você pode escrever o que aprendeu em uma reflexão pessoal.</p></div>
  </div>;
}
