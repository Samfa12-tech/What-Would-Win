import type { SimulationResult } from '../types'

interface TechnicalReportProps {
  result: SimulationResult
}

function pct(value: number): string {
  const number = value * 100
  if (number > 99.9) return '>99.9%'
  if (number < 0.1) return '<0.1%'
  return `${number.toFixed(1)}%`
}

export function TechnicalReport({ result }: TechnicalReportProps) {
  return (
    <details className="report-details" open>
      <summary>Technical calculation record</summary>
      <dl className="technical-grid">
        <div><dt>Trials</dt><dd>{result.technical.trialCount.toLocaleString('en-AU')}</dd></div>
        <div><dt>Raw solo trial rate</dt><dd>{pct(result.technical.rawSoloTrialRate)}</dd></div>
        <div><dt>Uncertainty retention</dt><dd>{Math.round((1 - result.technical.epistemicCompression) * 100)}%</dd></div>
        <div><dt>Seed</dt><dd>{result.technical.seed}</dd></div>
        <div><dt>Solo log power</dt><dd>{result.technical.deterministicSoloLogPower.toFixed(4)}</dd></div>
        <div><dt>Group log power</dt><dd>{result.technical.deterministicGroupLogPower.toFixed(4)}</dd></div>
        <div><dt>Quantity log10</dt><dd>{result.technical.groupQuantityLog10.toFixed(4)}</dd></div>
        <div><dt>Group exponent</dt><dd>{result.technical.groupEffectivenessExponent.toFixed(4)}</dd></div>
        <div><dt>Solo environment</dt><dd>{result.technical.soloEnvironmentFactor.toFixed(3)}</dd></div>
        <div><dt>Group environment</dt><dd>{result.technical.groupEnvironmentFactor.toFixed(3)}</dd></div>
        <div><dt>Solo integrity</dt><dd>{result.technical.soloScaleIntegrity.toFixed(3)}</dd></div>
        <div><dt>Group integrity</dt><dd>{result.technical.groupScaleIntegrity.toFixed(3)}</dd></div>
        <div><dt>Solo target mass</dt><dd>{result.technical.soloTargetMassKg.toLocaleString('en-AU')} kg</dd></div>
        <div><dt>Group target mass</dt><dd>{result.technical.groupTargetMassKg.toLocaleString('en-AU')} kg</dd></div>
        <div><dt>Active-front capacity</dt><dd>{Math.round(result.technical.groupFrontageCapacity).toLocaleString('en-AU')}</dd></div>
        <div><dt>Arena-usable count log10</dt><dd>{result.technical.groupUsableQuantityLog10.toFixed(4)}</dd></div>
        <div><dt>Pre-exponent effective count log10</dt><dd>{result.technical.groupEffectiveQuantityLog10.toFixed(4)}</dd></div>
        <div><dt>Reserve log-weight</dt><dd>{result.technical.groupReservePressureRate.toFixed(3)}</dd></div>
        <div><dt>Solo stopping penalty</dt><dd>{result.technical.soloStoppingPenalty.toFixed(3)}</dd></div>
        <div><dt>Group stopping penalty</dt><dd>{result.technical.groupStoppingPenalty.toFixed(3)}</dd></div>
        <div><dt>Solo attack access</dt><dd>{result.technical.soloAttackAccess.toFixed(3)}</dd></div>
        <div><dt>Group attack access</dt><dd>{result.technical.groupAttackAccess.toFixed(3)}</dd></div>
        <div><dt>Solo area-control bonus</dt><dd>{result.technical.soloAreaControlBonus.toFixed(3)}</dd></div>
        <div><dt>Solo fits bounded arena</dt><dd>{result.technical.soloFitsArena ? 'yes' : 'no'}</dd></div>
        <div><dt>Group member fits bounded arena</dt><dd>{result.technical.groupFitsArena ? 'yes' : 'no'}</dd></div>
      </dl>
      <h4>Applied factor ledger</h4>
      <p className="section-intro">Summing each side's log deltas reconstructs its deterministic power above.</p>
      <ol className="factor-list technical-factors">
        {result.appliedFactors.map((factor) => (
          <li key={factor.id}>
            <strong>{factor.phase} · {factor.side}</strong> ({factor.logDelta >= 0 ? '+' : ''}{factor.logDelta.toFixed(3)} log): {factor.explanation}
            {factor.caveat && <small>{factor.caveat}</small>}
          </li>
        ))}
      </ol>
    </details>
  )
}
