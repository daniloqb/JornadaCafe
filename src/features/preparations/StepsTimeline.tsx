import { ChevronDown } from 'lucide-react';
import { advanceLabels, secondsLabel, stepLabels, type RecipeStep } from '../../domain/brewing';
import { grams } from '../../domain/collection';

export function StepsTimeline({ steps, currentIndex, highlightFirst = false }: { steps: RecipeStep[]; currentIndex?: number; highlightFirst?: boolean }) {
  return <ol className="brew-timeline" aria-label="Sequência de etapas da receita">
    {steps.map((step, index) => {
      const current = index === currentIndex;
      const end = step.startSeconds !== undefined && step.durationSeconds !== undefined ? step.startSeconds + step.durationSeconds : undefined;
      return <li key={step.id} className={current ? 'is-current' : highlightFirst && index === 0 ? 'is-preview' : ''} aria-current={current ? 'step' : undefined}>
        <span className="brew-timeline-number" aria-hidden="true">{index + 1}</span>
        <div className="brew-timeline-body">
          <div className="brew-timeline-heading"><h3>{step.name || stepLabels[step.type]}</h3>{current && <span className="sr-only">Etapa atual</span>}</div>
          <p className="brew-timeline-water">{step.startSeconds !== undefined ? `${secondsLabel(step.startSeconds)}${end !== undefined ? ` – ${secondsLabel(end)}` : ''} · ` : step.durationSeconds !== undefined ? `${secondsLabel(step.durationSeconds)} de referência · ` : ''}{step.type === 'pour' ? `adicionar ${grams(step.water)}` : stepLabels[step.type]}</p>
          <details className="brew-timeline-detail"><summary><span className="sr-only">Detalhes da etapa {index + 1}</span><ChevronDown size={16} aria-hidden="true" /></summary><p>Meta acumulada: <strong>{grams(step.cumulativeWater)}</strong></p><p>{advanceLabels[step.advance]}{step.advance === 'observable' && ` · ${step.condition || 'Condição ainda não informada'}`}</p>{step.notes && <p className="preserve-lines">{step.notes}</p>}</details>
        </div>
      </li>;
    })}
  </ol>;
}
