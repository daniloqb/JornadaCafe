import { Coffee, NotebookPen, Sprout } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../../components/ui';

export function PreparePage() {
  return <>
    <PageHeader eyebrow="SEU PRÓXIMO RITUAL" title="Preparar" description="Um pouco de atenção, água quente e tempo para apreciar." />
    <div className="intro-banner"><Sprout size={29} strokeWidth={1.3} aria-hidden="true" /><div><h2>O ritual começa antes da primeira gota.</h2><p>Este será seu espaço para transformar bons cafés em bons momentos.</p></div></div>
    <div className="prepare-grid"><Card className="future-area"><span className="step-label">01 — O CAFÉ</span><Coffee size={30} strokeWidth={1.3} aria-hidden="true" /><h2>Qual café vai para a xícara?</h2><p>Seus cafés aparecerão aqui para você escolher o protagonista do preparo.</p><span className="coming-soon">Nas próximas fases</span></Card><Card className="future-area"><span className="step-label">02 — A RECEITA</span><NotebookPen size={30} strokeWidth={1.3} aria-hidden="true" /><h2>Encontre o seu jeito de preparar</h2><p>Um lugar para suas futuras receitas, proporções e métodos favoritos.</p><span className="coming-soon">Nas próximas fases</span></Card></div>
    <EmptyState icon={Sprout} title="Estamos preparando este cantinho">Os preparos estarão disponíveis nas próximas fases.<br />Por enquanto, aproveite para conhecer sua nova jornada.</EmptyState>
  </>;
}
