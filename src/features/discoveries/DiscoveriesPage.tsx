import { Compass, Flower2, NotebookPen } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../../components/ui';

export function DiscoveriesPage() {
  return <>
    <PageHeader eyebrow="CURIOSIDADE QUE VIRA REPERTÓRIO" title="Minhas Descobertas" description="Um cantinho para o que você percebe, aprende e leva para a próxima xícara." />
    <Card className="discoveries-paper"><EmptyState icon={Compass} title="Há um mundo dentro da sua xícara">Novos aromas, sensações e ideias merecem ser lembrados.<br />Suas primeiras descobertas vão encontrar um lar aqui.</EmptyState><p className="phase-note">Os registros pessoais chegam nas próximas fases.</p></Card>
    <div className="discovery-grid"><div className="discovery-note"><NotebookPen size={25} strokeWidth={1.3} aria-hidden="true" /><h2>Notas para você mesmo</h2><p>Um espaço futuro para suas reflexões, aprendizados e perguntas pelo caminho.</p></div><div className="discovery-note"><Flower2 size={25} strokeWidth={1.3} aria-hidden="true" /><h2>Seu repertório sensorial</h2><p>Aromas, sabores e memórias. Aos poucos, você vai encontrar suas próprias palavras.</p></div></div>
  </>;
}
