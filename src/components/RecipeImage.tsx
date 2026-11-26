import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { useCollection } from '../data/CollectionContext';

export function RecipeImage({ id, name, large = false, src }: { id?: string; name: string; large?: boolean; src?: string }) {
  const { storage } = useCollection();
  const [loaded, setLoaded] = useState<{ id: string; url: string }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false, url: string | undefined;
    setFailed(false);
    if (id && storage) void storage.photoUrl(id).then(value => {
      url = value;
      if (!cancelled && value) setLoaded({ id, url: value });
      else if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [id, storage, src]);
  const source = src ?? (id && loaded?.id === id ? loaded.url : undefined);
  return <span className={`recipe-image${large ? ' recipe-image--large' : ''}`}>{source && !failed ? <img src={source} alt={`Receita ${name}`} loading="lazy" onError={() => setFailed(true)} /> : <Filter size={30} strokeWidth={1.5} aria-label={id || src ? 'Fotografia indisponível' : 'Receita sem fotografia'} role="img" />}</span>;
}
