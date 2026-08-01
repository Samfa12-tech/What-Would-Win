import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise'
import { ChartLineUp } from '@phosphor-icons/react/ChartLineUp'
import { ShareNetwork } from '@phosphor-icons/react/ShareNetwork'
import { SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal'
import type { Creature, SimulationResult } from '../types'

interface SimpleResultPanelProps {
  result: SimulationResult
  solo: Creature
  group: Creature
  shareStatus: string
  onEditMatchup: () => void
  onDeepDive: () => void
  onCopyShare: () => void
}

function pct(value: number): string {
  const percent = value * 100
  if (percent > 99.9) return '>99.9%'
  if (percent < 0.1) return '<0.1%'
  return `${percent.toFixed(1)}%`
}

function winningProbability(result: SimulationResult): number {
  if (result.outcome === 'draw') return result.drawProbability
  return result.outcome === 'solo-win' ? result.soloWinProbability : result.groupWinProbability
}

function firstSentence(text: string): string {
  return text.trim().split(/(?<=[.!?])\s+/)[0] ?? text
}

export function SimpleResultPanel({
  result,
  solo,
  group,
  shareStatus,
  onEditMatchup,
  onDeepDive,
  onCopyShare,
}: SimpleResultPanelProps) {
  const winner = result.outcome === 'draw' ? 'Draw' : result.winnerName
  const reasons = result.keyFactors.slice(0, 3).map(firstSentence)
  const likely = result.narrative
    .filter((phase) => phase.id === 'approach' || phase.id === 'contact' || phase.id === 'resolution')
    .map((phase) => firstSentence(phase.text))
    .join(' ')
  const alternatePath = result.narrative.find((phase) => phase.id === 'uncertainty')?.text

  return (
    <section className="simple-result" aria-labelledby="simple-result-title" data-testid="simple-result">
      <div className="simple-result-hero">
        <div>
          <p className="eyebrow">SIMULATION VERDICT</p>
          <h2 id="simple-result-title" tabIndex={-1}>{winner}</h2>
          <p className="simple-verdict-copy">{result.verdict}</p>
          <p className={`simple-outcome-reason outcome-${result.outcome}`}>{result.outcomeReason}</p>
        </div>
        <div className={`simple-probability-seal outcome-${result.outcome}`} aria-label={`${pct(winningProbability(result))} ${result.outcome === 'draw' ? 'model draw rate' : 'model win rate'}`}>
          <strong>{pct(winningProbability(result))}</strong>
          <span>{result.outcome === 'draw' ? 'draw rate' : 'win rate'}</span>
        </div>
      </div>

      {(result.conceptualWarning || result.feasibilityWarning) && (
        <div className="simple-result-warnings" role="note">
          {result.conceptualWarning && <p>{result.conceptualWarning}</p>}
          {result.feasibilityWarning && <p>{result.feasibilityWarning}</p>}
        </div>
      )}

      <div className="simple-result-grid">
        <section className="simple-why" aria-labelledby="simple-why-heading">
          <p className="eyebrow">THE SHORT ANSWER</p>
          <h3 id="simple-why-heading">Why {winner === 'Draw' ? 'neither side wins' : `${winner} wins`}</h3>
          <ol>{reasons.map((reason, index) => <li key={reason}><span>{index + 1}</span><p>{reason}</p></li>)}</ol>
        </section>

        <section className="simple-likely" aria-labelledby="simple-likely-heading">
          <p className="eyebrow">WHAT LIKELY HAPPENS</p>
          <h3 id="simple-likely-heading">How the battle plays out</h3>
          {likely ? <p data-testid="simple-likely-copy">{likely}</p> : <p>No winner sequence is generated for this modelled draw.</p>}
          {alternatePath && <aside><strong>What could change it</strong><p>{firstSentence(alternatePath)}</p></aside>}
        </section>
      </div>

      <div className="simple-result-actions">
        <button type="button" className="primary-button" onClick={onEditMatchup}><ArrowCounterClockwise aria-hidden="true" /> Try another matchup</button>
        <button type="button" className="secondary-button" onClick={onCopyShare}><ShareNetwork aria-hidden="true" /> Copy share link</button>
        <button type="button" className="secondary-button" onClick={onDeepDive}><ChartLineUp aria-hidden="true" /> Open Deep dive</button>
        {shareStatus && <span className="action-status" role="status">{shareStatus}</span>}
      </div>

      <p className="simple-model-note"><SlidersHorizontal aria-hidden="true" /> {solo.name} versus {group.name} · entertainment model · full evidence and technical records remain available in Deep dive.</p>
    </section>
  )
}
