import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Bean, FileText, Flame, ImagePlus, Settings2 } from 'lucide-react';
import { Button, Card, Notice } from '../../components/ui';
import { Field, FormError, TextArea, formNumber, formText, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { newEntity, normalizeText, recordName, type Coffee } from '../../domain/collection';
import { preparePhoto } from '../../data/photos';
import { CoffeePhoto } from '../../components/CoffeePhoto';
import { CoffeeOptionPicker } from './CoffeeOptionPicker';
import { StarRating } from '../../components/StarRating';
import { legacySpeciesId, ratingLabels, type CoffeeRatings, type RatingKind } from '../../domain/coffee-profile';
import { grams, inventory, originDescription } from '../../domain/collection';
import { CollectionHeading } from './CollectionHeading';
import { revealInvalidField } from '../../components/form-validation';
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
  return <div className="coffee-area collection-form-page">
    <CollectionHeading label={existing ? 'Editar Café' : 'Cadastrar Café'} title={existing ? 'Editar Café' : 'Novo Café'} description={existing ? 'Cuide dos detalhes deste café e preserve sua história.' : 'Registre um café que você vai experimentar ou já conhece.'} image="coffee-form-hero" back={existing ? `#/cafes/${existing.id}` : '#/cafes/colecao'} />
    <form className="journal-form collection-editorial-form" onInvalidCapture={revealInvalidField} onSubmit={event => {
      event.preventDefault(); if (photoBusy) return; const form = new FormData(event.currentTarget);
      void action.run(async () => {
        const coffee: Coffee = { ...(existing ?? { ...newEntity(), tried: false, favorite: false }), name, roasterId, producerId, propertyId, originId, description: formText(form, 'description'), altitude: formNumber(form, 'altitude'), species: legacySpecies, speciesId, sensoryTagIds: tags, ratings, variety: formText(form, 'variety'), process: formText(form, 'process'), roast: formText(form, 'roast'), commercialNotes: formText(form, 'commercialNotes'), additional: formText(form, 'additional') };
        await saveCoffee(coffee, photo); window.location.hash = `/cafes/${coffee.id}`;
      });
    }}><FormError error={action.error ?? photoError} /><Card className="collection-form-panel collection-main-information"><div className="collection-form-identity"><div className="collection-photo-field">      <div className="photo-editor"><div className="photo-preview">{preview ? <img src={preview} alt="Prévia da fotografia escolhida" /> : <CoffeePhoto id={photo === null ? undefined : existing?.photoId} name={name || 'seu café'} />}</div><div><label className="button button--secondary photo-upload"><ImagePlus size={26} aria-hidden="true" />{photoBusy ? 'Preparando imagem…' : 'Adicionar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy || action.busy} onChange={event => void choosePhoto(event)} /></label><p className="field-hint">Opcional. JPG, PNG ou WebP, até 15 MB. A imagem será otimizada e salva neste dispositivo.</p>{(photo || (existing?.photoId && photo !== null)) && <Button type="button" variant="secondary" onClick={() => setPhoto(null)}>Remover fotografia</Button>}</div></div>
</div><div><h2><Bean size={27} aria-hidden="true" />Informações do café</h2><Field label="Nome do café" name="name" required maxLength={200} placeholder="Nome do seu café" value={name} onChange={event => setName(event.target.value)} />{duplicates.length > 0 && <Notice title="Este nome já apareceu na sua coleção">Você pode continuar o cadastro. Talvez queira consultar {duplicates.map((c, i) => <span key={c.id}>{i > 0 && ', '}<a className="inline-link" href={`#/cafes/${c.id}`}>{c.name}{recordName(data, c.roasterId) && ` — ${recordName(data, c.roasterId)}`}</a></span>)}.</Notice>}
<RecordPicker kind="producer" value={producerId} onChange={changeProducer} /></div></div>{producer && <p className="field-hint">Produtor: {producer.name}. Local deste café: {[recordName(data, propertyId), originDescription(data, originId)].filter(Boolean).join(' · ') || 'não informado'}. Os vínculos salvos deste café são preservados ao editar o produtor.</p>}</Card>
      <div className="collection-form-columns"><Card className="collection-form-panel"><h2><Bean size={26} aria-hidden="true" />Espécie</h2><CoffeeOptionPicker kind="species" value={speciesId ? [speciesId] : []} onChange={ids => { setSpecies(ids[0]); if (!ids.length) setLegacySpecies(undefined); }} />{legacySpecies && <div><p className="field-hint preserve-lines">Espécie registrada anteriormente: {legacySpecies}. O texto original será preservado.</p><Button type="button" variant="secondary" onClick={() => setLegacySpecies(undefined)}>Limpar texto anterior da espécie</Button></div>}</Card><Card className="collection-form-panel"><h2><Settings2 size={26} aria-hidden="true" />Processamento</h2><Field label="Processo de pós-colheita" name="process" placeholder="Como descrito na embalagem" defaultValue={existing?.process} /></Card></div>
      <Card className="collection-form-panel"><h2><Flame size={26} aria-hidden="true" />Torra</h2><Field label="Torra descritiva" name="roast" placeholder="Descrição da embalagem, se houver" defaultValue={existing?.roast} /><p className="field-hint">A descrição é preservada como texto. A avaliação de torra permanece na seção de características.</p></Card>
      <details className="form-section collection-form-panel"><summary><FileText size={26} aria-hidden="true" />Informações adicionais <small>Descrição, variedade, origem, avaliações e outras informações</small></summary>
      <TextArea label="Descrição / Observações" name="description" defaultValue={existing?.description} />
      <details className="form-section"><summary>Características <small>Variedade, notas e percepções opcionais</small></summary><Field label="Variedade / Cultivar" name="variety" defaultValue={existing?.variety} />
        <p className="field-hint">Escalas percebidas ou informadas por você. Zero é um valor; sem avaliação significa não informado. Intensidade não é sinônimo obrigatório de amargor.</p>
        <div className="ratings-grid">{(['roast', 'acidity', 'sweetness', 'intensity'] as RatingKind[]).map(key => <StarRating key={key} label={ratingLabels[key]} value={ratings[key]} onChange={value => setRatings(current => ({ ...current, [key]: value }))} />)}</div>
        <CoffeeOptionPicker kind="sensoryTag" value={tags} onChange={setTags} />
        {existing?.commercialNotes && <TextArea label="Notas anteriores — texto preservado" name="commercialNotes" defaultValue={existing.commercialNotes} />}
        <StarRating label="Avaliação geral do café" value={ratings.overall} onChange={value => setRatings(current => ({ ...current, overall: value }))} /><p className="field-hint">Sua opinião sobre o café como produto. Independente das características e das avaliações de preparações futuras.</p>
      </details>
      <details className="form-section"><summary>Local específico deste café <small>Use quando a propriedade ou a origem diferir do cadastro do produtor</small></summary><p className="field-hint">Os vínculos anteriores deste café são preservados individualmente. Não alteram a origem de outros cafés do mesmo produtor.</p><RecordPicker kind="property" label="Propriedade deste café" value={propertyId} onChange={setProperty} /><RecordPicker kind="origin" label="Origem deste café" value={originId} onChange={setOrigin} /><Field label="Altitude (metros)" name="altitude" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" title="Informe uma altitude igual ou maior que zero." defaultValue={existing?.altitude} /></details>
      <details className="form-section"><summary>Informações complementares <small>Empresa torrefadora e anotações adicionais</small></summary><RecordPicker kind="roaster" value={roasterId} onChange={setRoaster} /><p className="field-hint">A empresa torrefadora é um registro separado. Seu nome não é convertido em nível ou avaliação de torra.</p><TextArea label="Informações adicionais" name="additional" defaultValue={existing?.additional} /></details>
      </details><p className="field-hint">{existing ? `${grams(inventory(data, existing.id).total)} em estoque. ` : ''}Após salvar, você pode adicionar e gerenciar pacotes na ficha do café.</p>
      <div className="form-actions"><a className="button button--secondary" href={existing ? `#/cafes/${existing.id}` : '#/cafes/colecao'}>Cancelar</a><Button disabled={action.busy || photoBusy}>{action.busy ? 'Salvando…' : 'Salvar Café'}</Button></div>
    </form>
  </div>;
}
