import { useId, useState } from 'react';
import { ArrowLeft, Plus, Sprout } from 'lucide-react';
import { useCollection } from '../../data/CollectionContext';
import { associatedCoffees, newEntity, originDescription, recordLabels, type RecordKind, type RelatedRecord } from '../../domain/collection';
import { Button, Card, EmptyState } from '../../components/ui';
import { Dialog, Field, FormError, TextArea, formText, useFormAction } from '../../components/forms';
import { CoffeeCard } from './CoffeeCard';

export function RecordForm({ kind, existing, onSaved, onCancel }: { kind: RecordKind; existing?: RelatedRecord; onSaved: (id: string) => void; onCancel: () => void }) {
  const { mutate } = useCollection();
  const { busy, error, run } = useFormAction();
  return <form className="journal-form" onSubmit={event => {
    event.preventDefault(); event.stopPropagation(); const form = new FormData(event.currentTarget);
    void run(async () => {
      const record: RelatedRecord = { ...(existing ?? newEntity()), kind, name: formText(form, 'name') ?? '', country: formText(form, 'country'), state: formText(form, 'state'), city: formText(form, 'city'), region: formText(form, 'region'), description: formText(form, 'description'), additional: formText(form, 'additional') };
      await mutate({ type: 'record', value: record }); onSaved(record.id);
    });
  }}><FormError error={error} /><Field label={kind === 'origin' ? 'Nome da origem / região' : `Nome — ${recordLabels[kind].toLocaleLowerCase('pt-BR')}`} name="name" required maxLength={200} defaultValue={existing?.name} autoFocus /><TextArea label="Descrição ou observações" name="description" defaultValue={existing?.description} /><details className="form-section" open={kind === 'origin'}><summary>Informações geográficas</summary><div className="form-grid"><Field label="País" name="country" defaultValue={existing?.country} /><Field label="Estado" name="state" defaultValue={existing?.state} /><Field label="Município" name="city" defaultValue={existing?.city} /><Field label="Região" name="region" defaultValue={existing?.region} /></div></details><details className="form-section"><summary>Informações complementares</summary><TextArea label="Informações adicionais" name="additional" defaultValue={existing?.additional} /></details><div className="form-actions"><Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button><Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</Button></div></form>;
}

export function RecordPicker({ kind, value, onChange }: { kind: RecordKind; value?: string; onChange: (id: string | undefined) => void }) {
  const { data } = useCollection();
  const labelId = useId();
  const [creating, setCreating] = useState(false);
  return <div className="record-picker"><label className="form-field"><span id={labelId}>{recordLabels[kind]}</span><select aria-labelledby={labelId} value={value ?? ''} onChange={event => onChange(event.target.value || undefined)}><option value="">Não informado</option>{data.records.filter(r => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><Button type="button" variant="secondary" onClick={() => setCreating(true)} aria-label={`Criar ${recordLabels[kind].toLocaleLowerCase('pt-BR')}`}><Plus size={17} />Novo</Button>{creating && <Dialog title={`Novo registro: ${recordLabels[kind]}`} onClose={() => setCreating(false)}><RecordForm kind={kind} onCancel={() => setCreating(false)} onSaved={id => { onChange(id); setCreating(false); }} /></Dialog>}</div>;
}

export function RelatedRecords() {
  const { data, mutate, loading, error: storageError } = useCollection();
  const [kind, setKind] = useState<RecordKind>('producer');
  const [selected, setSelected] = useState<string>();
  const [editing, setEditing] = useState<RelatedRecord | 'new'>();
  const action = useFormAction();
  const record = data.records.find(r => r.id === selected);
  const records = data.records.filter(r => r.kind === kind).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
  return <section className="related-records"><div className="record-kinds" role="group" aria-label="Tipo de registro">{(Object.keys(recordLabels) as RecordKind[]).map(key => <Button key={key} variant="secondary" aria-pressed={key === kind} onClick={() => { setKind(key); setSelected(undefined); }}>{recordLabels[key]}</Button>)}</div><FormError error={action.error} />{record ? <>
    <Button variant="secondary" onClick={() => setSelected(undefined)}><ArrowLeft size={16} />Voltar aos registros</Button><Card className="record-detail"><div className="detail-heading"><div><p className="eyebrow">{recordLabels[record.kind]}</p><h2>{record.name}</h2></div><Button variant="secondary" onClick={() => setEditing(record)}>Editar registro</Button></div><p>{originDescription(data, record.id)}</p>{record.description && <p>{record.description}</p>}{record.additional && <p className="preserve-lines">{record.additional}</p>}<Button className="danger-button" variant="secondary" disabled={action.busy} onClick={() => { if (associatedCoffees(data, record.id).length) { void action.run(() => mutate({ type: 'deleteRecord', id: record.id })); return; } if (window.confirm(`Excluir “${record.name}”?`)) void action.run(async () => { await mutate({ type: 'deleteRecord', id: record.id }); setSelected(undefined); }); }}>Excluir registro</Button><small>Registros em uso precisam ser desvinculados ou substituídos nos cafés antes da exclusão.</small></Card><h2 className="subsection-title">Cafés associados</h2><div className="coffee-grid">{associatedCoffees(data, record.id).map(c => <CoffeeCard key={c.id} coffee={c} />)}</div>{!associatedCoffees(data, record.id).length && <EmptyState compact icon={Sprout} title="Nenhum café associado">Este registro já pode ser selecionado no cadastro de um café.</EmptyState>}
  </> : <><div className="records-toolbar"><p className="page-description">Pessoas, lugares e marcas que fazem parte da sua coleção.</p><Button disabled={loading || !!storageError} onClick={() => setEditing('new')}><Plus size={17} />Novo registro</Button></div>{records.length ? <div className="records-grid">{records.map(r => <button key={r.id} className="card record-card" onClick={() => setSelected(r.id)}><Sprout size={23} aria-hidden="true" /><h3>{r.name}</h3><p>{[r.region, r.city, r.state, r.country].filter(Boolean).join(' · ') || recordLabels[kind]}</p><span>{associatedCoffees(data, r.id).length} cafés associados</span></button>)}</div> : <EmptyState icon={Sprout} title="Toda origem tem uma história">Cadastre um registro aqui ou durante o cadastro de um café. Só o nome é necessário.</EmptyState>}</>}{editing && <Dialog title={editing === 'new' ? `Novo registro: ${recordLabels[kind]}` : `Editar: ${editing.name}`} onClose={() => setEditing(undefined)}><RecordForm kind={editing === 'new' ? kind : editing.kind} existing={editing === 'new' ? undefined : editing} onCancel={() => setEditing(undefined)} onSaved={id => { setSelected(id); setEditing(undefined); }} /></Dialog>}</section>;
}
