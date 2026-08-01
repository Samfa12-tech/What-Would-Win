import { useMemo } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise'
import { ChartLineUp } from '@phosphor-icons/react/ChartLineUp'
import { ShareNetwork } from '@phosphor-icons/react/ShareNetwork'
import { SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal'
import {
  assertValidBattleStoryboard,
  buildBattleStoryboard,
  buildLaymanBattleStory,
  buildSafeReaderBattleNarrative,
  RECONSTRUCTION_NOTICE,
  type BattleReconstructionInput,
} from '../storyboard'
import type { Creature, SimulationResult } from '../types'

interface SimpleResultPanelProps {
  result: SimulationResult
  solo: Creature
  group: Creature
  reconstructionInput: BattleReconstructionInput | null
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

function verdictSummary(result: SimulationResult, winner: string): string {
  if (result.outcome === 'draw') return 'The model does not find a reliable winner under these conditions.'
  if (result.outcomeReason.startsWith('Only the ')) {
    return `Only ${winner} has a workable way to achieve the selected win condition.`
  }
  const probability = winningProbability(result)
  if (probability < 0.55) return `The result is effectively even, but the model narrowly favours ${winner} at ${pct(probability)}.`
  if (probability < 0.65) return `The model gives ${winner} a narrow ${pct(probability)} edge.`
  return `${winner} is the clear favourite at ${pct(probability)}.`
}

export function SimpleResultPanel({
  result,
  solo,
  group,
  reconstructionInput,
  shareStatus,
  onEditMatchup,
  onDeepDive,
  onCopyShare,
}: SimpleResultPanelProps) {
  const winner = result.outcome === 'draw' ? 'Draw' : result.winnerName
  const story = useMemo(() => {
    if (!reconstructionInput) return null
    const storyboard = assertValidBattleStoryboard(buildBattleStoryboard(reconstructionInput), reconstructionInput)
    const readerNarrative = buildSafeReaderBattleNarrative(reconstructionInput, storyboard)
    return buildLaymanBattleStory(reconstructionInput, readerNarrative, storyboard)
  }, [reconstructionInput])
  return (
    <section className="simple-result" aria-labelledby="simple-result-title" data-testid="simple-result">
      <div className="simple-result-hero">
        <div>
          <p className="eyebrow">SIMULATION VERDICT</p>
          <h2 id="simple-result-title" tabIndex={-1}>{winner}</h2>
          <p className="simple-verdict-copy">{verdictSummary(result, winner)}</p>
          {result.outcome === 'draw' && <p className="simple-outcome-reason outcome-draw">Neither side can reach or affect the other enough to produce a win.</p>}
        </div>
        <div className={`simple-probability-seal outcome-${result.outcome}`} aria-label={result.outcomeReason.startsWith('Only the ') ? 'One-way model route decision' : `${pct(winningProbability(result))} ${result.outcome === 'draw' ? 'model draw rate' : 'model comparison result'}`}>
          <strong>{pct(winningProbability(result))}</strong>
          <span>{result.outcome === 'draw' ? 'draw rate' : result.outcomeReason.startsWith('Only the ') ? 'route result' : 'model edge'}</span>
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
          {story ? (
            <ol>{story.reasons.map((reason, index) => <li key={reason.id}><span>{index + 1}</span><div><strong>{reason.title}</strong><p>{reason.text}</p></div></li>)}</ol>
          ) : (
            <ol className="simple-draw-reasons">
              <li><span>1</span><div><strong>No workable attack</strong><p>Neither contestant can reach or affect the other enough to meet the chosen win condition.</p></div></li>
              <li><span>2</span><div><strong>No invented battle</strong><p>The model records a draw instead of making up attacks or injuries that its rules do not support.</p></div></li>
            </ol>
          )}
        </section>

        <section className="simple-likely" aria-labelledby="simple-likely-heading">
          <p className="eyebrow">WHAT LIKELY HAPPENS</p>
          <h3 id="simple-likely-heading">How the battle plays out</h3>
          {story ? (
            <div className="simple-story-flow" data-testid="simple-likely-copy" data-story-issues={story.issues.length}>
              {story.stages.map((stage) => <section key={stage.id}><h4>{stage.title}</h4><p>{stage.text}</p></section>)}
            </div>
          ) : <p>The sides never establish a workable fight, so no winner sequence is generated.</p>}
          {story && <p className="simple-reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>}
        </section>
      </div>

      <div className="simple-result-actions">
        <button type="button" className="primary-button" onClick={onEditMatchup}><ArrowCounterClockwise aria-hidden="true" /> Try another matchup</button>
        <button type="button" className="secondary-button" onClick={onCopyShare}><ShareNetwork aria-hidden="true" /> Copy share link</button>
        <button type="button" className="secondary-button" onClick={onDeepDive}><ChartLineUp aria-hidden="true" /> Open Deep dive</button>
        {shareStatus && <span className="action-status" role="status">{shareStatus}</span>}
      </div>

      <p className="simple-model-note"><SlidersHorizontal aria-hidden="true" /> {solo.name} versus {group.name} · entertainment model · full evidence is in Deep dive.</p>
    </section>
  )
}
