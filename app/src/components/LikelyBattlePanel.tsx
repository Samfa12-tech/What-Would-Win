import { useState } from 'react'
import {
  assertValidBattleStoryboard,
  buildBattleStoryboard,
  RECONSTRUCTION_NOTICE,
  type BattleEvidenceRecord,
  type BattleReconstructionInput,
  type BattleStoryboardPhase,
  type NarrativeSentenceFragment,
} from '../storyboard'
import { EvidenceTooltip } from './EvidenceTooltip'
import './reconstruction.css'
import './battle-story.css'

interface LikelyBattlePanelProps {
  input: BattleReconstructionInput
  onAnotherReconstruction: () => void
}

type NarrativeMode = 'story' | 'analyst'

function sideLabel(side: BattleStoryboardPhase['advantage']): string {
  if (side === 'solo') return 'Solo-side advantage'
  if (side === 'group') return 'Group-side advantage'
  if (side === 'contested') return 'Contested phase'
  return 'Neutral phase'
}

function titleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function StoryChapter({ phase, evidenceById }: {
  phase: BattleStoryboardPhase
  evidenceById: ReadonlyMap<string, BattleEvidenceRecord>
}) {
  const renderFragment = (fragment: NarrativeSentenceFragment, key: string) => {
    const evidence = fragment.evidenceId && evidenceById.get(fragment.evidenceId)
    if (!evidence) return fragment.text
    return <span key={key}>{fragment.text}<EvidenceTooltip label={evidence.plainText} technicalDetail={evidence.technicalText}>
      <span aria-hidden="true">†</span><span className="visually-hidden">Evidence: {evidence.label}</span>
    </EvidenceTooltip></span>
  }

  return (
    <section className="story-chapter" aria-labelledby={`story-phase-${phase.id}`}>
      <header>
        <div>
          <h4 id={`story-phase-${phase.id}`}>{phase.storyBeats[0]?.title ?? titleCase(phase.id)}</h4>
        </div>
        <span className="story-advantage">{sideLabel(phase.advantage)}</span>
      </header>
      <div className="story-beats">
        {phase.storyBeats.map((beat) => (
          <div key={beat.id} className={`story-beat prominence-${beat.prominence}`} data-beat-id={beat.id}>
            {beat.prominence !== 'supporting' && <h5>{beat.title}</h5>}
            {beat.sentences.map((sentence) => (
              <p key={sentence.id}>
                {sentence.fragments.map((fragment, fragmentIndex) => renderFragment(fragment, `${sentence.id}-${fragmentIndex}`))}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function AnalystPhase({ phase }: { phase: BattleStoryboardPhase }) {
  return (
    <li className="storyboard-phase">
      <div className="battle-phase-heading">
        <h4>{titleCase(phase.id)}</h4>
        <span>{sideLabel(phase.advantage)}</span>
      </div>
      <p>{phase.narration}</p>
      <p className="technical-id">Modelled interval {phase.startSeconds.toLocaleString()}–{(phase.startSeconds + phase.durationSeconds).toLocaleString()} seconds; {phase.storyBeats.length} validated beats; factor IDs {phase.supportingFactorIds.join(', ') || 'scenario conditions only'}.</p>
      {phase.events.length > 0 && (
        <details>
          <summary>Event ledger</summary>
          <ul>
            {phase.events.map((event) => (
              <li key={event.id}>
                {event.caption}
                <span className="technical-id">
                  {event.id}; {event.abilityId ? `ability ${event.abilityId}; ` : ''}
                  factors {event.factorIds.join(', ') || 'scenario condition'}; outcome {event.outcome}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

function QuantityDisclosure({ label }: { label: string }) {
  return <div className="quantity-disclosure" aria-label="Quantity representation disclosure"><strong>Quantity representation</strong><p>{label}</p></div>
}

export function LikelyBattlePanel({ input, onAnotherReconstruction }: LikelyBattlePanelProps) {
  const [mode, setMode] = useState<NarrativeMode>('story')
  const storyboard = assertValidBattleStoryboard(buildBattleStoryboard(input), input)
  const evidenceById = new Map(storyboard.evidence.map((evidence) => [evidence.id, evidence]))

  return (
    <div className="reconstruction-panel likely-battle-panel" id="likely-battle" data-testid="likely-battle-panel">
      <div className="reconstruction-heading">
        <div>
          <p className="eyebrow">VALIDATED PRESENTATION LAYER</p>
          <h3>Likely battle</h3>
        </div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>

      <div className="narrative-toolbar">
        <div className="narrative-mode-switch" aria-label="Likely battle account mode">
          <button type="button" aria-pressed={mode === 'story'} onClick={() => setMode('story')}>Story</button>
          <button type="button" aria-pressed={mode === 'analyst'} onClick={() => setMode('analyst')}>Analyst</button>
        </div>
        <p>Story seed <strong>{storyboard.storySeed}</strong> changes presentation only.</p>
      </div>

      {mode === 'story' ? (
        <div data-testid="story-account">
          <p className="section-intro story-intro">A deterministic cinematic chronicle assembled only from validated events and evidence. Evidence markers reveal the modelled basis.</p>
          <div className="brief-account" aria-label="Three-part likely battle account">
            {storyboard.briefAccount.map((part) => (
              <article key={part.id}>
                <h4>{part.title}</h4>
                <p>{part.text}</p>
              </article>
            ))}
          </div>

          <QuantityDisclosure label={storyboard.representedQuantity.abstractionLabel} />

          <article className="epic-account" aria-label="Seven-phase epic battle account">
            {storyboard.phases.map((phase) => <StoryChapter key={phase.id} phase={phase} evidenceById={evidenceById} />)}
          </article>
        </div>
      ) : (
        <div data-testid="analyst-account">
          <p className="section-intro">Exact source IDs, resolved intervals, ability outcomes and evidence remain available here without relying on a tooltip.</p>
          <QuantityDisclosure label={storyboard.representedQuantity.abstractionLabel} />
          <ol className="storyboard-timeline" aria-label="Seven-phase technical account">
            {storyboard.phases.map((phase) => <AnalystPhase key={phase.id} phase={phase} />)}
          </ol>
          <details>
            <summary>Evidence annotations</summary>
            <ul className="analyst-evidence-list">
              {storyboard.evidence.map((evidence) => (
                <li key={evidence.id}><strong>{evidence.label}</strong><span>{evidence.plainText}</span><code>{evidence.technicalText}</code></li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <aside className="alternate-outcome-note" aria-labelledby="alternate-outcome-heading">
        <h4 id="alternate-outcome-heading">Alternate path</h4>
        <p>{storyboard.alternateOutcomeNote}</p>
      </aside>
    </div>
  )
}
