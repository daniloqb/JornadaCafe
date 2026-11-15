import { referenceItems, type ReferenceKind } from '../../reference/catalog';

export function PersonalReferenceNotice({ kind, referenceKey }: { kind: ReferenceKind; referenceKey?: string }) {
  if (!referenceKey || !referenceItems(kind).some(v => v.referenceKey === referenceKey)) return null;
  return <p className="reference-origin">Cópia pessoal editável · <a className="inline-link" href={`#/preparar/referencia/${kind}/${referenceKey}`}>Consultar referência original</a></p>;
}
