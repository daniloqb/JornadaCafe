import { ArrowLeft } from 'lucide-react';
import { BackLink } from '../../components/ui';
import { ExternalReference } from '../../components/ExternalReference';
import privacy from '../../../config/privacy.json';

export function PrivacyPolicy({ back }: { back: string }) {
  const online = privacy.publicUrl as string | null;
  const verified = privacy.publicUrlVerifiedAt as string | null;
  return <section className="privacy-screen">
    <header className="settings-heading"><BackLink href={back}><ArrowLeft size={23} aria-hidden="true" /><span className="sr-only">Voltar às configurações</span></BackLink><h1 tabIndex={-1}>Política de Privacidade</h1></header>
    <p>Esta cópia está incluída no aplicativo e pode ser lida sem conexão.</p>
    {online?.startsWith('https://') && verified && <ExternalReference url={online} className="button button--secondary">Abrir versão online</ExternalReference>}
    <iframe className="privacy-document" title="Política de Privacidade e Tratamento de Dados Pessoais" src={`${import.meta.env.BASE_URL}politica-de-privacidade.html`} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />
  </section>;
}
