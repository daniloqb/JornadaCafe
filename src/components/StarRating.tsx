import { Star } from 'lucide-react';
import { useId } from 'react';
import { Button } from './ui';

export function RatingValue({ value }: { value?: number }) {
  return <div className="rating-value"><span className="rating-stars" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <Star key={i} size={18} fill={value !== undefined && i < value ? 'currentColor' : 'none'} />)}</span><span>{value === undefined ? 'Sem avaliação' : `${value} / 10`}</span></div>;
}
/** Native select keeps all eleven choices comfortably usable on narrow screens. */
export function StarRating({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  const id = useId();
  return <fieldset className="star-rating"><legend>{label}</legend><RatingValue value={value} /><div className="rating-controls"><label className="form-field"><span id={`${id}-label`} className="sr-only">Avaliar {label.toLocaleLowerCase('pt-BR')}</span><select id={id} aria-labelledby={`${id}-label`} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}><option value="">Sem avaliação</option>{Array.from({ length: 11 }, (_, i) => <option value={i} key={i}>{i} de 10</option>)}</select></label><Button type="button" variant="secondary" disabled={value === undefined} onClick={() => onChange(undefined)} aria-label={`Limpar ${label.toLocaleLowerCase('pt-BR')}`}>Limpar</Button></div></fieldset>;
}
