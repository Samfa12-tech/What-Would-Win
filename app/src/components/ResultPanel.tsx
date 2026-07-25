import { lazy, Suspense, useState } from 'react'
import type { Creature, ReportDepth, Scenario, SimulationResult } from '../types'
import type { Model04SensitivityPoint } from '../model04/engineV4'
import type { AbilityResolution, CreatureV4Draft } from '../model04/contracts'
import type { BattleReconstructionInput } from '../storyboard'

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
  reconstructionInput: BattleReconstructionInput
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

function winnerRange(result: SimulationResult): string {
  if (result.winner === 'solo') return `${pct(result.probabilityRange[0])}–${pct(result.probabilityRange[1])}`
  return `${pct(1 - result.probabilityRange[1])}–${pct(1 - result.probabilityRange[0])}`
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

export function ResultPanel({
  result, sensitivity, abilityResolutions, contestants, reconstructionInput, scenario, solo, group,
  shareStatus, onCopyShare, onDownloadImage, onDownloadJson, onDownloadStoryboard, onAnotherReconstruction,
}: ResultPanelProps) {
  const [view, setView] = useState<ResultView>('verdict')
  const winningProbability = result.winner === 'solo' ? result.soloWinProbability : result.groupWinProbability
  return (
    <section className="results" id="verdict">
      <div className="results-header">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">SIMULATION VERDICT</p>
          <h2>{result.winnerName}</h2>
          <p className="verdict-copy">{result.verdict}</p>
        </div>
        <div className="probability-seal">
          <strong>{pct(winningProbability)}</strong>
          <span>model win rate</span>
        </div>
      </div>

      <nav className="result-view-nav" aria-label="Result views">
        {VIEW_LABELS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id ? 'page' : undefined}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >{item.label}</button>
        ))}
      </nav>

      {view === 'verdict' && (
        <div className="result-view" id="verdict-view" data-testid="verdict-view">
          {result.conceptualWarning && <div className="warning-banner">{result.conceptualWarning}</div>}
          {result.feasibilityWarning && <div className="warning-banner">{result.feasibilityWarning}</div>}

          <div className="probability-comparison" aria-label="Win probability comparison">
            <div className="probability-labels"><span>{solo.name} {pct(result.soloWinProbability)}</span><span>{group.name} group {pct(result.groupWinProbability)}</span></div>
            <div className="probability-track"><div className="probability-solo" style={{ width: `${result.soloWinProbability * 100}%` }} /></div>
            <p>{result.confidenceLabel}. Winner probability band: {winnerRange(result)}.</p>
          </div>

          <div className="metric-grid">
            <article><span>Heuristic duration</span><strong>{result.estimatedDuration}</strong></article>
            <article><span>Heuristic group losses</span><strong>{result.groupCasualties}</strong></article>
            <article><span>Solo risk</span><strong>{result.soloIncapacitationRisk}</strong></article>
            <article><span>50/50 group size</span><strong>{result.coinFlipQuantity}</strong></article>
          </div>

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
      )}

      {view === 'likely-battle' && <Suspense fallback={<div className="method-banner" role="status">Building the validated likely-battle account…</div>}><LikelyBattlePanel input={reconstructionInput} onAnotherReconstruction={onAnotherReconstruction} /></Suspense>}

      {view === 'tactical-reconstruction' && (
        <Suspense fallback={<div className="method-banner" role="status">Loading the optional tactical reconstruction…</div>}>
          <TacticalReconstructionPanel input={reconstructionInput} onAnotherReconstruction={onAnotherReconstruction} />
        </Suspense>
      )}

      {view === 'technical-record' && (
        <div className="result-view" id="technical-record" data-testid="technical-record-view">
          <Suspense fallback={<div className="method-banner" role="status">Loading the technical calculation record…</div>}>
            <TechnicalReport result={result} abilityResolutions={abilityResolutions} contestants={contestants} />
          </Suspense>
        </div>
      )}

      <div className="result-actions">
        <a className="secondary-button button-link" href="#matchup">Revise matchup</a>
        <button type="button" className="secondary-button" onClick={onCopyShare}>Copy share link</button>
        <details className="result-export-menu"><summary className="secondary-button">Export files</summary><div><button type="button" className="secondary-button" onClick={onDownloadImage}>Download result image</button><button type="button" className="secondary-button" onClick={onDownloadJson}>Download result JSON</button><button type="button" className="secondary-button" onClick={onDownloadStoryboard}>Download storyboard JSON</button></div></details>
        {shareStatus && <span className="action-status">{shareStatus}</span>}
      </div>
    </section>
  )
}
