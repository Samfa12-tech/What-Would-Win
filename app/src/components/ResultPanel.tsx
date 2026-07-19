import { lazy, Suspense } from 'react'
import type { Creature, ReportDepth, Scenario, SimulationResult } from '../types'
import type { Model04SensitivityPoint } from '../model04/engineV4'

const TechnicalReport = lazy(async () => {
  const module = await import('./TechnicalReport')
  return { default: module.TechnicalReport }
})

interface ResultPanelProps {
  result: SimulationResult
  sensitivity: Model04SensitivityPoint[]
  scenario: Scenario
  solo: Creature
  group: Creature
  shareStatus: string
  onCopyShare: () => void
  onDownloadImage: () => void
  onDownloadJson: () => void
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

export function ResultPanel({ result, sensitivity, scenario, solo, group, shareStatus, onCopyShare, onDownloadImage, onDownloadJson }: ResultPanelProps) {
  const winningProbability = result.winner === 'solo' ? result.soloWinProbability : result.groupWinProbability
  const advantageLabel = (advantage: (typeof result.narrative)[number]['advantage']) => {
    if (advantage === 'solo') return `${solo.name} edge`
    if (advantage === 'group') return `${group.name} group edge`
    if (advantage === 'contested') return 'Contested'
    return 'Neutral setup'
  }
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

      {depthAtLeast(scenario.reportDepth, 'assumptions') && (
        <div className="report-section" aria-labelledby="sensitivity-heading">
          <h3 id="sensitivity-heading">Sensitivity</h3>
          <p className="section-intro">Deterministic margin checks only. These do not select a second winner or replace the baseline verdict.</p>
          <ul className="factor-list">
            {sensitivity.map((point) => (
              <li key={point.id}>
                <strong>{point.label}</strong>
                <span>{point.marginDelta >= 0 ? '+' : ''}{point.marginDelta.toFixed(3)} log-margin shift{point.reversesDeterministicLeader ? ' · reverses the deterministic leader' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.conceptualWarning && <div className="warning-banner">{result.conceptualWarning}</div>}
      {result.feasibilityWarning && <div className="warning-banner">{result.feasibilityWarning}</div>}

      <div className="probability-comparison" aria-label="Win probability comparison">
        <div className="probability-labels">
          <span>{solo.name} {pct(result.soloWinProbability)}</span>
          <span>{group.name} group {pct(result.groupWinProbability)}</span>
        </div>
        <div className="probability-track">
          <div className="probability-solo" style={{ width: `${result.soloWinProbability * 100}%` }} />
        </div>
        <p>{result.confidenceLabel}. Winner probability band: {winnerRange(result)}.</p>
      </div>

      <div className="metric-grid">
        <article>
          <span>Heuristic duration</span>
          <strong>{result.estimatedDuration}</strong>
        </article>
        <article>
          <span>Heuristic group losses</span>
          <strong>{result.groupCasualties}</strong>
        </article>
        <article>
          <span>Solo risk</span>
          <strong>{result.soloIncapacitationRisk}</strong>
        </article>
        <article>
          <span>50/50 group size</span>
          <strong>{result.coinFlipQuantity}</strong>
        </article>
      </div>

      {depthAtLeast(scenario.reportDepth, 'assumptions') && (
        <div className="report-section">
          <h3>Modelled encounter sequence</h3>
          <p className="section-intro">A deterministic reconstruction from the factors actually applied by the engine—not a literal replay.</p>
          <ol className="battle-sequence">
            {result.narrative.map((phase) => (
              <li key={phase.id} className={`battle-phase advantage-${phase.advantage}`}>
                <div className="battle-phase-heading">
                  <h4>{phase.title}</h4>
                  <span>{advantageLabel(phase.advantage)}</span>
                </div>
                <p>{phase.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {depthAtLeast(scenario.reportDepth, 'transparent') && (
        <>
          <div className="report-section">
            <h3>Decisive factors</h3>
            <ol className="factor-list">
              {result.keyFactors.map((factor) => <li key={factor}>{factor}</li>)}
            </ol>
          </div>

          <div className="strength-grid">
            <article>
              <h3>{solo.name}</h3>
              <h4>Strengths</h4>
              <ul>{result.soloStrengths.map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>Vulnerabilities</h4>
              <ul>{result.soloWeaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h3>{group.name} group</h3>
              <h4>Strengths</h4>
              <ul>{result.groupStrengths.map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>Vulnerabilities</h4>
              <ul>{result.groupWeaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
        </>
      )}

      {depthAtLeast(scenario.reportDepth, 'assumptions') && (
        <details className="report-details" open={scenario.reportDepth === 'assumptions'}>
          <summary>Assumptions and limitations</summary>
          <p className="result-version-note">
            Reproducibility identity: model {result.technical.modelVersion} · data {result.technical.dataVersion}
          </p>
          <ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}

      {depthAtLeast(scenario.reportDepth, 'technical') && (
        <Suspense fallback={<div className="method-banner" role="status">Loading the technical calculation record…</div>}>
          <TechnicalReport result={result} />
        </Suspense>
      )}

      <div className="result-actions">
        <a className="secondary-button button-link" href="#matchup">Revise matchup</a>
        <button type="button" className="secondary-button" onClick={onCopyShare}>Copy share link</button>
        <details className="result-export-menu">
          <summary className="secondary-button">Export files</summary>
          <div>
            <button type="button" className="secondary-button" onClick={onDownloadImage}>Download result image</button>
            <button type="button" className="secondary-button" onClick={onDownloadJson}>Download result JSON</button>
          </div>
        </details>
        {shareStatus && <span className="action-status">{shareStatus}</span>}
      </div>
    </section>
  )
}
