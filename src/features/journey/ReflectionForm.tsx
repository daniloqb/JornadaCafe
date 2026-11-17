import { useState } from 'react';
import { useCollection } from '../../data/CollectionContext';
import { newEntity } from '../../domain/collection';
import { localDay, type Reflection } from '../../domain/journey';
import { Dialog, Field, FormError, TextArea, formText, useFormAction } from '../../components/forms';
import { Button } from '../../components/ui';

export function ReflectionForm({ existing, onClose }: { existing?: Reflection; onClose: () => void }) {
  const { data, mutate } = useCollection(); const action = useFormAction();
  const [association, setAssociation] = useState(existing?.association ? `${existing.association.kind}:${existing.association.id}` : '');
  const available = existing?.association && (existing.association.kind === 'coffee' ? data.coffees : data.preparations).some(item => item.id === existing.association!.id);
  return <Dialog title={existing ? 'Editar reflexão' : 'Registrar uma reflexão'} onClose={onClose} busy={action.busy}>
    <form className="journal-form reflection-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => {
      const [kind, id] = association.split(':');
      await mutate({ type: 'reflection', value: { ...(existing ?? newEntity()), occurredOn: String(form.get('occurredOn')), title: formText(form, 'title'), text: String(form.get('text') ?? ''), category: formText(form, 'category'), featured: form.get('featured') === 'on', association: id ? { kind: kind as 'coffee' | 'preparation', id } : undefined } });
      onClose();
    }); }}>
      <p>Um espaço para suas próprias palavras. Basta uma data e o que você quer guardar.</p>
      <FormError error={action.error} />
      <Field label="Data da experiência" name="occurredOn" type="date" required defaultValue={existing?.occurredOn ?? localDay()} />
      <Field label="Título (opcional)" name="title" maxLength={200} defaultValue={existing?.title} />
      <TextArea label="Sua reflexão (obrigatória)" name="text" required rows={7} defaultValue={existing?.text} />
      <details className="reflection-options" open={!!existing?.association || !!existing?.category || !!existing?.featured}>
        <summary>Categoria, associação e destaque (opcionais)</summary>
        <Field label="Categoria (opcional)" name="category" list="reflection-categories" maxLength={100} defaultValue={existing?.category} />
        <datalist id="reflection-categories"><option value="Aprendizado" /><option value="Percepção sensorial" /><option value="Experiência pessoal" /></datalist>
        <label className="form-field"><span>Associar a um registro (opcional)</span><select value={association} onChange={e => setAssociation(e.target.value)}><option value="">Sem associação</option>{existing?.association && !available && <option value={`${existing.association.kind}:${existing.association.id}`}>Registro associado indisponível (vínculo preservado)</option>}<optgroup label="Cafés">{data.coffees.map(c => <option key={c.id} value={`coffee:${c.id}`}>{c.name}</option>)}</optgroup><optgroup label="Preparos">{data.preparations.map(p => <option key={p.id} value={`preparation:${p.id}`}>{p.snapshot.recipe.name} · {new Date(p.finishedAt).toLocaleDateString('pt-BR')}</option>)}</optgroup></select></label>
        <label className="checkbox-field"><input type="checkbox" name="featured" defaultChecked={existing?.featured} />Destacar esta reflexão no diário</label>
      </details>
      <div className="form-actions"><Button type="button" variant="secondary" disabled={action.busy} onClick={onClose}>Cancelar</Button><Button disabled={action.busy}>{action.busy ? 'Salvando…' : 'Salvar reflexão'}</Button></div>
    </form>
  </Dialog>;
}
