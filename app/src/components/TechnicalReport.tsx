import type { SimulationResult } from '../types'
import type { AbilityResolution, CreatureV4Draft } from '../model04/contracts'

interface TechnicalReportProps {
  result: SimulationResult
  abilityResolutions: AbilityResolution[]
  contestants: { solo: CreatureV4Draft; group: CreatureV4Draft }
}

function pct(value: number): string {
  const number = value * 100
  if (number > 99.9) return '>99.9%'
  if (number < 0.1) return '<0.1%'
  return `${number.toFixed(1)}%`
}

const categoryLabels: Record<NonNullable<AbilityResolution['rejectionReason']>, string> = {
  'resource-depleted': 'Resource depleted',
  'out-of-range': 'Out of range',
  'condition-unmet': 'Ineligible',
  'target-immune': 'Immune',
  'delivery-inaccessible': 'Ineligible',
  countered: 'Countered',
}

function abilityName(resolution: AbilityResolution, contestants: TechnicalReportProps['contestants']): string {
  const profile = resolution.side === 'solo' ? contestants.solo : contestants.group
  return profile.abilities.find((ability) => ability.id === resolution.abilityId)?.name ?? resolution.abilityId
}

const DIAGNOSTIC_ONLY = 'Diagnostic only — legacy value not included in model-0.4 deterministic power'

export function TechnicalReport({ result, abilityResolutions, contestants }: TechnicalReportProps) {
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
        <div><dt>Solo stopping penalty</dt><dd>{result.technical.soloStoppingPenalty.toFixed(3)}<small>{DIAGNOSTIC_ONLY}</small></dd></div>
        <div><dt>Group stopping penalty</dt><dd>{result.technical.groupStoppingPenalty.toFixed(3)}<small>{DIAGNOSTIC_ONLY}</small></dd></div>
        <div><dt>Solo attack access</dt><dd>{result.technical.soloAttackAccess.toFixed(3)}<small>{DIAGNOSTIC_ONLY}</small></dd></div>
        <div><dt>Group attack access</dt><dd>{result.technical.groupAttackAccess.toFixed(3)}<small>{DIAGNOSTIC_ONLY}</small></dd></div>
        <div><dt>Solo area-control bonus</dt><dd>{result.technical.soloAreaControlBonus.toFixed(3)}<small>{DIAGNOSTIC_ONLY}</small></dd></div>
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
      <h4>Ability resolution record</h4>
      <p className="section-intro">Applied and rejected attempts from the authoritative model state. Rejected records are diagnostics, not narrated events.</p>
      <ol className="factor-list" data-testid="ability-resolution-record">
        {abilityResolutions.map((resolution) => {
          const category = resolution.active ? 'Applied' : categoryLabels[resolution.rejectionReason ?? 'condition-unmet']
          const stopping = resolution.effects.map((effect) => effect.stoppingFactor).filter((value): value is number => value !== undefined)
          return (
            <li key={resolution.factorId} data-ability-status={category.toLowerCase().replaceAll(' ', '-')}>
              <strong>{category} · {resolution.side} · {abilityName(resolution, contestants)}</strong>
              <span>Resource {resolution.resourcePercent.toFixed(1)}% · access {resolution.accessFactor.toFixed(3)} · channel {resolution.channelFactor.toFixed(3)} · {resolution.logDelta >= 0 ? '+' : ''}{resolution.logDelta.toFixed(3)} log</span>
              <small>Resolved geometry: {resolution.resolvedRangeM.toLocaleString('en-AU')} m range · {resolution.resolvedAreaRadiusM.toLocaleString('en-AU')} m area radius.</small>
              <small>Coverage {resolution.coverageFactor.toFixed(3)} · stopping {stopping.length ? stopping.map((value) => value.toFixed(3)).join(', ') : 'n/a'} · uses {resolution.resolvedUses ?? 'unlimited'} / {resolution.availableUses ?? 'unlimited'} · recharge opportunities {resolution.rechargeOpportunities}.</small>
              {(resolution.physicalAccessFactor !== undefined || resolution.executionFactor !== undefined) && <small>Physical access {resolution.physicalAccessFactor?.toFixed(3) ?? 'n/a'} · execution {resolution.executionFactor?.toFixed(3) ?? 'n/a'}.</small>}
              {resolution.conditionFailures?.length ? <small>Unmet conditions: {resolution.conditionFailures.join(', ')}.</small> : null}
              {resolution.counterChannel && <small>Counter channel: {resolution.counterChannel.replaceAll('-', ' ')}.</small>}
              <ul>
                {resolution.effects.map((effect) => (
                  <li key={effect.factorId}>{effect.recipient} · {effect.kind} via {effect.channel.replaceAll('-', ' ')} · channel {effect.channelFactor.toFixed(3)} · {effect.logDelta >= 0 ? '+' : ''}{effect.logDelta.toFixed(3)} log</li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
    </details>
  )
}
