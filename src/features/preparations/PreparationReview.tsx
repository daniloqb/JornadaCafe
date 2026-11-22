import { useState } from 'react';
import { Bean, CircleCheck, Droplet, Filter, List, Scale, SlidersHorizontal, Thermometer, CircleDot } from 'lucide-react';
import { useCollection } from '../../data/CollectionContext';
import { grams } from '../../domain/collection';
import { formatNumber, ratio, type BrewRecipe } from '../../domain/brewing';
import { scaleStepWater } from '../../domain/preparation';
import { Button, Card } from '../../components/ui';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { Field, FormError, formNumber, formText, useFormAction } from '../../components/forms';
import { SelectField } from '../prepare/LibraryForms';
import { StepsEditor } from '../prepare/StepsEditor';
import { AlertControls } from './PreparationRun';
import { PreparationHeading } from './PreparationHeading';
import { StepsTimeline } from './StepsTimeline';
import { useBrew } from './BrewContext';

export function PreparationReview({ recipe }: { recipe: BrewRecipe }) {
  const { data } = useCollection();
  const brew = useBrew();
  const action = useFormAction();
  const [coffeeId, setCoffee] = useState(recipe.coffeeId ?? '');
  const [packageId, setPackage] = useState('');
  const [dose, setDose] = useState(String(recipe.dose));
  const [water, setWater] = useState(String(recipe.water));
  const [temperature, setTemperature] = useState(String(recipe.temperature ?? ''));
  const [grind, setGrind] = useState(recipe.grind ?? '');
  const [filter, setFilter] = useState(recipe.filter ?? '');
  const [steps, setSteps] = useState(() => structuredClone(recipe.steps));
  const [scaled, setScaled] = useState('');
  const number = (value: string) => Number(value.replace(',', '.'));
  const weight = (value: string) => value.trim() && Number.isFinite(number(value)) ? grams(number(value)) : '—';
  const coffee = data.coffees.find(c => c.id === coffeeId);
  const method = data.methods.find(m => m.id === recipe.methodId);
  const technique = data.techniques.find(t => t.id === recipe.techniqueId);
  const photo = recipe.photoId ? { id: recipe.photoId, name: recipe.name, subject: 'Receita' }
    : technique?.photoId ? { id: technique.photoId, name: technique.name, subject: 'Técnica' }
    : method?.photoId ? { id: method.photoId, name: method.name, subject: 'Método' }
    : { id: coffee?.photoId, name: coffee?.name ?? method?.name ?? recipe.name, subject: coffee?.photoId ? 'Embalagem de' : 'Método' };
  const packets = data.packages.filter(p => p.coffeeId === coffeeId);
  const packet = packets.find(p => p.id === packageId);

  return <div className="preparation-review">
    <PreparationHeading backHref={`#/preparar/receitas/${recipe.id}`} />
    <div className="review-page-title"><h1 tabIndex={-1}>Revisar receita</h1><p>Confira os detalhes antes de preparar.</p></div>
    <form className="journal-form review-form" onInvalid={event => {
      let parent = (event.target as HTMLElement).parentElement;
      while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    }} onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action.run(() => brew.start({ ...structuredClone(recipe), dose: number(dose), water: number(water), temperature: formNumber(form, 'temperature'), grind: formText(form, 'grind'), grinder: formText(form, 'grinder'), filter: formText(form, 'filter'), estimatedSeconds: formNumber(form, 'estimatedSeconds'), steps }, coffeeId || undefined, packageId || undefined));
    }}>
      <FormError error={action.error} />
      <Card className="review-identity">
        <CoffeePhoto {...photo} fallbackSrc={!photo.id && method?.name.toLowerCase().includes('v60') ? '/images/v60-method.png' : undefined} />
        <div><h2>{recipe.name}</h2>{(technique?.creator || technique?.name) && <p className="review-technique">{technique.creator || technique.name}</p>}<span className="review-version">Versão {recipe.version}</span>{(recipe.notes || technique?.principle) && <p className="review-recipe-description">{recipe.notes || technique?.principle}</p>}</div>
      </Card>

      <Card className="review-section review-parameters">
        <div className="review-section-heading"><SlidersHorizontal size={22} aria-hidden="true" /><h2>Parâmetros do preparo</h2></div>
        <dl className="review-parameter-facts">
          <div><Bean aria-hidden="true" /><dt>Café</dt><dd>{weight(dose)}</dd></div>
          <div><Droplet aria-hidden="true" /><dt>Água</dt><dd>{weight(water)}</dd></div>
          <div><Scale aria-hidden="true" /><dt>Proporção</dt><dd>{ratio(number(dose), number(water))}</dd></div>
          <div><Thermometer aria-hidden="true" /><dt>Temperatura</dt><dd>{temperature.trim() && Number.isFinite(number(temperature)) ? `${formatNumber(number(temperature))} °C` : 'Não informada'}</dd></div>
        </dl>
        <div className="review-equipment">
          <div className="review-equipment-card"><CircleDot size={30} aria-hidden="true" /><div><span>Moagem</span><strong>{grind || 'Não informada'}</strong></div></div>
          <div className="review-equipment-card"><Filter size={30} aria-hidden="true" /><div><span>Filtro</span><strong>{filter || 'Não informado'}</strong></div></div>
        </div>
      </Card>

      <Card className="review-section review-sequence">
        <div className="review-section-heading"><List size={23} aria-hidden="true" /><h2>Etapas do preparo <span>({steps.length} {steps.length === 1 ? 'etapa' : 'etapas'})</span></h2></div>
        <StepsTimeline steps={steps} highlightFirst />
      </Card>

      <details className="card review-adjustments"><summary>Ajustar esta xícara</summary><div className="review-adjustments-body">
        <p className="field-hint">Os ajustes valem apenas para este preparo. A receita da biblioteca será mantida.</p>
        <SelectField label="Café para este preparo" value={coffeeId} onChange={e => { setCoffee(e.target.value); setPackage(''); }}><option value="">Sem café associado</option>{data.coffees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
        {coffeeId && <SelectField label="Pacote para este preparo" value={packageId} onChange={e => setPackage(e.target.value)}><option value="">Sem pacote — não descontar estoque</option>{packets.map(p => <option key={p.id} value={p.id}>{p.description || 'Pacote'} · {grams(p.remainingWeight)} disponíveis{p.purchasedOn ? ` · ${p.purchasedOn}` : ''} · {p.id.slice(0, 6)}</option>)}</SelectField>}
        <p className="field-hint">{packet ? `Disponível: ${grams(packet.remainingWeight)}. A dose só será descontada ao confirmar o salvamento como concluído.` : 'Café e pacote são opcionais. Sem pacote, nenhum estoque será descontado.'}</p>
        <div className="form-grid review-measurements"><Field label="Dose de café (g)" required inputMode="decimal" value={dose} onChange={e => setDose(e.target.value)} /><Field label="Água total (g)" required inputMode="decimal" value={water} onChange={e => { setWater(e.target.value); setScaled(''); }} /></div>
        <div className="form-grid"><Field label="Temperatura da água (°C)" name="temperature" inputMode="decimal" value={temperature} onChange={e => setTemperature(e.target.value)} /><Field label="Tempo total estimado (s)" name="estimatedSeconds" type="number" min="0" step="1" defaultValue={recipe.estimatedSeconds} /><Field label="Configuração de moagem" name="grind" value={grind} onChange={e => setGrind(e.target.value)} /><Field label="Moedor" name="grinder" defaultValue={recipe.grinder} /><Field label="Filtro" name="filter" value={filter} onChange={e => setFilter(e.target.value)} /></div>
        <Button type="button" variant="secondary" onClick={() => void action.run(async () => { setSteps(scaleStepWater(steps, number(water))); setScaled('Os despejos foram recalculados proporcionalmente. Confira a sequência acima.'); })}>Recalcular despejos para a água total</Button>
        <p className="field-hint" role="status">{scaled || 'Alterar a água total não modifica os despejos. Use o recálculo ou ajuste cada etapa manualmente.'}</p>
        <details className="form-section review-step-adjustments"><summary>Ajustar etapas deste preparo</summary><StepsEditor steps={steps} onChange={setSteps} water={number(water)} /></details>
        {recipe.notes && <details className="form-section"><summary>Notas da receita</summary><p className="preserve-lines">{recipe.notes}</p></details>}
      </div></details>
      <details className="card review-adjustments"><summary>Avisos do preparo</summary><AlertControls /></details>
      {brew.session && <p className="field-hint" role="status">Há um preparo em andamento. Retome ou descarte essa sessão antes de iniciar outro.</p>}
      <div className="review-confirmation"><Button disabled={action.busy || !!brew.session}><span><CircleCheck size={25} aria-hidden="true" />{action.busy ? 'Preparando…' : 'Confirmar revisão'}</span><small>Abrir o preparo guiado (sem iniciar o timer)</small></Button></div>
    </form>
  </div>;
}
