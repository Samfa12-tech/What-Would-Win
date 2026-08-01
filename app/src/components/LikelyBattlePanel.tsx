import { useState } from 'react'
import {
  assertValidBattleStoryboard,
  buildBattleStoryboard,
  buildLaymanBattleStory,
  buildSafeReaderBattleNarrative,
  buildStoryEvidenceCopy,
  RECONSTRUCTION_NOTICE,
  type BattleEvidenceRecord,
  type BattleReconstructionInput,
  type BattleStoryboardPhase,
  type NarrativeSentence,
  type NarrativeSentenceFragment,
  type ReaderBattleNarrative,
  type ReaderNarrativeBeat,
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

function EvidenceFragment({ fragment, evidenceById, input }: {
  fragment: NarrativeSentenceFragment
  evidenceById: ReadonlyMap<string, BattleEvidenceRecord>
  input: BattleReconstructionInput
}) {
  const evidence = fragment.evidenceId && evidenceById.get(fragment.evidenceId)
  if (!evidence) return fragment.text
  const copy = buildStoryEvidenceCopy(evidence, input)
  const finalWord = fragment.text.match(/^(.*\s)(\S+)$/s)
  const marker = <EvidenceTooltip label={copy.label} technicalDetail={copy.detail}>
    <span aria-hidden="true">†</span><span className="visually-hidden">Evidence: {copy.label}</span>
  </EvidenceTooltip>
  if (!finalWord) return <span className="evidence-anchor" style={{ whiteSpace: 'nowrap' }}>{fragment.text}{marker}</span>
  return <>{finalWord[1]}<span className="evidence-anchor" style={{ whiteSpace: 'nowrap' }}>{finalWord[2]}{marker}</span></>
}

function NarrativeSentences({ sentences, evidenceById, input }: {
  sentences: NarrativeSentence[]
  evidenceById: ReadonlyMap<string, BattleEvidenceRecord>
  input: BattleReconstructionInput
}) {
  return <>{sentences.map((sentence) => (
    <span key={sentence.id}>
      {sentence.fragments.map((fragment, fragmentIndex) =>
        <EvidenceFragment key={`${sentence.id}-${fragmentIndex}`} fragment={fragment} evidenceById={evidenceById} input={input} />)}{' '}
    </span>
  ))}</>
}

function StoryChapter({ phase, evidenceById, input }: {
  phase: BattleStoryboardPhase
  evidenceById: ReadonlyMap<string, BattleEvidenceRecord>
  input: BattleReconstructionInput
}) {
  const technicalEventIds = new Set(phase.events.filter((event) => event.technicalOnly).map((event) => event.id))
  const visibleBeats = phase.storyBeats.filter((beat) =>
    beat.eventIds.length === 0 || beat.eventIds.some((eventId) => !technicalEventIds.has(eventId)))

  return (
    <section className="story-chapter" aria-labelledby={`story-phase-${phase.id}`}>
      <header>
        <div><h4 id={`story-phase-${phase.id}`}>{visibleBeats[0]?.title ?? titleCase(phase.id)}</h4></div>
        <span className="story-advantage">{sideLabel(phase.advantage)}</span>
      </header>
      <div className="story-beats">
        {visibleBeats.map((beat) => (
          <div key={beat.id} className={`story-beat prominence-${beat.prominence}`} data-beat-id={beat.id}>
            {beat.prominence !== 'supporting' && <h5>{beat.title}</h5>}
            {beat.sentences.map((sentence) => (
              <p key={sentence.id}><NarrativeSentences sentences={[sentence]} evidenceById={evidenceById} input={input} /></p>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export interface ReaderCausalStage {
  id: string
  title: string
  beats: ReaderNarrativeBeat[]
  minorityPath?: ReaderNarrativeBeat
  emphasis?: boolean
}

export function readerCausalStages(narrative: ReaderBattleNarrative): ReaderCausalStage[] {
  return [
    { id: 'matchup', title: 'The matchup', beats: [narrative.plan.premise] },
    { id: 'opening', title: 'Opening and first exchange', beats: [narrative.plan.opening, narrative.plan.firstExchange] },
    { id: 'pressure', title: 'Pressure', beats: [narrative.plan.pressureDevelopment] },
    { id: 'turning-point', title: 'Turning point', beats: [narrative.plan.turningPoint], emphasis: true },
    { id: 'outcome', title: 'Outcome', beats: [narrative.plan.resolution], minorityPath: narrative.plan.minorityPath },
  ]
}

function AnalystPhase({ phase }: { phase: BattleStoryboardPhase }) {
  return (
    <li className="storyboard-phase">
      <div className="battle-phase-heading"><h4>{titleCase(phase.id)}</h4><span>{sideLabel(phase.advantage)}</span></div>
      <p>{phase.narration}</p>
      <p className="technical-id">Modelled interval {phase.startSeconds.toLocaleString()}–{(phase.startSeconds + phase.durationSeconds).toLocaleString()} seconds; {phase.storyBeats.length} validated beats; factor IDs {phase.supportingFactorIds.join(', ') || 'scenario conditions only'}.</p>
      {phase.events.length > 0 && (
        <details>
          <summary>Event ledger</summary>
          <ul>{phase.events.map((event) => (
            <li key={event.id}>{event.caption}<span className="technical-id">{event.id}; {event.abilityId ? `ability ${event.abilityId}; ` : ''}factors {event.factorIds.join(', ') || 'scenario condition'}; outcome {event.outcome}</span></li>
          ))}</ul>
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
  const readerNarrative = buildSafeReaderBattleNarrative(input, storyboard)
  const laymanStory = buildLaymanBattleStory(input, readerNarrative, storyboard)
  const evidenceById = new Map(storyboard.evidence.map((evidence) => [evidence.id, evidence]))

  return (
    <div className="reconstruction-panel likely-battle-panel" id="likely-battle" data-testid="likely-battle-panel">
      <div className="reconstruction-heading">
        <div><p className="eyebrow">VALIDATED PRESENTATION LAYER</p><h3>Likely battle</h3></div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>

      <div className="narrative-toolbar">
        <div className="narrative-mode-switch" role="group" aria-label="Likely battle account mode">
          <button type="button" aria-pressed={mode === 'story'} onClick={() => setMode('story')}>Story</button>
          <button type="button" aria-pressed={mode === 'analyst'} onClick={() => setMode('analyst')}>Analyst</button>
        </div>
        <p>Story seed <strong>{storyboard.storySeed}</strong> changes presentation only.</p>
      </div>

      {mode === 'story' ? (
        <div data-testid="story-account">
          <p className="section-intro story-intro">A short retelling of the likely fight, followed by the clearest reasons for the result. Evidence markers open the supporting record.</p>
          {readerNarrative.fallbackNotice && <p className="section-intro" role="status" data-testid="reader-narrative-fallback">{readerNarrative.fallbackNotice}</p>}
          <article className="reader-account layman-account" aria-label="Readable likely battle account" data-word-count={laymanStory.storyWordCount} data-story-issues={laymanStory.issues.length}>
            <div className="layman-story" aria-label="Three-part likely battle story">
              {laymanStory.stages.map((stage, index) => (
                <section className={`layman-story-stage layman-story-${stage.id}`} key={stage.id}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div><h4>{stage.title}</h4><p><NarrativeSentences sentences={stage.sentences} evidenceById={evidenceById} input={input} /></p></div>
                </section>
              ))}
            </div>

            <section className="layman-reasons" aria-labelledby="layman-reasons-heading">
              <p className="eyebrow">WHY THE WINNER WINS</p>
              <h4 id="layman-reasons-heading">The reasons that matter</h4>
              <ol aria-label="Clear reasons for the result">{laymanStory.reasons.map((reason) => (
                <li key={reason.id}><h5>{reason.title}</h5><p><NarrativeSentences sentences={reason.sentences} evidenceById={evidenceById} input={input} /></p></li>
              ))}</ol>
            </section>

            <aside className="what-could-flip" aria-labelledby="what-could-flip-heading">
              <h5 id="what-could-flip-heading">The other side's best chance</h5>
              <p><NarrativeSentences sentences={laymanStory.alternate.sentences} evidenceById={evidenceById} input={input} /></p>
            </aside>
          </article>

          {readerNarrative.quantity.kind !== 'singleton' && (
            <div className="quantity-disclosure reader-quantity" aria-label="Quantity representation disclosure">
              <strong>{readerNarrative.quantity.disclosureTitle}</strong>
              <p>{readerNarrative.quantity.declaredCountText} {readerNarrative.quantity.simultaneousPressureText} {readerNarrative.quantity.reserveText}</p>
            </div>
          )}

          <details className="detailed-reconstruction">
            <summary>Detailed phase-by-phase reconstruction</summary>
            <p className="section-intro">The validated seven-phase ledger is preserved for readers who want the complete reconstruction.</p>
            <article className="epic-account" aria-label="Seven-phase detailed reconstruction">
              {storyboard.phases.map((phase) => <StoryChapter key={phase.id} phase={phase} evidenceById={evidenceById} input={input} />)}
            </article>
          </details>
        </div>
      ) : (
        <div data-testid="analyst-account">
          <p className="section-intro">Exact source IDs, resolved intervals, ability outcomes and evidence remain available here without relying on a tooltip.</p>
          <QuantityDisclosure label={storyboard.representedQuantity.abstractionLabel} />
          <ol className="storyboard-timeline" aria-label="Seven-phase technical account">{storyboard.phases.map((phase) => <AnalystPhase key={phase.id} phase={phase} />)}</ol>
          <details className="analyst-detail">
            <summary>Reader narrative diagnostics</summary>
            <p className="technical-id">Status {readerNarrative.diagnostics.status}; dominant concept {readerNarrative.diagnostics.dominantCausalConcept}; turning concept {readerNarrative.diagnostics.turningPointConcept}; resolution concept {readerNarrative.diagnostics.resolutionConcept}; resolution family {readerNarrative.diagnostics.resolutionFamily}.</p>
            <p className="technical-id">Selected candidate IDs {readerNarrative.diagnostics.selectedCandidateIds.join(', ') || 'none'}.</p>
            <p className="technical-id">Omitted candidate IDs {readerNarrative.diagnostics.omittedCandidateIds.join(', ') || 'none'}.</p>
            <ul className="analyst-evidence-list">
              {readerNarrative.diagnostics.selectedCauses.map((cause) => <li key={cause.candidateId}><strong>{cause.candidateId}</strong><span>{cause.reason}</span></li>)}
              {readerNarrative.diagnostics.failure && <li><strong>{readerNarrative.diagnostics.failure.kind} fallback</strong><span>{readerNarrative.diagnostics.failure.message}</span></li>}
            </ul>
          </details>
          <details className="analyst-detail">
            <summary>Evidence annotations</summary>
            <ul className="analyst-evidence-list">{storyboard.evidence.map((evidence) => <li key={evidence.id}><strong>{evidence.label}</strong><span>{evidence.plainText}</span><code>{evidence.technicalText}</code></li>)}</ul>
          </details>
          <aside className="alternate-outcome-note" aria-labelledby="alternate-outcome-heading"><h4 id="alternate-outcome-heading">Technical alternate path</h4><p>{storyboard.alternateOutcomeNote}</p></aside>
        </div>
      )}
    </div>
  )
}
