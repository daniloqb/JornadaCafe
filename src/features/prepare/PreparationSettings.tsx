import { ArrowLeft, Bell, Ruler } from 'lucide-react';
import { BackLink, Card } from '../../components/ui';
import { TextSizeControl } from '../../theme/TextSizeControl';
import { AppearanceControl } from '../../theme/AppearanceControl';
import { AlertControls } from '../preparations/PreparationRun';

export function PreparationSettings() {
  return <div className="preparation-settings"><header className="settings-heading"><BackLink href="#/inicio"><ArrowLeft size={23} aria-hidden="true" /><span className="sr-only">Voltar ao início</span></BackLink><h1 tabIndex={-1}>Configurações</h1></header><Card className="settings-section"><h2>Aparência</h2><p>Escolha o tema do aplicativo.</p><AppearanceControl expanded /></Card><TextSizeControl /><h2 className="settings-subtitle">Mais configurações</h2><Card className="settings-section"><div className="review-section-heading"><Bell size={22} aria-hidden="true" /><h2>Avisos do preparo</h2></div><p>Som e vibração para acompanhar suas etapas.</p><AlertControls /></Card><Card className="settings-section"><div className="review-section-heading"><Ruler size={22} aria-hidden="true" /><h2>Unidades de medida</h2></div><p>Café e água em gramas (g), temperatura em °C e tempo em minutos e segundos. As unidades acompanham os registros existentes.</p></Card></div>;
}
