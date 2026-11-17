import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Droplets, Layers, Milk, Pause, Play, Timer, X } from 'lucide-react';
import { Button, Card, Notice, PageHeader } from '../../components/ui';
import { Dialog, FormError, TextArea, useFormAction } from '../../components/forms';
import { useBrew } from './BrewContext';
import { grams } from '../../domain/collection';
import { advanceLabels, secondsLabel } from '../../domain/brewing';
import { elapsedLabel, SnapshotParameters } from './PreparationHistory';
import type { Preparation } from '../../domain/preparation';
import { StepsTimeline } from './StepsTimeline';
import { PreparationHeading } from './PreparationHeading';

export function AlertControls() {
  const { preferences, choosePreferences, preferenceError, testAlerts } = useBrew();
  return <div className="brew-alert-controls"><label><input type="checkbox" checked={preferences.sound} onChange={e => choosePreferences({ ...preferences, sound: e.target.checked })} /> Som</label><label><input type="checkbox" checked={preferences.vibration} onChange={e => choosePreferences({ ...preferences, vibration: e.target.checked })} /> Vibração</label><Button type="button" variant="secondary" onClick={testAlerts}>Testar avisos</Button>{preferenceError && <p role="status">Não foi possível salvar os avisos. A escolha vale nesta sessão.</p>}<p className="field-hint">Avisos opcionais, conforme o suporte do aparelho. Sons e vibração podem parar com a tela bloqueada ou o app em segundo plano.</p></div>;
}
export function PreparationRun() {
  const brew = useBrew(); const { session } = brew;
  const action = useFormAction(); const [dialog, setDialog] = useState<'complete' | 'interrupt' | 'previous'>();
  const [notes, setNotes] = useState(''); const [consume, setConsume] = useState(false);
  if (!session) return <><PageHeader eyebrow="SEU RITUAL" title="Nenhum preparo em andamento" description="Escolha uma receita para começar seu próximo café." /><a className="button button--primary" href="#/preparar">Consultar receitas</a></>;
  const r = session.snapshot.recipe, step = r.steps[session.stepIndex], next = r.steps[session.stepIndex + 1];
  const stepElapsed = Math.max(0, session.elapsedMs - session.stepStartedMs);
  const remaining = step.durationSeconds !== undefined ? Math.max(0, step.durationSeconds * 1000 - stepElapsed) : undefined;
  const progress = step.durationSeconds && step.durationSeconds > 0 ? Math.min(1, stepElapsed / (step.durationSeconds * 1000)) : undefined;
  const paused = session.status === 'paused';
  function openDialog(value: 'complete' | 'interrupt' | 'previous') { setConsume(false); void action.run(async () => { await brew.pause(); setDialog(value); }); }
  async function save(state: Preparation['state']) { const id = await brew.finish(state, notes, consume); setDialog(undefined); location.hash = `/preparar/historico/${id}`; }
  return <div className="guided-preparation">
    <PreparationHeading guided recipeName={r.name} backHref={`#/preparar/receitas/${r.id}`} />
    <FormError error={action.error} />
    {brew.recovered && <Notice title="Preparo recuperado">Confira a etapa antes de retomar. O tempo foi recuperado a partir do último checkpoint; nenhuma etapa foi concluída automaticamente.</Notice>}
    {session.needsConfirmation && <Notice title="O tempo desta etapa terminou">Confira o que já foi feito antes de continuar. {next ? 'A próxima etapa aguarda sua confirmação.' : 'Confirme a finalização quando terminar seu preparo.'}</Notice>}
    <Card className="brew-panel">
      <div className="brew-stage-progress"><strong>Etapa {session.stepIndex + 1} de {r.steps.length}</strong><div className="brew-stage-dots" aria-hidden="true">{r.steps.map((s, index) => <span className={index === session.stepIndex ? 'is-current' : ''} key={s.id} />)}</div><progress value={session.stepIndex + 1} max={r.steps.length} aria-label={`Etapa ${session.stepIndex + 1} de ${r.steps.length}`} /></div>
      <div className="brew-current-step">
        <div className="brew-action-icon" aria-hidden="true">{step.type === 'pour' ? <><Milk /><Droplets /></> : <Timer />}</div>
        <div><p className="brew-action-label">O que fazer agora</p><h2 aria-live="polite" aria-atomic="true">{step.type === 'pour' ? `Adicionar ${grams(step.water)} de água` : step.name}</h2>{step.type === 'pour' && <p className="brew-step-name">{step.name}</p>}<p className="brew-condition">{advanceLabels[step.advance]}{step.advance === 'observable' ? `: ${step.condition}` : step.advance === 'time' ? ` após ${secondsLabel(step.durationSeconds!)} nesta etapa.` : '. Continue quando concluir a ação.'}</p>{step.notes && <details className="brew-instruction-notes"><summary>Orientação desta etapa</summary><p className="preserve-lines">{step.notes}</p></details>}</div>
      </div>

      <div className="brew-clock-card">
        <div className="brew-clock">
          <svg className="brew-clock-ring" viewBox="0 0 240 240" aria-hidden="true"><circle className="brew-clock-track" cx="120" cy="120" r="110" />{progress !== undefined && <circle className="brew-clock-progress" cx="120" cy="120" r="110" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />}</svg>
          <div className="brew-clock-face"><div role="timer" aria-live="off" aria-label={`Tempo desta etapa: ${elapsedLabel(stepElapsed)}`}><span>Tempo desta etapa</span><strong>{elapsedLabel(stepElapsed)}</strong><small>{step.durationSeconds !== undefined ? `de ${secondsLabel(step.durationSeconds)}` : paused ? session.elapsedMs === 0 ? 'Pronto para iniciar' : 'Pausado' : 'Sem duração definida'}</small></div><Button className="brew-clock-toggle" disabled={action.busy} onClick={() => void action.run(paused ? brew.resume : brew.pause)}>{paused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}{paused ? session.elapsedMs === 0 ? 'Iniciar' : 'Retomar' : 'Pausar'}</Button></div>
        </div>
        {remaining === 0 && <p className="brew-clock-caption">Tempo de referência atingido. {step.advance !== 'time' && 'Confira a ação antes de continuar.'}</p>}
        {step.startSeconds !== undefined && <p className="brew-clock-caption">Início previsto: {secondsLabel(step.startSeconds)} desde o começo do preparo.</p>}
      </div>

      <div className="brew-metrics">
        <div className="brew-metric"><Timer aria-hidden="true" /><div><span>Tempo total</span><strong data-testid="brew-total-time">{elapsedLabel(session.elapsedMs)}</strong><small>{r.estimatedSeconds !== undefined ? `(previsão: ${secondsLabel(r.estimatedSeconds)})` : 'Sem previsão definida'}</small></div></div>
        <div className="brew-metric brew-metric--target"><Layers aria-hidden="true" /><div><span>Meta acumulada</span><strong>{grams(step.cumulativeWater)}</strong><small>Peso esperado na balança</small></div></div>
      </div>
      <div className="brew-sequence"><h2 className="sr-only">Seu preparo, etapa a etapa</h2><StepsTimeline steps={r.steps} currentIndex={session.stepIndex} /></div>
    </Card>
    <div className="brew-main-controls">
      <Button variant="secondary" disabled={action.busy || session.stepIndex === 0} onClick={() => openDialog('previous')}><ArrowLeft size={20} aria-hidden="true" />Anterior</Button>
      {next ? <Button disabled={action.busy || paused} onClick={() => void action.run(brew.next)}>{step.advance === 'observable' ? 'Condição observada — continuar' : session.needsConfirmation ? 'Confirmar e continuar' : 'Próxima etapa'}<ArrowRight size={20} aria-hidden="true" /></Button> : <Button disabled={action.busy} onClick={() => openDialog('complete')}>Finalizar preparo<Check size={20} aria-hidden="true" /></Button>}
    </div>
    <p className="brew-next">{next ? <>Próxima: <strong>{next.name}</strong>{next.startSeconds !== undefined && ` · referência ${secondsLabel(next.startSeconds)} desde o início`}</> : 'Esta é a última etapa. Finalize quando terminar.'}</p>
    <div className={`brew-secondary-controls${next ? '' : ' brew-secondary-controls--single'}`}>{next && <Button variant="secondary" className="brew-finish-action" aria-label="Finalizar preparo antes da última etapa" disabled={action.busy} onClick={() => openDialog('complete')}><Check size={18} aria-hidden="true" />Finalizar</Button>}<Button variant="secondary" className="brew-cancel-action" aria-label="Cancelar preparo" disabled={action.busy} onClick={() => openDialog('interrupt')}><X size={18} aria-hidden="true" />Cancelar</Button></div>
    <details className="card detail-section"><summary>Parâmetros deste preparo</summary><SnapshotParameters snapshot={session.snapshot} /></details>
    <details className="card review-adjustments"><summary>Avisos do preparo</summary><AlertControls /></details>
    <a className="back-link" href="#/preparar">Voltar à biblioteca mantendo o preparo</a>
    {dialog && <Dialog title={dialog === 'complete' ? 'Concluir e salvar preparo?' : dialog === 'previous' ? 'Voltar à etapa anterior?' : 'Interromper preparo?'} busy={action.busy} onClose={() => setDialog(undefined)}><FormError error={action.error} />{dialog === 'previous' ? <><p>Voltar não desfaz água nem café já utilizados. A etapa anterior será acompanhada novamente e esta passagem ficará registrada.</p><div className="form-actions"><Button variant="secondary" disabled={action.busy} onClick={() => setDialog(undefined)}>Manter etapa atual</Button><Button disabled={action.busy} onClick={() => void action.run(async () => { await brew.previous(); setDialog(undefined); })}>Confirmar retorno</Button></div></> : <><p>{dialog === 'complete' ? `${next ? `Você está na etapa ${session.stepIndex + 1} de ${r.steps.length}. As demais não serão marcadas como acompanhadas. ` : ''}${session.snapshot.packet ? `Ao salvar, ${grams(r.dose)} serão descontados do pacote selecionado.` : 'Nenhum estoque será descontado.'}` : 'Você pode guardar este preparo como interrompido ou descartá-lo. Nenhum consumo é descontado automaticamente.'}</p><TextArea label="Observação do preparo" value={notes} onChange={e => setNotes(e.target.value)} />{dialog === 'interrupt' && session.snapshot.packet && <label className="brew-consume-confirm"><input type="checkbox" checked={consume} onChange={e => setConsume(e.target.checked)} /> Confirmo o consumo de {grams(r.dose)} deste pacote, mesmo com o preparo interrompido.</label>}<div className="form-actions"><Button className="back-link" variant="secondary" disabled={action.busy} onClick={() => setDialog(undefined)}>Voltar ao preparo pausado</Button>{dialog === 'interrupt' && <Button variant="secondary" disabled={action.busy} onClick={() => { if (window.confirm('Descartar este preparo sem registro e sem desconto de estoque?')) void action.run(async () => { await brew.discard(); setDialog(undefined); location.hash = '/preparar'; }); }}>Descartar sem registro</Button>}<Button disabled={action.busy} onClick={() => void action.run(() => save(dialog === 'complete' ? 'completed' : 'interrupted'))}>{action.busy ? 'Salvando…' : dialog === 'complete' ? 'Salvar concluído' : consume ? 'Salvar interrompido e consumir dose' : 'Salvar interrompido sem consumo'}</Button></div></>}</Dialog>}</div>;
}
