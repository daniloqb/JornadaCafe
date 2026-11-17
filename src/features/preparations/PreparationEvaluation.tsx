import { useState } from 'react';
import type { Preparation } from '../../domain/preparation';
import { sensoryFields } from '../../domain/journey';
import { useCollection } from '../../data/CollectionContext';
import { Button, Card } from '../../components/ui';
import { Dialog, FormError, TextArea, useFormAction } from '../../components/forms';

export function PreparationEvaluation({ preparation: p }: { preparation: Preparation }) {
  const [editing, setEditing] = useState(false); const action = useFormAction(); const { mutate } = useCollection();
  const labels = { overall: 'Avaliação geral', ...sensoryFields }; const evaluation = p.evaluation;
  if (p.state !== 'completed') return null;
  return <Card className="detail-section"><h2>Minha avaliação desta xícara</h2>{evaluation ? <><dl className="detail-facts">{Object.entries(labels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{evaluation[key as keyof typeof labels] !== undefined ? `${evaluation[key as keyof typeof labels]} / 10` : 'Não registrada'}</dd></div>)}</dl>{evaluation.tags.length > 0 && <p>Percepções: {evaluation.tags.join(' · ')}</p>}</> : <p>Ainda não há avaliação deste preparo. As notas do cadastro do café permanecem separadas.</p>}<Button variant="secondary" onClick={() => setEditing(true)}>{evaluation ? 'Editar avaliação do preparo' : 'Avaliar este preparo'}</Button>
    {editing && <Dialog title="Avaliar preparo" busy={action.busy} onClose={() => setEditing(false)}><form className="journal-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => {
      const ratings = Object.fromEntries(Object.keys(labels).map(key => [key, form.get(key) === '' ? undefined : Number(form.get(key))])); const now = new Date().toISOString();
      await mutate({ type: 'evaluatePreparation', id: p.id, value: { ...ratings, tags: String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean), createdAt: evaluation?.createdAt ?? now, updatedAt: now } }); setEditing(false);
    }); }}><p>Registre apenas o que quiser. Deixe sem informação o que você não avaliou.</p><FormError error={action.error} /><div className="evaluation-fields">{Object.entries(labels).map(([key, label]) => <label className="form-field" key={key}><span>{label}</span><select name={key} defaultValue={evaluation?.[key as keyof typeof labels] ?? ''}><option value="">Sem informação</option>{Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n} / 10</option>)}</select></label>)}</div><TextArea label="Percepções sensoriais (separadas por vírgula)" name="tags" defaultValue={evaluation?.tags.join(', ')} /><div className="form-actions"><Button type="button" variant="secondary" disabled={action.busy} onClick={() => setEditing(false)}>Cancelar</Button><Button disabled={action.busy}>{action.busy ? 'Salvando…' : 'Salvar avaliação'}</Button></div></form></Dialog>}
  </Card>;
}
