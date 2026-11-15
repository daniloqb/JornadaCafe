import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance, type Appearance } from './appearance';

export function AppearanceControl() {
  const { appearance, chooseAppearance, saveFailed } = useAppearance();
  const Icon = appearance === 'system' ? Monitor : appearance === 'dark' ? Moon : Sun;

  return <div className="appearance-control">
    <label className="appearance-select">
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">Aparência</span>
      <select value={appearance} onChange={(event) => chooseAppearance(event.target.value as Appearance)} aria-describedby={saveFailed ? 'appearance-warning' : undefined}>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Automático (sistema)</option>
      </select>
    </label>
    {saveFailed && <p id="appearance-warning" className="appearance-warning" role="status">Não foi possível salvar a aparência. Sua escolha vale apenas nesta sessão.</p>}
  </div>;
}
