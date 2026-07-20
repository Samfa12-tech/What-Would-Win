import { assertValidBattleStoryboard, buildBattleNarrative, buildBattleStoryboard, type BattleReconstructionInput } from '../storyboard'
import './reconstruction.css'

interface LikelyBattlePanelProps {
  input: BattleReconstructionInput
  onAnotherReconstruction: () => void
}

function sideLabel(side: 'solo' | 'group' | 'contested' | 'neutral'): string {
  if (side === 'solo') return 'Solo-side advantage'
  if (side === 'group') return 'Group-side advantage'
  if (side === 'contested') return 'Contested phase'
  return 'Neutral phase'
}

export function LikelyBattlePanel({ input, onAnotherReconstruction }: LikelyBattlePanelProps) {
  const storyboard = assertValidBattleStoryboard(buildBattleStoryboard(input), input)
  const narrative = buildBattleNarrative(storyboard)
  return (
    <div className="reconstruction-panel" id="likely-battle" data-testid="likely-battle-panel">
      <div className="reconstruction-heading">
        <div>
          <p className="eyebrow">VALIDATED PRESENTATION LAYER</p>
          <h3>Likely battle</h3>
        </div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{narrative.notice}</p>
      <p className="section-intro">Story seed {storyboard.storySeed} changes presentation choices only. The winner, probability, deterministic margin, factor ledger, ability eligibility, counters and closing state remain fixed.</p>

      <div className="brief-account" aria-label="Three-part likely battle account">
        {narrative.brief.map((part) => (
          <article key={part.id}>
            <h4>{part.title}</h4>
            <p>{part.text}</p>
          </article>
        ))}
      </div>

      <div className="quantity-disclosure" aria-label="Quantity representation disclosure">
        <strong>Quantity representation</strong>
        <p>{storyboard.representedQuantity.abstractionLabel}</p>
      </div>

      <ol className="storyboard-timeline" aria-label="Seven-phase battle account">
        {narrative.phases.map((phase) => (
          <li key={phase.id} className={`storyboard-phase advantage-${phase.advantage}`}>
            <div className="battle-phase-heading">
              <h4>{phase.id.replace('-', ' ')}</h4>
              <span>{sideLabel(phase.advantage)}</span>
            </div>
            <p>{phase.narration}</p>
            {(phase.supportingFactorIds.length > 0 || phase.events.length > 0) && (
              <details>
                <summary>Evidence annotations</summary>
                {phase.supportingFactorIds.length > 0 && <p><strong>Factors:</strong> {phase.supportingFactorIds.join(', ')}</p>}
                <ul>
                  {phase.events.map((event) => (
                    <li key={event.id}>
                      {event.caption} <span className="technical-id">{event.abilityId ? `ability ${event.abilityId}; ` : ''}factors {event.factorIds.join(', ') || 'scenario condition'}; outcome {event.outcome}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ol>

      <aside className="alternate-outcome-note" aria-labelledby="alternate-outcome-heading">
        <h4 id="alternate-outcome-heading">Alternate path</h4>
        <p>{narrative.alternateOutcomeNote}</p>
      </aside>
    </div>
  )
}
