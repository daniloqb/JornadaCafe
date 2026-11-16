import { useEffect, useState } from 'react';
import { CoffeePhoto } from './CoffeePhoto';
import { FormError } from './forms';
import { Button } from './ui';
import { preparePhoto } from '../data/photos';

export function LocalPhotoPicker({ id, name, photo, onChange, onBusyChange, subject = 'Produtor', disabled = false }: { id?: string; name: string; subject?: string; disabled?: boolean; photo?: Blob | null; onChange: (value: Blob | null) => void; onBusyChange: (busy: boolean) => void }) {
  const [preview, setPreview] = useState<string>(); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!photo) { setPreview(undefined); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  return <><div className="photo-editor"><div className="photo-preview">{preview ? <img src={preview} alt={`Prévia da imagem — ${subject}`} /> : <CoffeePhoto id={photo === null ? undefined : id} name={name} subject={subject} />}</div><div><label className={`button button--edit photo-upload${busy || disabled ? ' photo-upload--disabled' : ''}`}>{busy ? 'Preparando imagem…' : `Escolher imagem ${subject === 'Técnica' ? 'da técnica' : subject === 'Método' ? 'do método' : 'do produtor'}`}<input aria-label={`Escolher imagem ${subject === 'Técnica' ? 'da técnica' : subject === 'Método' ? 'do método' : 'do produtor'}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={event => {
    const file = event.target.files?.[0]; if (!file) return; event.target.value = ''; setBusy(true); onBusyChange(true); setError(undefined);
    void preparePhoto(file).then(onChange).catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível preparar a fotografia.')).finally(() => { setBusy(false); onBusyChange(false); });
  }} /></label><p className="field-hint">Opcional. JPG, PNG ou WebP, até 15 MB; salva neste dispositivo.</p>{(photo || (id && photo !== null)) && <Button type="button" variant="danger" disabled={busy || disabled} onClick={() => onChange(null)}>Remover imagem</Button>}</div></div><FormError error={error} /></>;
}
