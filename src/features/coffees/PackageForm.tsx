import { useCollection } from '../../data/CollectionContext';
import { newEntity, type CoffeePackage } from '../../domain/collection';
import { Button } from '../../components/ui';
import { Field, FormError, TextArea, formNumber, formText, useFormAction } from '../../components/forms';

export function PackageForm({ coffeeId, existing, correction = false, onClose }: { coffeeId: string; existing?: CoffeePackage; correction?: boolean; onClose: () => void }) {
  const { mutate } = useCollection();
  const { busy, error, run } = useFormAction();
  return <form className="journal-form" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void run(async () => {
      const initialWeight = formNumber(form, 'initialWeight') ?? 0;
      const value: CoffeePackage = { ...(existing ?? newEntity()), coffeeId, initialWeight, remainingWeight: formNumber(form, 'remainingWeight') ?? existing?.remainingWeight ?? initialWeight, description: formText(form, 'description'), purchasedOn: formText(form, 'purchasedOn'), roastedOn: formText(form, 'roastedOn'), openedOn: formText(form, 'openedOn'), lot: formText(form, 'lot'), price: formNumber(form, 'price'), purchasedAt: formText(form, 'purchasedAt'), notes: formText(form, 'notes'), adjustments: existing?.adjustments ?? [] };
      await mutate({ type: 'package', value, reason: formText(form, 'reason') }); onClose();
    });
  }}><FormError error={error} /><p className="field-hint">O estoque muda somente quando você salva uma alteração. Pacotes esgotados continuam no histórico.</p><div className="form-grid"><Field label="Peso inicial (g)" name="initialWeight" inputMode="decimal" required defaultValue={existing?.initialWeight} autoFocus /><Field label="Quantidade restante (g)" name="remainingWeight" inputMode="decimal" required={!!existing} defaultValue={existing?.remainingWeight} hint={existing ? 'Entre zero e o peso inicial. Para aumentar o limite, altere explicitamente o peso inicial.' : 'Em branco, começa com o peso inicial. Se já consumiu parte, informe o que restou.'} /></div>{existing && <Field label="Motivo da correção (opcional)" name="reason" />}<details className="form-section" open={!correction}><summary>Informações do pacote</summary><Field label="Identificação ou descrição" name="description" defaultValue={existing?.description} /><div className="form-grid"><Field label="Data da compra" name="purchasedOn" type="date" defaultValue={existing?.purchasedOn} /><Field label="Data da torra" name="roastedOn" type="date" defaultValue={existing?.roastedOn} /><Field label="Data de abertura" name="openedOn" type="date" defaultValue={existing?.openedOn} /><Field label="Lote" name="lot" defaultValue={existing?.lot} /><Field label="Preço pago (R$)" name="price" inputMode="decimal" defaultValue={existing?.price} /><Field label="Local da compra" name="purchasedAt" defaultValue={existing?.purchasedAt} /></div><TextArea label="Observações do pacote" name="notes" defaultValue={existing?.notes} /></details><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy}>{busy ? 'Salvando…' : existing ? 'Salvar pacote' : 'Adicionar pacote'}</Button></div></form>;
}
