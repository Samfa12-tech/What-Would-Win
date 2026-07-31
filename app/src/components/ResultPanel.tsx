import { lazy, Suspense, useState, type KeyboardEvent } from 'react'
import type { Creature, ReportDepth, Scenario, SimulationResult } from '../types'
import type { Model04SensitivityPoint } from '../model04/engineV4'
import type { AbilityResolution, CreatureV4Draft } from '../model04/contracts'
import type { BattleReconstructionInput } from '../storyboard'
import { formatLogQuantity } from '../simulation/quantity'

const TechnicalReport = lazy(async () => {
  const module = await import('./TechnicalReport')
  return { default: module.TechnicalReport }
})

const TacticalReconstructionPanel = lazy(async () => {
  const module = await import('./TacticalReconstructionPanel')
  return { default: module.TacticalReconstructionPanel }
})

const LikelyBattlePanel = lazy(async () => {
  const module = await import('./LikelyBattlePanel')
  return { default: module.LikelyBattlePanel }
})

type ResultView = 'verdict' | 'likely-battle' | 'tactical-reconstruction' | 'technical-record'

interface ResultPanelProps {
  result: SimulationResult
  sensitivity: Model04SensitivityPoint[]
  abilityResolutions: AbilityResolution[]
  contestants: { solo: CreatureV4Draft; group: CreatureV4Draft }
  reconstructionInput: BattleReconstructionInput | null
  scenario: Scenario
  solo: Creature
  group: Creature
  shareStatus: string
  onCopyShare: () => void
  onDownloadImage: () => void
  onDownloadJson: () => void
  onDownloadStoryboard: () => void
  onAnotherReconstruction: () => void
}

function pct(value: number): string {
  const number = value * 100
  if (number > 99.9) return '>99.9%'
  if (number < 0.1) return '<0.1%'
  return `${number.toFixed(1)}%`
}

function outcomeProbability(result: SimulationResult): number {
  if (result.outcome === 'draw') return result.drawProbability
  return result.outcome === 'solo-win' ? result.soloWinProbability : result.groupWinProbability
}

function outcomeTitle(result: SimulationResult): string {
  if (result.outcome === 'draw') return 'Draw'
  return result.winnerName
}

function outcomeRange(result: SimulationResult): string {
  if (result.outcome === 'draw') return `${pct(result.drawProbability)} modelled draw rate`
  if (result.outcome === 'solo-win') return `${pct(result.probabilityRange[0])}–${pct(result.probabilityRange[1])}`
  return `${pct(1 - result.probabilityRange[1])}–${pct(1 - result.probabilityRange[0])}`
}

function quantity(log10: number): string {
  return log10 <= 6
    ? Math.max(1, Math.round(10 ** log10)).toLocaleString('en-AU')
    : formatLogQuantity(log10)
}

function depthAtLeast(current: ReportDepth, target: ReportDepth): boolean {
  const order: ReportDepth[] = ['verdict', 'assumptions', 'transparent', 'technical']
  return order.indexOf(current) >= order.indexOf(target)
}

const VIEW_LABELS: Array<{ id: ResultView; label: string }> = [
  { id: 'verdict', label: 'Verdict' },
  { id: 'likely-battle', label: 'Likely battle' },
  { id: 'tactical-reconstruction', label: 'Tactical reconstruction' },
  { id: 'technical-record', label: 'Technical record' },
]

function confidenceExplanation(result: SimulationResult): string {
  const spread = Math.max(0, result.probabilityRange[1] - result.probabilityRange[0])
  const stability = spread <= 0.08 ? 'a narrow' : spread <= 0.18 ? 'a moderate' : 'a wide'
  return `${result.confidenceLabel} reflects ${stability} plausible probability band. It describes model stability, not certainty or a scripted battle.`
}

function DrawPresentation({ result, view }: { result: SimulationResult; view: 'Likely battle' | 'Tactical reconstruction' }) {
  return (
    <section className="draw-presentation" data-testid="draw-presentation">
      <p className="eyebrow">MODELLED NON-ENGAGEMENT</p>
      <h3>{view}: no battle sequence generated</h3>
      <p>{result.outcomeReason}</p>
      <p>The model resolved a draw, so this view does not invent phases, attacks, injuries or a winner. Change the starting conditions or matchup to test an engagement path.</p>
    </section>
  )
}
export function ResultPanel({
  result, sensitivity, abilityResolutions, contestants, reconstructionInput, scenario, solo, group,
  shareStatus, onCopyShare, onDownloadImage, onDownloadJson, onDownloadStoryboard, onAnotherReconstruction,
}: ResultPanelProps) {
  const [view, setView] = useState<ResultView>('verdict')
  const displayedOutcomeProbability = outcomeProbability(result)
  const bandLeft = Math.max(0, Math.min(100, result.probabilityRange[0] * 100))
  const bandWidth = Math.max(1, Math.min(100 - bandLeft, (result.probabilityRange[1] - result.probabilityRange[0]) * 100))
  const arenaUsableLog10 = result.technical.groupUsableQuantityLog10
  const activeFrontage = Math.max(1, Math.min(
    Math.round(10 ** Math.min(12, arenaUsableLog10)),
    Math.max(1, Math.round(result.technical.groupFrontageCapacity)),
  ))
  const handleViewKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = VIEW_LABELS.findIndex((item) => item.id === view)
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? VIEW_LABELS.length - 1
        : delta
          ? (current + delta + VIEW_LABELS.length) % VIEW_LABELS.length
          : current
    if (next === current && !['Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextView = VIEW_LABELS[next].id
    setView(nextView)
    requestAnimationFrame(() => document.getElementById(`result-tab-${nextView}`)?.focus())
  }

  return (
    <section className="results" id="verdict">
      <div className="results-header">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">SIMULATION VERDICT</p>
          <h2>{outcomeTitle(result)}</h2>
          <p className="verdict-copy">{result.verdict}</p>
          <p className={`outcome-reason outcome-${result.outcome}`}>{result.outcomeReason}</p>
        </div>
        <div className={`probability-seal outcome-${result.outcome}`}>
          <strong>{pct(displayedOutcomeProbability)}</strong>
          <span>{result.outcome === 'draw' ? 'model draw rate' : 'model win rate'}</span>
        </div>
      </div>

      <div className="result-view-nav" role="tablist" aria-label="Result views" onKeyDown={handleViewKeys}>
        {VIEW_LABELS.map((item) => (
          <button
            key={item.id}
            id={`result-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            aria-controls={`result-panel-${item.id}`}
            tabIndex={view === item.id ? 0 : -1}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >{item.label}</button>
        ))}
      </div>

      <div className="result-view" id="result-panel-verdict" role="tabpanel" aria-labelledby="result-tab-verdict" data-testid="verdict-view" hidden={view !== 'verdict'}>
          {result.conceptualWarning && <div className="warning-banner">{result.conceptualWarning}</div>}
          {result.feasibilityWarning && <div className="warning-banner">{result.feasibilityWarning}</div>}

          <div className="probability-comparison">
            <div className="probability-labels">
              <span>{solo.name} {pct(result.soloWinProbability)}</span>
              {result.drawProbability > 0 && <span>Draw {pct(result.drawProbability)}</span>}
              <span>{group.name} group {pct(result.groupWinProbability)}</span>
            </div>
            <div
              className="probability-track"
              role="img"
              aria-label={`${solo.name} ${pct(result.soloWinProbability)}, draw ${pct(result.drawProbability)}, ${group.name} group ${pct(result.groupWinProbability)}. Solo probability band ${pct(result.probabilityRange[0])} to ${pct(result.probabilityRange[1])}. The centre marker is 50 percent.`}
            >
              <div className="probability-solo" style={{ width: `${result.soloWinProbability * 100}%` }} />
              <div className="probability-draw" style={{ left: `${result.soloWinProbability * 100}%`, width: `${result.drawProbability * 100}%` }} />
              <span className="probability-midpoint" aria-hidden="true" />
              <span className="probability-band" aria-hidden="true" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
            </div>
            <p><strong>{outcomeRange(result)}</strong>. {confidenceExplanation(result)}</p>
          </div>

          <div className="metric-grid">
            <article><span>Heuristic duration</span><strong>{result.estimatedDuration}</strong></article>
            <article><span>Heuristic group losses</span><strong>{result.groupCasualties}</strong></article>
            <article><span>Solo risk</span><strong>{result.soloIncapacitationRisk}</strong></article>
            <article><span>50/50 group size</span><strong>{result.coinFlipQuantity}</strong></article>
          </div>

          <section className="quantity-pipeline" aria-labelledby="quantity-pipeline-heading">
            <div><p className="eyebrow">QUANTITY PIPELINE</p><h3 id="quantity-pipeline-heading">How the declared group becomes effective pressure</h3></div>
            <ol>
              <li><span>1</span><small>Declared</small><strong>{quantity(result.technical.groupQuantityLog10)}</strong></li>
              <li><span>2</span><small>Arena usable</small><strong>{quantity(arenaUsableLog10)}</strong></li>
              <li><span>3</span><small>Active frontage</small><strong>{activeFrontage.toLocaleString('en-AU')}</strong></li>
              <li><span>4</span><small>Effective pressure</small><strong>{quantity(result.technical.groupEffectiveQuantityLog10)}</strong></li>
            </ol>
            <p>Each stage is bounded by arena capacity, physical access, frontage and reserve weighting. These are aggregate model quantities, not a casualty sequence.</p>
          </section>

          {depthAtLeast(scenario.reportDepth, 'assumptions') && (
            <div className="report-section" aria-labelledby="sensitivity-heading">
              <h3 id="sensitivity-heading">Sensitivity</h3>
              <p className="section-intro">Deterministic margin checks only. These do not select a second winner or replace the baseline verdict.</p>
              <ul className="factor-list">{sensitivity.map((point) => <li key={point.id}><strong>{point.label}</strong><span>{point.marginDelta >= 0 ? '+' : ''}{point.marginDelta.toFixed(3)} log-margin shift{point.reversesDeterministicLeader ? ' · reverses the deterministic leader' : ''}</span></li>)}</ul>
            </div>
          )}

          {depthAtLeast(scenario.reportDepth, 'transparent') && (
            <>
              <div className="report-section"><h3>Decisive factors</h3><ol className="factor-list">{result.keyFactors.map((factor) => <li key={factor}>{factor}</li>)}</ol></div>
              <div className="strength-grid">
                <article><h3>{solo.name}</h3><h4>Strengths</h4><ul>{result.soloStrengths.map((item) => <li key={item}>{item}</li>)}</ul><h4>Vulnerabilities</h4><ul>{result.soloWeaknesses.map((item) => <li key={item}>{item}</li>)}</ul></article>
                <article><h3>{group.name} group</h3><h4>Strengths</h4><ul>{result.groupStrengths.map((item) => <li key={item}>{item}</li>)}</ul><h4>Vulnerabilities</h4><ul>{result.groupWeaknesses.map((item) => <li key={item}>{item}</li>)}</ul></article>
              </div>
            </>
          )}

          {depthAtLeast(scenario.reportDepth, 'assumptions') && (
            <details className="report-details" open={scenario.reportDepth === 'assumptions'}>
              <summary>Assumptions and limitations</summary>
              <p className="result-version-note">Reproducibility identity: model {result.technical.modelVersion} · data {result.technical.dataVersion}</p>
              <ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>
          )}
        </div>

      <div id="result-panel-likely-battle" role="tabpanel" aria-labelledby="result-tab-likely-battle" hidden={view !== 'likely-battle'}>
        {view === 'likely-battle' && (result.outcome === 'draw' || reconstructionInput === null
          ? <DrawPresentation result={result} view="Likely battle" />
          : <Suspense fallback={<div className="method-banner" role="status">Building the validated likely-battle account…</div>}><LikelyBattlePanel input={reconstructionInput} onAnotherReconstruction={onAnotherReconstruction} /></Suspense>)}
      </div>

      <div id="result-panel-tactical-reconstruction" role="tabpanel" aria-labelledby="result-tab-tactical-reconstruction" hidden={view !== 'tactical-reconstruction'}>
        {view === 'tactical-reconstruction' && (result.outcome === 'draw' || reconstructionInput === null
          ? <DrawPresentation result={result} view="Tactical reconstruction" />
          : <Suspense fallback={<div className="method-banner" role="status">Loading the optional tactical reconstruction…</div>}><TacticalReconstructionPanel input={reconstructionInput} onAnotherReconstruction={onAnotherReconstruction} /></Suspense>)}
      </div>

      <div className="result-view" id="result-panel-technical-record" role="tabpanel" aria-labelledby="result-tab-technical-record" data-testid="technical-record-view" hidden={view !== 'technical-record'}>
        {view === 'technical-record' && <Suspense fallback={<div className="method-banner" role="status">Loading the technical calculation record…</div>}>
          <TechnicalReport result={result} abilityResolutions={abilityResolutions} contestants={contestants} />
        </Suspense>}
      </div>

      <div className="result-actions">
        <a className="secondary-button button-link" href="#matchup">Revise matchup</a>
        <button type="button" className="secondary-button" onClick={onCopyShare}>Copy share link</button>
        <details className="result-export-menu"><summary className="secondary-button">Export files</summary><div>
          {result.outcome === 'draw' && <p id="draw-storyboard-export-note" className="result-export-note" role="note">A draw has no winner storyboard. Result image and result JSON exports remain available.</p>}
          <button type="button" className="secondary-button" onClick={onDownloadImage}>Download result image</button><button type="button" className="secondary-button" onClick={onDownloadJson}>Download result JSON</button><button type="button" className="secondary-button" onClick={onDownloadStoryboard} disabled={result.outcome === 'draw'} aria-describedby={result.outcome === 'draw' ? 'draw-storyboard-export-note' : undefined}>Download storyboard JSON</button>
        </div></details>
        {shareStatus && <span className="action-status">{shareStatus}</span>}
      </div>
    </section>
  )
}
