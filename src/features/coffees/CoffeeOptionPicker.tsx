import { useEffect, useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../components/ui';
import { Dialog, Field, FormError, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { newEntity } from '../../domain/collection';
import { coffeeOptions, optionKey, type CoffeeOptionKind } from '../../domain/coffee-profile';

export function CoffeeOptionPicker({ kind, value, onChange }: { kind: CoffeeOptionKind; value: string[]; onChange: (ids: string[]) => void }) {
  const { data, mutate } = useCollection();
  const label = kind === 'species' ? 'Espécie' : 'Notas sensoriais';
  const multiple = kind === 'sensoryTag';
  const id = useId(); const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(''); const [open, setOpen] = useState(false); const [active, setActive] = useState(0); const [creating, setCreating] = useState(false);
  const action = useFormAction();
  const options = coffeeOptions(data, kind); const selected = options.filter(r => value.includes(r.id));
  const filtered = options.filter(r => !value.includes(r.id) && optionKey(r.name).includes(optionKey(query)));
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { if (open && filtered[active]) document.getElementById(`${id}-${filtered[active].id}`)?.scrollIntoView({ block: 'nearest' }); }, [active, open, id, filtered[active]?.id]);
  function choose(optionId: string) { onChange(multiple ? [...new Set([...value, optionId])] : [optionId]); setQuery(''); setOpen(false); input.current?.focus(); }
  return <div className="coffee-option-picker" ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label className="form-field" htmlFor={id}><span>{label}</span></label>
    {selected.length > 0 && <div className="selected-options">{selected.map(r => <span className="selected-option" key={r.id}>{r.name}<Button type="button" variant="secondary" aria-label={`Remover ${r.name}`} onClick={() => onChange(value.filter(v => v !== r.id))}><X size={16} aria-hidden="true" /></Button></span>)}</div>}
    <div className="option-search-row"><input ref={input} id={id} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-list`} aria-activedescendant={open && filtered[active] ? `${id}-${filtered[active].id}` : undefined} value={query} placeholder={selected.length && !multiple ? 'Pesquisar para substituir…' : `Pesquisar ${multiple ? 'notas' : 'espécies'}…`} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(n => Math.min(n + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(0, n - 1)); }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      if (e.key === 'Enter' && open) { e.preventDefault(); if (filtered[active]) choose(filtered[active].id); }
    }} /><Button type="button" variant="secondary" aria-label={`Nova ${kind === 'species' ? 'espécie' : 'nota sensorial'}`} onClick={() => { setCreating(true); setOpen(false); }}><Plus size={17} aria-hidden="true" />Novo</Button></div>
    <ul id={`${id}-list`} className="option-results" role="listbox" aria-label={`Opções de ${label.toLocaleLowerCase('pt-BR')}`} hidden={!open}>{filtered.map((r, index) => <li id={`${id}-${r.id}`} role="option" aria-selected={index === active} key={r.id} onPointerDown={e => e.preventDefault()} onClick={() => choose(r.id)}>{r.name}</li>)}{!filtered.length && <li role="presentation">Nenhuma opção disponível. Use + Novo para cadastrar.</li>}</ul>
    <small className="field-hint">{multiple ? 'Selecione uma ou mais notas. ' : ''}Escolha uma opção ou use + Novo. Opcional.</small>
    {creating && <Dialog title={`Nova ${kind === 'species' ? 'espécie' : 'nota sensorial'}`} busy={action.busy} onClose={() => { setCreating(false); input.current?.focus(); }}><form className="journal-form" onSubmit={event => {
      event.preventDefault(); event.stopPropagation(); const form = new FormData(event.currentTarget);
      void action.run(async () => { const record = { ...newEntity(), kind, name: formText(form, 'name') ?? '' }; await mutate({ type: 'record', value: record }); onChange(multiple ? [...new Set([...value, record.id])] : [record.id]); setQuery(''); setCreating(false); input.current?.focus(); });
    }}><FormError error={action.error} /><Field label={kind === 'species' ? 'Nome da espécie' : 'Nome da nota sensorial'} name="name" required maxLength={200} defaultValue={query} autoFocus /><div className="form-actions"><Button type="button" variant="secondary" disabled={action.busy} onClick={() => setCreating(false)}>Cancelar</Button><Button disabled={action.busy}>{action.busy ? 'Salvando…' : 'Salvar opção'}</Button></div></form></Dialog>}
  </div>;
}
