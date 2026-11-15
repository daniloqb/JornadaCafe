import { useState } from 'react';
import { Button, Card, PageHeader } from '../../components/ui';
import { Field, FormError, TextArea, formNumber, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { newEntity } from '../../domain/collection';
import { ratio, type BrewRecipe, type RecipeStep, type SourceReference } from '../../domain/brewing';
import { LibraryPicker, SelectField, SourcesEditor } from './LibraryForms';
import { StepsEditor } from './StepsEditor';

export function RecipeForm({ existing, newVersion = false }: { existing?: BrewRecipe; newVersion?: boolean }) {
  const { data, mutate } = useCollection(); const action = useFormAction();
  const [methodId, setMethod] = useState(existing?.methodId);
  const [techniqueId, setTechnique] = useState(existing?.techniqueId);
  const [dose, setDose] = useState(String(existing?.dose ?? ''));
  const [water, setWater] = useState(String(existing?.water ?? ''));
  const [desiredRatio, setDesiredRatio] = useState('');
  const [calculation, setCalculation] = useState('');
  const [steps, setSteps] = useState<RecipeStep[]>(() => structuredClone(existing?.steps ?? []));
  const [sources, setSources] = useState<SourceReference[]>(existing?.source ? [existing.source] : []);
  const numeric = (text: string) => Number(text.replace(',', '.'));
  const destination = existing ? `#/preparar/receitas/${existing.id}` : '#/preparar';
  return <><a className="text-link" href={destination}>← Voltar à biblioteca</a><PageHeader eyebrow="SEU CADERNO DE PREPARO" title={newVersion ? 'Nova versão da receita' : existing ? 'Corrigir receita' : 'Criar receita'} description={newVersion ? `Partindo da versão ${existing?.version}. A versão anterior será preservada.` : existing ? 'Ajustes cadastrais mantêm esta versão. Para preservar uma mudança de preparo, crie uma nova versão pela ficha.' : 'Escolha um método e registre um preparo que você quer repetir.'} /><Card className="form-card"><form className="journal-form" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void action.run(async () => {
      const entity = existing && !newVersion ? existing : newEntity();
      const value: BrewRecipe = { ...entity, familyId: existing?.familyId ?? entity.id, version: existing?.version ?? 1, name: formText(form, 'name') ?? '', methodId: methodId ?? '', techniqueId, dose: numeric(dose), water: numeric(water), temperature: formNumber(form, 'temperature'), grind: formText(form, 'grind'), grinder: formText(form, 'grinder'), filter: formText(form, 'filter'), estimatedSeconds: formNumber(form, 'estimatedSeconds'), coffeeId: formText(form, 'coffeeId'), notes: formText(form, 'notes'), source: sources[0], steps, versionNote: newVersion ? formText(form, 'versionNote') : existing?.versionNote };
      await mutate({ type: 'recipe', value, fromId: newVersion ? existing?.id : undefined }); window.location.hash = `/preparar/receitas/${value.id}`;
    });
  }}><FormError error={action.error} /><section className="recipe-identification"><h2>Identificação</h2><Field label="Nome da receita" name="name" required maxLength={200} defaultValue={existing?.name} autoFocus /><LibraryPicker kind="method" value={methodId} onChange={id => { setMethod(id); const technique = data.techniques.find(t => t.id === techniqueId); if (technique?.methodId && technique.methodId !== id) setTechnique(undefined); }} /><LibraryPicker kind="technique" value={techniqueId} onChange={(id, associatedMethodId) => { setTechnique(id); const linkedMethod = associatedMethodId ?? data.techniques.find(t => t.id === id)?.methodId; if (linkedMethod && linkedMethod !== methodId) setMethod(linkedMethod); }} methodId={methodId} /></section>
    <details className="form-section" open><summary>Parâmetros <small>Dose, água e proporção</small></summary><div className="form-grid"><Field label="Dose de café (g)" required inputMode="decimal" value={dose} onChange={e => setDose(e.target.value)} /><Field label="Água total (g)" required inputMode="decimal" value={water} onChange={e => setWater(e.target.value)} /></div><p className="recipe-ratio" role="status">Proporção calculada <strong>{ratio(numeric(dose), numeric(water))}</strong></p><div className="ratio-calculator"><Field label="Proporção desejada — 1 para" inputMode="decimal" placeholder="Ex.: 15" value={desiredRatio} onChange={e => setDesiredRatio(e.target.value)} /><Button type="button" variant="secondary" onClick={() => {
      const target = numeric(desiredRatio), amount = numeric(dose); if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(amount) || amount <= 0) { setCalculation('Informe uma dose e uma proporção maiores que zero.'); return; }
      const result = Math.round(target * amount * 10000) / 10000; if (!Number.isFinite(result)) { setCalculation('Revise os valores da dose e da proporção.'); return; }
      setWater(String(result)); setCalculation(`Água total atualizada para ${result.toLocaleString('pt-BR')} g. Confira a distribuição nas etapas.`);
    }}>Aplicar cálculo à água total</Button></div><p className="field-hint" role="status">{calculation || 'A água só será alterada quando você aplicar o cálculo. As etapas permanecem para conferência.'}</p><div className="form-grid"><Field label="Temperatura da água (°C)" name="temperature" inputMode="decimal" defaultValue={existing?.temperature} /><Field label="Configuração de moagem" name="grind" placeholder="Ex.: 27/40, na escala do seu moedor" defaultValue={existing?.grind} /><Field label="Moedor" name="grinder" defaultValue={existing?.grinder} /><Field label="Tipo de filtro" name="filter" defaultValue={existing?.filter} /><Field label="Tempo total estimado (s)" name="estimatedSeconds" type="number" min="0" step="1" defaultValue={existing?.estimatedSeconds} hint="Opcional; referência desde o início do preparo." /></div></details>
    <details className="form-section" open><summary>Etapas <small>Água, tempos e condições de avanço</small></summary><StepsEditor steps={steps} onChange={setSteps} water={numeric(water)} /></details>
    <details className="form-section"><summary>Informações complementares <small>Café de referência, observações e fonte</small></summary><SelectField label="Café de referência ou sugestão" name="coffeeId" defaultValue={existing?.coffeeId ?? ''}><option value="">Sem café de referência</option>{data.coffees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField><p className="field-hint">A receita pode ser usada com qualquer café. Não é necessário possuir pacotes ou estoque.</p><TextArea label="Observações e instruções adicionais" name="notes" defaultValue={existing?.notes} /><SourcesEditor sources={sources} onChange={setSources} single /></details>{newVersion && <TextArea label="O que mudou nesta versão?" name="versionNote" placeholder="Opcional. Ex.: ajuste de moagem e distribuição dos despejos." />}<div className="form-actions"><a className="button button--secondary" href={destination}>Cancelar</a><Button disabled={action.busy}>{action.busy ? 'Salvando…' : newVersion ? 'Salvar nova versão' : 'Salvar receita'}</Button></div>
  </form></Card></>;
}
