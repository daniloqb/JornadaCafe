import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Dialog, FormError, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { useBrew } from '../preparations/BrewContext';
import type { ClearDataScope } from '../../domain/data-management';
import { createPersonalArchive } from '../../transfer/archive';
import { readPortablePreferences } from '../../transfer/preferences';
import { saveArchive } from '../../transfer/platform';

export function ClearDataAction({ scope, blocked }: { scope: ClearDataScope; blocked: boolean }) {
  const { data, storage, mutate } = useCollection();
  const brew = useBrew();
  const action = useFormAction();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState('');
  const personal = scope === 'personal';
  const label = personal ? 'Limpar dados pessoais' : 'Limpar receitas e métodos';
  const hasSession = !!brew.session || data.sessions.length > 0;
  const close = () => { if (!action.busy) setOpen(false); };
  const counts = personal
    ? [['Cafés', data.coffees.length], ['Produtores, origens e opções', data.records.length], ['Pacotes e seus movimentos', data.packages.length], ['Preparações e avaliações', data.preparations.length], ['Reflexões', data.reflections.length]] as const
    : [['Métodos', data.methods.length], ['Técnicas', data.techniques.length], ['Versões de receitas', data.recipes.length]] as const;

  return <div className="data-clear-action">
    <Button variant="danger" disabled={blocked || hasSession || action.busy} onClick={() => {
      action.resetError(); setConfirmed(false); setComplete(false); setMessage(''); setOpen(true);
    }}><Trash2 size={18} aria-hidden="true" />{label}</Button>
    <p className="field-hint">{personal ? 'Remove a jornada pessoal e mantém a biblioteca.' : 'Remove a biblioteca atual e mantém seu histórico pessoal.'} Exige confirmação. As preferências são mantidas.</p>
    {hasSession && <p className="field-hint">Conclua ou descarte o preparo em andamento antes de limpar dados.</p>}
    {open && <Dialog title={complete ? 'Limpeza concluída' : `${label}?`} busy={action.busy} onClose={close} initialFocus="[data-keep-data]">
      <div className="data-dialog-body">
        <FormError error={action.error} />
        {complete ? <><p role="status">{personal ? 'Os dados pessoais foram limpos. Sua biblioteca e suas preferências foram mantidas.' : 'Receitas, técnicas e métodos foram limpos. Seus cafés, estoque, histórico, avaliações, reflexões e preferências foram mantidos.'}</p><Button data-keep-data onClick={close}>Concluir</Button></> : <>
          <p className="data-warning">{personal
            ? 'Serão excluídos cafés, produtores, origens, opções cadastradas, pacotes e movimentações de estoque, preparações com suas avaliações e correções, e reflexões. Jornada e Descobertas serão recalculadas sem esses registros.'
            : 'Serão excluídos todos os métodos, técnicas, receitas e suas versões da biblioteca atual.'} Esta ação não pode ser desfeita pelo aplicativo.</p>
          <dl className="data-counts">{counts.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}</dl>
          <p>{personal
            ? 'Métodos, técnicas e receitas serão mantidos, retirando apenas os vínculos com cafés excluídos. Suas preferências de aparência, texto e avisos também serão mantidas.'
            : 'Cafés, produtores, estoque, movimentações, preparações, avaliações e reflexões serão mantidos. Os snapshots históricos continuam com os parâmetros, etapas e identidades originais, mesmo sem a receita na biblioteca.'}</p>
          <p>Fotografias ainda utilizadas pelos dados mantidos serão preservadas. As demais fotografias armazenadas pelo aplicativo serão removidas.</p>
          <Button variant="secondary" disabled={action.busy} onClick={() => void action.run(async () => {
            if (!storage) throw new Error('Armazenamento indisponível.');
            const backup = await createPersonalArchive(await storage.exportState(), readPortablePreferences());
            setMessage(await saveArchive(backup));
          })}>Salvar backup completo antes de limpar</Button>
          {message && <p role="status" className="data-status">{message}</p>}
          {hasSession && <p role="status">Conclua ou descarte o preparo em andamento antes de limpar dados.</p>}
          <label className="data-choice"><input type="checkbox" checked={confirmed} disabled={action.busy} onChange={event => setConfirmed(event.target.checked)} /><span>Entendo que estes dados serão excluídos deste aplicativo.</span></label>
          <div className="form-actions">
            <Button variant="secondary" data-keep-data disabled={action.busy} onClick={close}>Manter meus dados</Button>
            <Button variant="danger" disabled={!confirmed || hasSession || action.busy} onClick={() => void action.run(async () => {
              if (!confirmed || hasSession) throw new Error('Confirme a exclusão e encerre o preparo em andamento.');
              await mutate({ type: 'clearData', scope }); setComplete(true);
            })}>{action.busy ? 'Limpando…' : 'Excluir os dados confirmados'}</Button>
          </div>
        </>}
      </div>
    </Dialog>}
  </div>;
}
