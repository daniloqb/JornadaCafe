import { useState } from 'react';
import { ActionLink, Button, Card, PageHeader } from '../../components/ui';
import { FormError, useFormAction } from '../../components/forms';
import { useCollection } from '../../data/CollectionContext';
import { grams } from '../../domain/collection';
import { ratio } from '../../domain/brewing';
import { catalogVersion, pourOverGuide, pourOverSources, referenceCatalog, referenceItems, type ReferenceKind, type ReferenceMethod, type ReferenceTechnique, type ReferenceRecipe } from '../../reference/catalog';
import { RecipeSteps, ReferenceList } from './LibraryDetails';

export function ReferenceLibrary({ path }: { path: string }) {
  const { data, loading, error, mutate } = useCollection();
  const action = useFormAction();
  const [imported, setImported] = useState(false);
  const [, , section = 'receitas', key] = path.split('/').filter(Boolean);
  const kind: ReferenceKind = section === 'metodos' ? 'metodos' : section === 'tecnicas' ? 'tecnicas' : 'receitas';
  const items = referenceItems(kind);
  const item = items.find(v => v.referenceKey === key);
  const personalItems = kind === 'metodos' ? data.methods : kind === 'tecnicas' ? data.techniques : data.recipes;
  const copies = item ? personalItems.filter(v => v.id === item.id || ('familyId' in v && v.familyId === item.id)) : [];
  const copy = copies.sort((a, b) => ('version' in b ? Number(b.version) : 0) - ('version' in a ? Number(a.version) : 0))[0];
  const originalLink = `#/preparar/referencia/${kind}`;
  if (key && !item) return <><PageHeader eyebrow="BIBLIOTECA DE REFERÊNCIA" title="Referência indisponível" description="Este conteúdo não está presente nesta versão do catálogo." /><ActionLink href={originalLink}>Voltar às referências</ActionLink></>;
  const method = kind === 'metodos' ? item as ReferenceMethod | undefined : undefined;
  const technique = kind === 'tecnicas' ? item as ReferenceTechnique | undefined : undefined;
  const recipe = kind === 'receitas' ? item as ReferenceRecipe | undefined : undefined;
  const relatedMethod = referenceCatalog.methods.find(m => m.id === (technique?.methodId ?? recipe?.methodId));
  const relatedTechnique = referenceCatalog.techniques.find(t => t.id === recipe?.techniqueId);
  return <>
    <a className="text-link" href={item ? originalLink : '#/preparar'}>← {item ? 'Voltar às referências' : 'Minha biblioteca'}</a>
    <PageHeader eyebrow={`BIBLIOTECA DE REFERÊNCIA · CATÁLOGO ${catalogVersion}`} title={item?.name ?? 'Aprender e experimentar'} description={item ? 'Referência original. Adicione uma cópia à sua biblioteca para editar e experimentar.' : 'Métodos são equipamentos; técnicas são estratégias; receitas são aplicações com quantidades e etapas. Explore offline e escolha o que deseja incorporar.'} />
    {!item ? <>
      <nav className="collection-perspectives library-tabs" aria-label="Biblioteca de referência">{[['receitas', 'Receitas'], ['metodos', 'Métodos'], ['tecnicas', 'Técnicas']].map(([value, label]) => <a key={value} href={`#/preparar/referencia/${value}`} aria-current={kind === value ? 'page' : undefined}>{label}</a>)}</nav>
      <p className="field-hint">Nada é adicionado automaticamente à sua biblioteca pessoal. As fontes externas só abrem quando você escolher um link.</p>
      <div className="library-grid">{items.map(ref => <a className="card library-card" key={ref.referenceKey} href={`#/preparar/referencia/${kind}/${ref.referenceKey}`}><span className="eyebrow">REFERÊNCIA · {kind === 'metodos' ? 'MÉTODO' : kind === 'tecnicas' ? 'TÉCNICA' : 'RECEITA'}</span><h2>{ref.name}</h2>{'description' in ref && <p>{ref.description}</p>}{'principle' in ref && kind === 'tecnicas' && <p>{ref.principle}</p>}{'dose' in ref && <div className="recipe-card-params"><span>{grams(ref.dose)} café</span><span>{grams(ref.water)} água</span><strong>{ratio(ref.dose, ref.water)}</strong></div>}</a>)}</div>
      {kind === 'tecnicas' && <Card className="detail-section"><h2>Pour-over: pré-infusão e despejos sucessivos</h2><p>{pourOverGuide}</p><ReferenceList sources={pourOverSources} /></Card>}
      {kind === 'metodos' && <p className="field-hint">Os métodos sem receitas confirmadas oferecem explicações e fontes. Você pode criar suas próprias receitas na biblioteca pessoal.</p>}
    </> : <>
      <Card className="detail-section reference-import"><h2>{copy ? 'Na minha biblioteca' : 'Um ponto de partida para o seu caderno'}</h2><p>{copy ? 'Sua cópia pode ter ajustes próprios. A referência original permanece disponível aqui.' : recipe ? 'Adiciona esta receita, o método e a técnica necessários, reutilizando as cópias já incorporadas. Não altera cafés, estoque nem histórico.' : technique ? 'Adiciona a técnica e seu método de referência, caso ainda não tenham sido incorporados.' : 'Adiciona uma cópia editável deste método à sua biblioteca pessoal.'}</p><FormError error={action.error} />{copy ? <ActionLink href={`#/preparar/${kind}/${copy.id}`}>Abrir cópia pessoal</ActionLink> : <Button disabled={action.busy || loading || !!error} onClick={() => void action.run(async () => { await mutate({ type: 'importReference', kind, key: item.referenceKey }); setImported(true); })}>{action.busy ? 'Adicionando…' : 'Adicionar à minha biblioteca'}</Button>}{imported && <p role="status">Referência adicionada à sua biblioteca.</p>}{!!error && <p className="field-hint">A consulta continua disponível. Para adicionar cópias, tente inicializar o armazenamento novamente pelo aviso do aplicativo.</p>}</Card>
      {relatedMethod && <p>Método: <a className="inline-link" href={`#/preparar/referencia/metodos/${relatedMethod.referenceKey}`}>{relatedMethod.name}</a></p>}
      {relatedTechnique && <p>Técnica: <a className="inline-link" href={`#/preparar/referencia/tecnicas/${relatedTechnique.referenceKey}`}>{relatedTechnique.name}</a></p>}
      {method && <Card className="detail-section"><h2>Como funciona</h2><p>{method.description}</p><p>{method.principle}</p><h3>Características</h3><p>{method.characteristics}</p>{method.notes && <p>{method.notes}</p>}<ReferenceList sources={method.sources} /></Card>}
      {technique && <Card className="detail-section"><h2>Princípio e orientações</h2><p>{technique.creator ? `Criador: ${technique.creator}` : 'Estratégia geral, sem atribuição a um criador único nesta biblioteca.'}</p><p>{technique.principle}</p><p>{technique.guidance}</p>{technique.notes && <p>{technique.notes}</p>}<ReferenceList sources={technique.sources} /></Card>}
      {recipe && <><Card className="recipe-summary"><div><span>Café</span><strong>{grams(recipe.dose)}</strong></div><div><span>Água</span><strong>{grams(recipe.water)}</strong></div><div><span>Proporção</span><strong>{ratio(recipe.dose, recipe.water)}</strong></div></Card><Card className="detail-section"><h2>Parâmetros e experimentação</h2><p>Temperatura: {recipe.temperature ? `${recipe.temperature} °C` : 'não definida'}. Moagem: {recipe.grind ?? 'não definida'}.</p><p>{recipe.notes}</p><p>Água adicionada é a quantidade em gramas de cada despejo; acumulado é o peso previsto na balança desde o início. Ajuste sua cópia pessoal e confira a soma antes de preparar.</p></Card><Card className="detail-section"><h2>Etapas de referência</h2><RecipeSteps steps={recipe.steps} /></Card>{recipe.source && <Card className="detail-section"><h2>Fonte da receita</h2><ReferenceList sources={[recipe.source]} /></Card>}</>}
      {(method || technique) && <Card className="detail-section"><h2>Receitas de referência associadas</h2><div className="library-links">{referenceCatalog.recipes.filter(r => method ? r.methodId === method.id : r.techniqueId === technique?.id).map(r => <a className="text-link" key={r.id} href={`#/preparar/referencia/receitas/${r.referenceKey}`}>{r.name} →</a>)}{!referenceCatalog.recipes.some(r => method ? r.methodId === method.id : r.techniqueId === technique?.id) && <p>Nenhuma receita com parâmetros confirmados neste catálogo. A explicação continua disponível para orientar suas próprias experiências.</p>}</div></Card>}
    </>}
  </>;
}
