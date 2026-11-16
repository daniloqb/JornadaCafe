import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { useAppearance, type Appearance } from './appearance';

export function AppearanceControl({ expanded = false }: { expanded?: boolean }) {
  const { appearance, chooseAppearance, saveFailed } = useAppearance();
  const warningId = useId();
  const Icon = appearance === 'system' ? Monitor : appearance === 'dark' ? Moon : Sun;

  return <div className="appearance-control">
    {expanded ? <fieldset className="appearance-options"><legend className="sr-only">Aparência do aplicativo</legend>{([['dark', 'Escuro', Moon], ['light', 'Claro', Sun], ['system', 'Automático', Monitor]] as const).map(([value, label, ThemeIcon]) => <label key={value} className={`appearance-option${appearance === value ? ' is-selected' : ''}`}><ThemeIcon size={32} aria-hidden="true" /><span>{label}</span><input type="radio" name="settings-appearance" value={value} checked={appearance === value} onChange={() => chooseAppearance(value)} /></label>)}</fieldset> : <label className="appearance-select">
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">Aparência</span>
      <select value={appearance} onChange={(event) => chooseAppearance(event.target.value as Appearance)} aria-describedby={saveFailed ? warningId : undefined}>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Automático (sistema)</option>
      </select>
    </label>}
    {saveFailed && <p id={warningId} className="appearance-warning" role="status">Não foi possível salvar a aparência. Sua escolha vale apenas nesta sessão.</p>}
  </div>;
}
