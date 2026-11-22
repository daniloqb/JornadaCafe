import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { Dialog, Field, FormError, formNumber, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { grams, normalizeText } from '../../domain/collection';
import { ratio } from '../../domain/brewing';
import { historicalParameters, type HistoricalParameters, type Preparation } from '../../domain/preparation';
import { SelectField } from '../prepare/LibraryForms';

const labels: Record<keyof HistoricalParameters, string> = {
  coffee: 'Café', dose: 'Dose', water: 'Água total', temperature: 'Temperatura',
  grind: 'Moagem', grinder: 'Moedor', filter: 'Filtro',
};
function parameterLabel(key: keyof HistoricalParameters, value: HistoricalParameters[keyof HistoricalParameters] | undefined) {
  if (value == null) return 'Não informado';
  if (typeof value === 'object') return value.name;
  if (key === 'dose' || key === 'water') return grams(value as number);
  if (key === 'temperature') return `${value} °C`;
  return String(value);
}

export function ParameterCorrectionHistory({ preparation: p }: { preparation: Preparation }) {
  if (!p.parameterCorrections) return null;
  const current = historicalParameters(p);
  return <details className="parameter-correction-history"><summary>Correções do registro</summary>
    <p className="field-hint">Última correção em {new Date(p.parameterCorrections.updatedAt).toLocaleString('pt-BR')}. Os valores abaixo comparam o primeiro registro com o valor atual.</p>
    <dl className="detail-facts">{(Object.keys(p.parameterCorrections.original) as (keyof HistoricalParameters)[]).map(key => <div key={key}><dt>{labels[key]}</dt><dd>{parameterLabel(key, p.parameterCorrections!.original[key])} → {parameterLabel(key, current[key])}</dd></div>)}</dl>
  </details>;
}

function ParameterForm({ preparation: p, onClose }: { preparation: Preparation; onClose: () => void }) {
  const { data, mutate } = useCollection();
  const r = p.snapshot.recipe;
  const action = useFormAction();
  const [query, setQuery] = useState('');
  const [coffeeId, setCoffeeId] = useState(p.snapshot.coffee?.id ?? '');
  const [dose, setDose] = useState(String(r.dose));
  const [water, setWater] = useState(String(r.water));
  const number = (text: string) => Number(text.replace(',', '.'));
  const coffees = data.coffees.filter(c => c.id === coffeeId || normalizeText(c.name).includes(normalizeText(query)));
  const removedCoffee = p.snapshot.coffee && !data.coffees.some(c => c.id === p.snapshot.coffee!.id) ? p.snapshot.coffee : undefined;
  return <Dialog title="Editar parâmetros" busy={action.busy} onClose={onClose} initialFocus="input">
    <form className="journal-form" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action.run(async () => {
        await mutate({ type: 'correctPreparationParameters', id: p.id, value: {
          coffeeId: coffeeId || undefined, dose: number(dose), water: number(water),
          temperature: formNumber(form, 'temperature'), grind: formText(form, 'grind'),
          grinder: formText(form, 'grinder'), filter: formText(form, 'filter'),
        } });
        onClose();
      });
    }}>
      <p>Corrija os dados desta experiência. A receita da biblioteca e a avaliação são preservadas.</p>
      <FormError error={action.error} />
      <Field label="Pesquisar café na coleção" type="search" value={query} onChange={e => setQuery(e.target.value)} />
      <SelectField label="Café associado" value={coffeeId} onChange={e => setCoffeeId(e.target.value)}>
        <option value="">Sem café associado</option>
        {removedCoffee && <option value={removedCoffee.id}>{removedCoffee.name} · registro histórico</option>}
        {coffees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </SelectField>
      <div className="form-grid">
        <Field label="Dose de café (g)" required inputMode="decimal" value={dose} onChange={e => setDose(e.target.value)} />
        <Field label="Água total registrada (g)" required inputMode="decimal" value={water} onChange={e => setWater(e.target.value)} />
      </div>
      <p className="field-hint" role="status">Proporção: {ratio(number(dose), number(water))}. A água total não modifica os despejos e o cronograma originalmente acompanhados.</p>
      <div className="form-grid">
        <Field label="Temperatura da água (°C)" name="temperature" inputMode="decimal" defaultValue={r.temperature} />
        <Field label="Configuração de moagem" name="grind" defaultValue={r.grind} hint="Use a referência do seu equipamento, por exemplo 27/40." />
        <Field label="Moedor" name="grinder" defaultValue={r.grinder} />
        <Field label="Filtro" name="filter" defaultValue={r.filter} />
      </div>
      <p className="field-hint">A correção não movimenta estoque. O pacote e o consumo originais, a versão da receita, as etapas e os tempos são preservados.</p>
      <div className="form-actions"><Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>Cancelar</Button><Button disabled={action.busy}>{action.busy ? 'Salvando…' : 'Salvar alterações'}</Button></div>
    </form>
  </Dialog>;
}

export function EditPreparationParameters({ preparation }: { preparation: Preparation }) {
  const { data, error } = useCollection();
  const [editing, setEditing] = useState(false);
  const active = data.sessions.some(s => s.id === preparation.id);
  return <><Button variant="edit" disabled={active || !!error} onClick={() => setEditing(true)}><Pencil size={17} aria-hidden="true" />Editar parâmetros</Button>
    {active && <p className="field-hint">Conclua a sessão deste preparo antes de corrigir o registro.</p>}
    {editing && <ParameterForm preparation={preparation} onClose={() => setEditing(false)} />}
  </>;
}

export function DeletePreparation({ preparation }: { preparation: Preparation }) {
  const { data, mutate, error } = useCollection();
  const [confirming, setConfirming] = useState(false);
  const action = useFormAction();
  const active = data.sessions.some(s => s.id === preparation.id);
  return <Card className="detail-section preparation-secondary-actions"><h2>Gerenciar registro</h2>
    <p>Remova um registro incorreto ou duplicado do seu histórico.</p>
    <Button variant="danger" disabled={active || !!error} onClick={() => setConfirming(true)}><Trash2 size={17} aria-hidden="true" />Excluir preparação</Button>
    {active && <p className="field-hint">Conclua a sessão deste preparo antes de excluir o registro.</p>}
    {confirming && <Dialog title="Excluir esta preparação?" busy={action.busy} onClose={() => setConfirming(false)} initialFocus="[data-keep-preparation]">
      <p>Esta ação removerá o registro do histórico e atualizará as informações relacionadas em Minha Jornada e Minhas Descobertas. Ela não altera automaticamente o estoque.</p>
      <p className="field-hint">Suas reflexões pessoais serão mantidas, sem o vínculo com este preparo.</p>
      <FormError error={action.error} />
      <div className="form-actions"><Button variant="secondary" data-keep-preparation disabled={action.busy} onClick={() => setConfirming(false)}>Manter preparação</Button><Button variant="danger" disabled={action.busy} onClick={() => void action.run(async () => {
        await mutate({ type: 'deletePreparation', id: preparation.id });
        setConfirming(false);
        window.location.replace('#/preparar/historico');
      })}>{action.busy ? 'Excluindo…' : 'Excluir preparação'}</Button></div>
    </Dialog>}
  </Card>;
}
