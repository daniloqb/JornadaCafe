import { useEffect, useState } from 'react';
import type { SharedLibrary } from '../../transfer/library';
import type { StoredPhoto } from '../../transfer/core';

export function TransferPhotos({ photos, library }: { photos: StoredPhoto[]; library?: SharedLibrary }) {
  const [urls, setUrls] = useState<{ id: string; url: string }[]>([]);
  useEffect(() => {
    const next = photos.map(p => ({ id: p.id, url: URL.createObjectURL(p.blob) }));
    setUrls(next);
    return () => next.forEach(p => URL.revokeObjectURL(p.url));
  }, [photos]);
  return <div className="library-image-previews">{urls.map((p, i) => <figure key={p.id}><img src={p.url} alt={`Fotografia incluída ${i + 1}`} /><figcaption>{library?.recipes.filter(r => r.image === p.id).map(r => r.name).filter((name, i, all) => all.indexOf(name) === i).join(' · ') || `Fotografia ${i + 1}`}</figcaption></figure>)}</div>;
}

const fields: Record<string, string> = { description: 'Descrição', notes: 'Observações', creator: 'Criador', principle: 'Princípio', guidance: 'Orientações', versionNote: 'Nota da versão', grind: 'Moagem', grinder: 'Moedor', filter: 'Filtro', title: 'Publicação', author: 'Apresentado por', url: 'Link da referência', name: 'Etapa', condition: 'Condição' };
function TextFields({ value, names }: { value: object; names: string[] }) {
  return <>{names.map(key => { const text = (value as Record<string, unknown>)[key]; return typeof text === 'string' && text ? <p className="preserve-lines" key={key}><strong>{fields[key]}:</strong> {text}</p> : null; })}</>;
}
export function LibraryTextReview({ library }: { library: SharedLibrary }) {
  return <details><summary>Revisar todos os textos que serão compartilhados</summary><p className="field-hint">Confira também as instruções e os créditos. Textos livres podem conter informações pessoais que você digitou.</p>{[...library.methods, ...library.techniques, ...library.recipes].map(item => <section className="library-text-review" key={item.id}><h4>{item.name}{'version' in item && ` · versão ${item.version}`}</h4><TextFields value={item} names={['description', 'creator', 'principle', 'guidance', 'versionNote', 'grind', 'grinder', 'filter', 'notes']} />{'sources' in item && item.sources.map(s => <TextFields key={s.id} value={s} names={['title', 'author', 'url', 'notes']} />)}{'source' in item && item.source && <TextFields value={item.source} names={['title', 'author', 'url', 'notes']} />}{'steps' in item && item.steps.map(s => <TextFields key={s.id} value={s} names={['name', 'condition', 'notes']} />)}</section>)}</details>;
}
