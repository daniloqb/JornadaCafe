import { useState, type ReactNode, type ComponentProps } from 'react';
import { Button } from '../../components/ui';
import { Dialog, Field, FormError, TextArea, formText, useFormAction } from '../../components/forms';
import { LocalPhotoPicker } from '../../components/LocalPhotoPicker';
import { useCollection } from '../../data/CollectionContext';
import { newEntity } from '../../domain/collection';
import type { BrewMethod, BrewTechnique, SourceReference } from '../../domain/brewing';

export function SelectField({ label, children, ...props }: ComponentProps<'select'> & { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}{props.required && <span aria-hidden="true"> *</span>}</span><select {...props}>{children}</select></label>;
}
export function SourcesEditor({ sources, onChange, single = false }: { sources: SourceReference[]; onChange: (sources: SourceReference[]) => void; single?: boolean }) {
  function update(index: number, patch: Partial<SourceReference>) { onChange(sources.map((s, i) => i === index ? { ...s, ...patch } : s)); }
  return <div className="sources-editor">{sources.map((source, i) => <fieldset className="source-editor" key={source.id}><legend>Fonte {i + 1}</legend><Field label={`Título ou publicação da fonte ${i + 1}`} value={source.title ?? ''} onChange={e => update(i, { title: e.target.value })} /><Field label={`Canal ou autor da fonte ${i + 1}`} value={source.author ?? ''} onChange={e => update(i, { author: e.target.value })} /><Field label={`Link da fonte ${i + 1}`} type="url" placeholder="https://…" value={source.url ?? ''} onChange={e => update(i, { url: e.target.value })} /><TextArea label={`Observações da fonte ${i + 1}`} value={source.notes ?? ''} onChange={e => update(i, { notes: e.target.value })} /><Button variant="secondary" type="button" onClick={() => onChange(sources.filter((_, n) => n !== i))}>Remover fonte {i + 1}</Button></fieldset>)}{(!single || !sources.length) && <Button variant="secondary" type="button" onClick={() => onChange([...sources, { id: crypto.randomUUID() }])}>Adicionar fonte</Button>}</div>;
}
export function MethodForm({ existing, onSaved }: { existing?: BrewMethod; onSaved: (id: string) => void }) {
  const { saveMethod } = useCollection();
  const action = useFormAction();
  const [photo, setPhoto] = useState<Blob | null>();
  const [photoBusy, setPhotoBusy] = useState(false);
  return <form className="journal-form" onSubmit={event => {
    event.preventDefault(); event.stopPropagation(); if (photoBusy) return; const form = new FormData(event.currentTarget);
    void action.run(async () => { const value = { ...(existing ?? newEntity()), name: formText(form, 'name') ?? '', description: formText(form, 'description'), notes: formText(form, 'notes') }; await saveMethod(value, photo); onSaved(value.id); });
  }}><FormError error={action.error} /><Field label="Nome do método" name="name" required defaultValue={existing?.name} maxLength={200} autoFocus /><TextArea label="Descrição do método" name="description" defaultValue={existing?.description} /><details className="form-section"><summary>Fotografia ou ilustração <small>Opcional, salva neste dispositivo</small></summary><LocalPhotoPicker id={existing?.photoId} name={existing?.name ?? 'método'} subject="Método" photo={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={action.busy} /></details><TextArea label="Observações do método" name="notes" defaultValue={existing?.notes} /><div className="form-actions"><Button disabled={action.busy || photoBusy}>{action.busy ? 'Salvando…' : 'Salvar método'}</Button></div></form>;
}
export function TechniqueForm({ existing, onSaved, defaultMethodId }: { existing?: BrewTechnique; onSaved: (id: string, methodId?: string) => void; defaultMethodId?: string }) {
  const { data, saveTechnique } = useCollection();
  const action = useFormAction();
  const [photo, setPhoto] = useState<Blob | null>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sources, setSources] = useState<SourceReference[]>(existing?.sources ?? []);
  return <form className="journal-form" onSubmit={event => {
    event.preventDefault(); event.stopPropagation(); if (photoBusy) return; const form = new FormData(event.currentTarget);
    void action.run(async () => { const value: BrewTechnique = { ...(existing ?? newEntity()), name: formText(form, 'name') ?? '', methodId: formText(form, 'methodId'), creator: formText(form, 'creator'), principle: formText(form, 'principle'), guidance: formText(form, 'guidance'), notes: formText(form, 'notes'), sources }; await saveTechnique(value, photo); onSaved(value.id, value.methodId); });
  }}><FormError error={action.error} /><Field label="Nome da técnica" name="name" required defaultValue={existing?.name} maxLength={200} autoFocus /><details className="form-section"><summary>Fotografia ou ilustração <small>Opcional, salva neste dispositivo</small></summary><LocalPhotoPicker id={existing?.photoId} name={existing?.name ?? 'técnica'} subject="Técnica" photo={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={action.busy} /></details><SelectField label="Método associado" name="methodId" defaultValue={existing?.methodId ?? defaultMethodId ?? ''}><option value="">Sem método específico</option>{data.methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</SelectField><Field label="Criador original da técnica" name="creator" defaultValue={existing?.creator} hint="Opcional. Pode ser diferente do autor ou canal que apresentou a técnica." /><TextArea label="Princípio da técnica" name="principle" defaultValue={existing?.principle} /><details className="form-section" open={!!sources.length}><summary>Fontes e referências <small>Vídeos, livros, cursos ou outras fontes</small></summary><p className="field-hint">Registre quem apresentou a técnica em cada fonte. Isso não atribui a criação a essa pessoa.</p><SourcesEditor sources={sources} onChange={setSources} /></details><details className="form-section"><summary>Orientações e notas pessoais</summary><TextArea label="Orientações gerais" name="guidance" defaultValue={existing?.guidance} /><TextArea label="Observações pessoais" name="notes" defaultValue={existing?.notes} /></details><div className="form-actions"><Button disabled={action.busy || photoBusy}>{action.busy ? 'Salvando…' : 'Salvar técnica'}</Button></div></form>;
}
export function LibraryPicker({ kind, value, onChange, methodId }: { kind: 'method' | 'technique'; value?: string; onChange: (id?: string, methodId?: string) => void; methodId?: string }) {
  const { data } = useCollection(); const [creating, setCreating] = useState(false);
  const methods = kind === 'method';
  const items = methods ? data.methods : data.techniques.filter(t => !t.methodId || t.methodId === methodId);
  const saved = (id: string, associatedMethodId?: string) => { onChange(id, associatedMethodId); setCreating(false); };
  return <div className="record-picker"><SelectField label={methods ? 'Método' : 'Técnica'} required={methods} value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}><option value="">{methods ? 'Selecione o método' : 'Sem técnica específica'}</option>{items.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</SelectField><Button type="button" variant="secondary" onClick={() => setCreating(true)}>{methods ? 'Novo método' : 'Nova técnica'}</Button>{creating && <Dialog title={methods ? 'Cadastrar método' : 'Cadastrar técnica'} onClose={() => setCreating(false)}>{methods ? <MethodForm onSaved={saved} /> : <TechniqueForm defaultMethodId={methodId} onSaved={saved} />}</Dialog>}</div>;
}
