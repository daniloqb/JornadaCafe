import { useId } from 'react';
import { Button, Card } from '../components/ui';
import { textSizes, useTextSize } from './text-size';

export function TextSizeControl() {
  const id = useId(); const { size, chooseSize, saveFailed } = useTextSize();
  const label = size === 100 ? 'Padrão' : size === 85 ? 'Menor' : size === 115 ? 'Maior' : undefined;
  return <Card className="settings-section text-size-settings">
    <h2 id={`${id}-title`}>Tamanho do texto</h2><p id={`${id}-description`}>Ajuste o tamanho das letras para uma leitura mais confortável.</p>
    <div className="text-size-slider-row"><input id={id} className="text-size-slider" type="range" min="0" max="4" step="1" value={textSizes.indexOf(size)} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-valuetext={`${size}%${label ? ` — ${label}` : ''}`} onChange={event => chooseSize(textSizes[Number(event.target.value)])} /><output htmlFor={id} className="text-size-percent">{size}%</output></div>
    <div className="text-size-stops" aria-hidden="true">{textSizes.map(value => <span key={value}>{value}%</span>)}</div>
    <Card className="text-size-preview" aria-label="Prévia do tamanho do texto"><h3>Uma pausa para o café</h3><p>Cada xícara pode guardar uma nova descoberta.</p><small>Prévia de leitura · neste dispositivo</small></Card>
    <Button type="button" variant="secondary" className="text-size-reset" onClick={() => chooseSize(100)}>Restaurar tamanho padrão</Button>
    {saveFailed && <p className="field-hint" role="status">Não foi possível salvar o tamanho do texto. A escolha vale nesta sessão.</p>}
  </Card>;
}
