import { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import { useCollection } from '../data/CollectionContext';

export function CoffeePhoto({ id, name, subject = 'Embalagem de' }: { id?: string; name: string; subject?: string }) {
  const { storage } = useCollection();
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let loaded: string | undefined;
    setUrl(undefined); setFailed(false);
    if (id && storage) void storage.photoUrl(id).then(value => {
      loaded = value;
      if (!cancelled) setUrl(value);
      else if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (loaded?.startsWith('blob:')) URL.revokeObjectURL(loaded); };
  }, [id, storage]);
  return <div className="coffee-photo">{url && !failed ? <img src={url} alt={`${subject} ${name}`} loading="lazy" onError={() => setFailed(true)} /> : <><Coffee size={38} strokeWidth={1.1} aria-hidden="true" /><span>{id ? 'Fotografia indisponível' : 'Uma história em cada grão'}</span></>}</div>;
}
