import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { BackLink, Button, Card, Notice, PageHeader } from '../../components/ui';
import { Field, FormError, TextArea, formNumber, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { newEntity, normalizeText, recordName, type Coffee } from '../../domain/collection';
import { preparePhoto } from '../../data/photos';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { CoffeeOptionPicker } from './CoffeeOptionPicker';
import { StarRating } from '../../components/StarRating';
import { legacySpeciesId, ratingLabels, type CoffeeRatings, type RatingKind } from '../../domain/coffee-profile';
import { grams, inventory, originDescription } from '../../domain/collection';
import { RecordPicker } from './RelatedRecords';

export function CoffeeForm({ existing }: { existing?: Coffee }) {
  const { data, saveCoffee } = useCollection();
  const [name, setName] = useState(existing?.name ?? '');
  const [roasterId, setRoaster] = useState(existing?.roasterId);
  const [producerId, setProducer] = useState(existing?.producerId);
  const [propertyId, setProperty] = useState(existing?.propertyId);
  const [originId, setOrigin] = useState(existing?.originId);
  const [legacySpecies, setLegacySpecies] = useState(existing?.species);
  const [speciesId, setSpecies] = useState(legacySpeciesId(data, existing));
  const [tags, setTags] = useState(existing?.sensoryTagIds ?? []);
  const [ratings, setRatings] = useState<CoffeeRatings>(existing?.ratings ?? {});
  const producer = data.records.find(r => r.id === producerId);
  const lastProducer = useRef<string | undefined>(undefined);
  function changeProducer(id?: string) { setProducer(id); }
  useEffect(() => {
    if (existing || lastProducer.current === producerId) return;
    const selected = data.records.find(r => r.id === producerId);
    if (producerId && !selected) return;
    setProperty(selected?.propertyId); setOrigin(selected?.originId); lastProducer.current = producerId;
  }, [producerId, data.records, existing]);
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
    <BackLink href={existing ? `#/cafes/${existing.id}` : '#/cafes'}><ArrowLeft size={17} />{existing ? 'Voltar à ficha' : 'Voltar à coleção'}</BackLink>
    <PageHeader eyebrow="UM NOVO CAPÍTULO NA ESTANTE" title={existing ? 'Editar café' : 'Adicionar café'} description="Comece pelo nome. Os detalhes podem chegar com o tempo." />
    <Card className="form-card"><form className="journal-form" onSubmit={event => {
      event.preventDefault(); if (photoBusy) return; const form = new FormData(event.currentTarget);
      void action.run(async () => {
        const coffee: Coffee = { ...(existing ?? { ...newEntity(), tried: false, favorite: false }), name, roasterId, producerId, propertyId, originId, description: formText(form, 'description'), altitude: formNumber(form, 'altitude'), species: legacySpecies, speciesId, sensoryTagIds: tags, ratings, variety: formText(form, 'variety'), process: formText(form, 'process'), roast: formText(form, 'roast'), commercialNotes: formText(form, 'commercialNotes'), additional: formText(form, 'additional') };
        await saveCoffee(coffee, photo); window.location.hash = `/cafes/${coffee.id}`;
      });
    }}><FormError error={action.error ?? photoError} /><Field label="Nome do café" name="name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} autoFocus />{duplicates.length > 0 && <Notice title="Este nome já apareceu na sua coleção">Você pode continuar o cadastro. Talvez queira consultar {duplicates.map((c, i) => <span key={c.id}>{i > 0 && ', '}<a className="inline-link" href={`#/cafes/${c.id}`}>{c.name}{recordName(data, c.roasterId) && ` — ${recordName(data, c.roasterId)}`}</a></span>)}.</Notice>}
      <div className="photo-editor"><div className="photo-preview">{preview ? <img src={preview} alt="Prévia da fotografia escolhida" /> : <CoffeePhoto id={photo === null ? undefined : existing?.photoId} name={name || 'seu café'} />}</div><div><label className="button button--secondary photo-upload"><ImagePlus size={18} />{photoBusy ? 'Preparando imagem…' : 'Escolher fotografia'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy || action.busy} onChange={event => void choosePhoto(event)} /></label><p className="field-hint">Opcional. JPG, PNG ou WebP, até 15 MB. A imagem será otimizada e salva neste dispositivo.</p>{(photo || (existing?.photoId && photo !== null)) && <Button type="button" variant="secondary" onClick={() => setPhoto(null)}>Remover fotografia</Button>}</div></div>
      <Field label="Torra" name="roast" placeholder="Descrição da embalagem, se houver" defaultValue={existing?.roast} /><p className="field-hint">Informação descritiva; a escala de torra fica em Características.</p>
      <TextArea label="Descrição / Observações" name="description" defaultValue={existing?.description} />
      <details className="form-section"><summary>Características <small>Espécie, notas e percepções opcionais</small></summary>
        <CoffeeOptionPicker kind="species" value={speciesId ? [speciesId] : []} onChange={ids => { setSpecies(ids[0]); if (!ids.length) setLegacySpecies(undefined); }} />
        {legacySpecies && <div><p className="field-hint preserve-lines">Espécie registrada anteriormente: {legacySpecies}. O texto original será preservado.</p><Button type="button" variant="secondary" onClick={() => setLegacySpecies(undefined)}>Limpar texto anterior da espécie</Button></div>}
        <div className="form-grid"><Field label="Variedade / Cultivar" name="variety" defaultValue={existing?.variety} /><Field label="Processo de pós-colheita" name="process" defaultValue={existing?.process} /></div>
        <p className="field-hint">Escalas percebidas ou informadas por você. Zero é um valor; sem avaliação significa não informado. Intensidade não é sinônimo obrigatório de amargor.</p>
        <div className="ratings-grid">{(['roast', 'acidity', 'sweetness', 'intensity'] as RatingKind[]).map(key => <StarRating key={key} label={ratingLabels[key]} value={ratings[key]} onChange={value => setRatings(current => ({ ...current, [key]: value }))} />)}</div>
        <CoffeeOptionPicker kind="sensoryTag" value={tags} onChange={setTags} />
        {existing?.commercialNotes && <TextArea label="Notas anteriores — texto preservado" name="commercialNotes" defaultValue={existing.commercialNotes} />}
        <StarRating label="Avaliação geral do café" value={ratings.overall} onChange={value => setRatings(current => ({ ...current, overall: value }))} /><p className="field-hint">Sua opinião sobre o café como produto. Independente das características e das avaliações de preparações futuras.</p>
      </details>
      <RecordPicker kind="producer" value={producerId} onChange={changeProducer} />
      {producer && <p className="field-hint">Produtor: {producer.name}. Local vinculado a este café: {[recordName(data, propertyId), originDescription(data, originId)].filter(Boolean).join(' · ') || 'não informado'}. Alterar o cadastro do produtor não substitui os vínculos já salvos neste café.</p>}
      <details className="form-section"><summary>Local específico deste café <small>Use quando a propriedade ou a origem diferir do cadastro do produtor</small></summary><p className="field-hint">Os vínculos anteriores deste café são preservados individualmente. Não alteram a origem de outros cafés do mesmo produtor.</p><RecordPicker kind="property" label="Propriedade deste café" value={propertyId} onChange={setProperty} /><RecordPicker kind="origin" label="Origem deste café" value={originId} onChange={setOrigin} /><Field label="Altitude (metros)" name="altitude" inputMode="decimal" defaultValue={existing?.altitude} /></details>
      <details className="form-section"><summary>Informações complementares <small>Empresa torrefadora e anotações adicionais</small></summary><RecordPicker kind="roaster" value={roasterId} onChange={setRoaster} /><p className="field-hint">A empresa torrefadora é um registro separado. Seu nome não é convertido em nível ou avaliação de torra.</p><TextArea label="Informações adicionais" name="additional" defaultValue={existing?.additional} /></details>
      <p className="field-hint">{existing ? `${grams(inventory(data, existing.id).total)} em estoque. ` : ''}Após salvar, você pode adicionar e gerenciar pacotes na ficha do café.</p>
      <div className="form-actions"><a className="button button--secondary" href={existing ? `#/cafes/${existing.id}` : '#/cafes'}>Cancelar</a><Button disabled={action.busy || photoBusy}>{action.busy ? 'Salvando…' : 'Salvar café'}</Button></div>
    </form></Card>
  </>;
}
