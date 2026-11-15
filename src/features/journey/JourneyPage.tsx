import { BookOpen, Feather } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../../components/ui';

export function JourneyPage() {
  return <>
    <PageHeader eyebrow="UMA XÍCARA DE CADA VEZ" title="Minha Jornada" description="O registro dos seus caminhos, experiências e pequenos encontros com o café." />
    <div className="journal-heading"><BookOpen size={19} aria-hidden="true" /><span>Seu caderno de experiências</span><span className="journal-rule" /></div>
    <section className="timeline" aria-label="Linha do tempo de experiências"><span className="timeline-dot" aria-hidden="true" /><Card className="journal-paper"><span className="eyebrow">HÁ MUITA HISTÓRIA PELA FRENTE</span><EmptyState icon={Feather} title="A primeira página está à sua espera">Um café que surpreendeu. Um preparo que deu certo.<br />Em breve, seus momentos ganharão um lugar nesta linha do tempo.</EmptyState><p className="handwritten-note">As melhores histórias começam com curiosidade.</p></Card></section>
  </>;
}
