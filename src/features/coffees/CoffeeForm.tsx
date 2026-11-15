import { useEffect, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { Button, Card, Notice, PageHeader } from '../../components/ui';
import { Field, FormError, TextArea, formNumber, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { newEntity, normalizeText, recordName, type Coffee } from '../../domain/collection';
import { preparePhoto } from '../../data/photos';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { RecordPicker } from './RelatedRecords';

export function CoffeeForm({ existing }: { existing?: Coffee }) {
  const { data, saveCoffee } = useCollection();
  const [name, setName] = useState(existing?.name ?? '');
  const [roasterId, setRoaster] = useState(existing?.roasterId);
  const [producerId, setProducer] = useState(existing?.producerId);
  const [propertyId, setProperty] = useState(existing?.propertyId);
  const [originId, setOrigin] = useState(existing?.originId);
  const [photo, setPhoto] = useState<Blob | null>();
  const [preview, setPreview] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const action = useFormAction();
  useEffect(() => { if (!photo) { setPreview(undefined); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  const duplicates = data.coffees.filter(c => c.id !== existing?.id && normalizeText(c.name) === normalizeText(name) && (!roasterId || !c.roasterId || c.roasterId === roasterId));
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setPhotoBusy(true); setPhotoError(undefined);
    try { setPhoto(await preparePhoto(file)); }
    catch (reason) { setPhotoError(reason instanceof Error ? reason.message : 'Não foi possível ler a fotografia.'); }
    finally { setPhotoBusy(false); event.target.value = ''; }
  }
  return <>
    <a className="text-link" href={existing ? `#/cafes/${existing.id}` : '#/cafes'}><ArrowLeft size={17} />{existing ? 'Voltar à ficha' : 'Voltar à coleção'}</a>
    <PageHeader eyebrow="UM NOVO CAPÍTULO NA ESTANTE" title={existing ? 'Editar café' : 'Adicionar café'} description="Comece pelo nome. Os detalhes podem chegar com o tempo." />
    <Card className="form-card"><form className="journal-form" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void action.run(async () => {
        const coffee: Coffee = { ...(existing ?? { ...newEntity(), tried: false, favorite: false }), name, roasterId, producerId, propertyId, originId, description: formText(form, 'description'), altitude: formNumber(form, 'altitude'), species: formText(form, 'species'), variety: formText(form, 'variety'), process: formText(form, 'process'), roast: formText(form, 'roast'), commercialNotes: formText(form, 'commercialNotes'), additional: formText(form, 'additional') };
        await saveCoffee(coffee, photo); window.location.hash = `/cafes/${coffee.id}`;
      });
    }}><FormError error={action.error ?? photoError} /><Field label="Nome do café" name="name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} autoFocus />{duplicates.length > 0 && <Notice title="Este nome já apareceu na sua coleção">Você pode continuar o cadastro. Talvez queira consultar {duplicates.map((c, i) => <span key={c.id}>{i > 0 && ', '}<a className="inline-link" href={`#/cafes/${c.id}`}>{c.name}{recordName(data, c.roasterId) && ` — ${recordName(data, c.roasterId)}`}</a></span>)}.</Notice>}<RecordPicker kind="roaster" value={roasterId} onChange={setRoaster} />
      <div className="photo-editor"><div className="photo-preview">{preview ? <img src={preview} alt="Prévia da fotografia escolhida" /> : <CoffeePhoto id={photo === null ? undefined : existing?.photoId} name={name || 'seu café'} />}</div><div><label className="button button--secondary photo-upload"><ImagePlus size={18} />{photoBusy ? 'Preparando imagem…' : 'Escolher fotografia'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy || action.busy} onChange={event => void choosePhoto(event)} /></label><p className="field-hint">Opcional. JPG, PNG ou WebP, até 15 MB. A imagem será otimizada e salva neste dispositivo.</p>{(photo || (existing?.photoId && photo !== null)) && <Button type="button" variant="secondary" onClick={() => setPhoto(null)}>Remover fotografia</Button>}</div></div>
      <TextArea label="Descrição ou observação" name="description" defaultValue={existing?.description} />
      <details className="form-section"><summary>Origem e produção <small>Quem produz e de onde vem</small></summary><RecordPicker kind="producer" value={producerId} onChange={setProducer} /><RecordPicker kind="property" value={propertyId} onChange={setProperty} /><RecordPicker kind="origin" value={originId} onChange={setOrigin} /><p className="field-hint">País, estado, município e região ficam no registro de origem. Você pode selecionar ou criar um acima.</p><Field label="Altitude (metros)" name="altitude" inputMode="decimal" defaultValue={existing?.altitude} /></details>
      <details className="form-section"><summary>Características <small>Informações da embalagem</small></summary><div className="form-grid"><Field label="Espécie" name="species" placeholder="Ex.: arábica, canéfora" defaultValue={existing?.species} /><Field label="Variedade ou cultivar" name="variety" defaultValue={existing?.variety} /><Field label="Processo de pós-colheita" name="process" defaultValue={existing?.process} /><Field label="Tipo ou nível de torra" name="roast" defaultValue={existing?.roast} /></div><TextArea label="Notas descritas pelo produtor ou torrefação" name="commercialNotes" defaultValue={existing?.commercialNotes} /><p className="field-hint">São descrições comerciais ou de origem, não uma avaliação sensorial pessoal.</p><TextArea label="Informações adicionais" name="additional" defaultValue={existing?.additional} /></details>
      <div className="form-actions"><a className="button button--secondary" href={existing ? `#/cafes/${existing.id}` : '#/cafes'}>Cancelar</a><Button disabled={action.busy || photoBusy}>{action.busy ? 'Salvando…' : 'Salvar café'}</Button></div>
    </form></Card>
  </>;
}
