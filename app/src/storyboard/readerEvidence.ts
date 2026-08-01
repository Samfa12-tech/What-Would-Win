import { formatLogQuantity } from '../simulation/quantity'
import type { BattleEvidenceRecord, BattleReconstructionInput } from './contracts'
import { quantityReserveStatus } from './quantitySemantics'
import { buildResolvedContestantIdentities, capitaliseResolvedLabel } from './readerIdentity'

export interface StoryEvidenceCopy {
  label: string
  detail: string
}

function numberValue(values: Record<string, unknown>, key: string): number | null {
  const value = values[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(values: Record<string, unknown>, key: string): boolean {
  return values[key] === true
}

function quantityDetail(
  evidence: BattleEvidenceRecord,
  input: BattleReconstructionInput,
): string | null {
  const declaredLog = numberValue(evidence.values, 'declaredQuantityLog10')
    ?? input.deterministicState.quantityLog10
  const activeLog = numberValue(evidence.values, 'effectiveActiveCountLog10')
    ?? input.deterministicState.groupEffectiveQuantityLog10
  const reserveStatus = quantityReserveStatus({
    conceptual: input.deterministicState.conceptual,
    declaredLog10: declaredLog,
    effectiveBasisLog10: activeLog,
  })
  if (reserveStatus === 'conceptual') {
    return 'The conceptual population is represented as capped aggregate pressure; it is not treated as a literal number of simultaneous bodies.'
  }
  if (declaredLog === null || activeLog === null) return null
  if (reserveStatus === 'present') {
    return `The declared group exceeds an effective-pressure basis of ${formatLogQuantity(activeLog)}, so additional depth contributes through bounded reserves and replacement waves rather than attacking all at once.`
  }
  if (reserveStatus !== 'none' || declaredLog > 6) return null
  const declared = Math.max(1, Math.round(10 ** declaredLog))
  return declared === 2
    ? 'Both declared group members can contribute to the same close exchange; there is no reserve wave.'
    : `All ${declared.toLocaleString('en-AU')} declared group members can contribute in the same bounded pressure state; there is no reserve wave.`
}

function evidenceFactorId(evidence: BattleEvidenceRecord): string {
  return evidence.sourceIds[0]?.toLocaleLowerCase('en-AU') ?? ''
}

function analystSuffix(detail: string): string {
  return `${detail} Full technical details remain available in Analyst mode.`
}

function abilityCopy(
  evidence: BattleEvidenceRecord,
  input: BattleReconstructionInput,
): StoryEvidenceCopy {
  const side = evidence.side ?? 'solo'
  const identity = buildResolvedContestantIdentities(input)[side]
  const active = booleanValue(evidence.values, 'active')
  const range = numberValue(evidence.values, 'resolvedRangeM')
  const radius = numberValue(evidence.values, 'resolvedAreaRadiusM')
  const uses = numberValue(evidence.values, 'resolvedUses')
  const reason = evidence.values.rejectionReason
  const cleanLabel = evidence.label.replace(/\blegacy\b/gi, '').trim() || 'Resolved ability'

  if (!active) {
    const reasonText = reason === 'resource-depleted' ? 'its usable resource is depleted'
      : reason === 'target-immune' ? 'the target is immune to that channel'
        : reason === 'condition-unmet' ? 'the required conditions are not met'
          : reason === 'out-of-range' ? 'the target is outside its usable range'
            : reason === 'delivery-inaccessible' ? 'there is no supported delivery route'
              : reason === 'countered' ? 'an opposing counter suppresses it'
                : 'the resolved conditions do not activate it'
    return {
      label: cleanLabel,
      detail: analystSuffix(`${capitaliseResolvedLabel(identity.subjectLabel)} cannot use this effect because ${reasonText}.`),
    }
  }
  if (radius !== null && radius > 0) {
    return {
      label: input.contestants[side].physiology === 'environmental-hazard'
        ? 'Hazard boundary'
        : 'Area coverage',
      detail: analystSuffix(`${capitaliseResolvedLabel(identity.subjectLabel)} affects only the resolved area within approximately ${radius.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres.`),
    }
  }
  if (range !== null && range > 0) {
    const useText = uses === null ? '' : ` About ${uses.toLocaleString('en-AU', { maximumFractionDigits: 1 })} usable attacks are available.`
    return {
      label: 'Ranged access',
      detail: analystSuffix(`${capitaliseResolvedLabel(identity.subjectLabel)} can apply this attack only inside approximately ${range.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres.${useText}`),
    }
  }
  if (booleanValue(evidence.values, 'requiresLineOfSight')
    || booleanValue(evidence.values, 'requiresMutualFacing')) {
    return {
      label: 'Facing and line of sight',
      detail: analystSuffix('This effect applies only while its resolved facing and line-of-sight conditions are satisfied.'),
    }
  }
  return {
    label: cleanLabel,
    detail: analystSuffix(`${capitaliseResolvedLabel(identity.subjectLabel)} has this effect available under the resolved access and delivery conditions.`),
  }
}

function factorCopy(
  evidence: BattleEvidenceRecord,
  input: BattleReconstructionInput,
): StoryEvidenceCopy {
  const id = evidenceFactorId(evidence)
  const identities = buildResolvedContestantIdentities(input)
  if (id.includes('aggregation') || id.includes('frontage') || id.includes('occupancy')) {
    const activeLog = input.deterministicState.groupEffectiveQuantityLog10 >= 0
      ? input.deterministicState.groupEffectiveQuantityLog10
      : null
    return {
      label: 'Simultaneous pressure',
      detail: analystSuffix(quantityDetail(evidence, input) ?? (activeLog === null
        ? 'Only participants with usable contact access can contribute pressure at once.'
        : `The group resolves to an effective-pressure basis of ${formatLogQuantity(activeLog)} after access, frontage and bounded reserves; this is not a literal simultaneous body count.`)),
    }
  }
  if (id.includes('scaling') || id.includes('integrity')) {
    return {
      label: 'Physical reach',
      detail: analystSuffix(`${capitaliseResolvedLabel(identities.solo.subjectLabel)} has approximately ${identities.solo.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres of physical reach, compared with approximately ${identities.group.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres for ${identities.group.eachLabel}.`),
    }
  }
  if (id.includes('access') || id.includes('range') || id.includes('flight')) {
    return {
      label: id.includes('flight') ? 'Flight access' : 'Attack access',
      detail: analystSuffix('This record limits how much available pressure can reach the opponent through the resolved distance and movement conditions.'),
    }
  }
  if (id.includes('area-control') || id.includes('coverage')) {
    return {
      label: 'Area coverage',
      detail: analystSuffix('Physical reach, spacing and usable coverage determine how much opposing pressure can be answered at once.'),
    }
  }
  if (id.includes('mass') || id.includes('stopping') || id.includes('defensive')) {
    return {
      label: id.includes('mass') ? 'Resolved mass' : 'Stopping power',
      detail: analystSuffix('This supported comparison affects how effectively the side can control contact and resist opposing pressure.'),
    }
  }
  if (id.includes('environment') || id.includes('terrain')) {
    return {
      label: 'Battlefield medium',
      detail: analystSuffix(`The selected ${input.scenario.terrain.replace(/-/g, ' ')} conditions change which movement and attack routes remain usable.`),
    }
  }
  return {
    label: evidence.label,
    detail: analystSuffix('This supported comparison changes how much effective pressure the side can apply.'),
  }
}

export function buildStoryEvidenceCopy(
  evidence: BattleEvidenceRecord,
  input: BattleReconstructionInput,
): StoryEvidenceCopy {
  if (evidence.sourceType === 'ability-resolution') return abilityCopy(evidence, input)
  if (evidence.sourceType === 'applied-factor') return factorCopy(evidence, input)
  if (evidence.sourceType === 'quantity') {
    const effectiveLog = numberValue(evidence.values, 'effectiveActiveCountLog10')
    return {
      label: 'Simultaneous pressure',
      detail: analystSuffix(quantityDetail(evidence, input) ?? (effectiveLog === null
        ? 'The declared scale is represented as bounded aggregate pressure rather than literal participants.'
        : `The group resolves to an effective-pressure basis of ${formatLogQuantity(effectiveLog)} after access, frontage and bounded reserves; this is not a literal simultaneous body count.`)),
    }
  }
  if (evidence.sourceType === 'verdict') {
    const probability = numberValue(evidence.values, 'winnerProbability')
    return {
      label: 'Modelled outcome',
      detail: analystSuffix(probability === null
        ? 'The displayed winner is taken directly from the validated simulation result.'
        : `The validated simulation favours the displayed winner at ${(probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%.`),
    }
  }
  if (evidence.sourceType === 'sensitivity') {
    return {
      label: evidence.label,
      detail: analystSuffix('This tested variation is the clearest supported route towards a different balance.'),
    }
  }
  if (evidence.id === 'scenario:win-condition') {
    return {
      label: 'Victory condition',
      detail: analystSuffix(`The encounter uses the selected ${input.scenario.winCondition} rule to determine when the losing side cannot continue.`),
    }
  }
  if (evidence.id === 'scenario:arena') {
    return {
      label: 'Starting conditions',
      detail: analystSuffix(`The sides begin ${input.scenario.startingDistanceM.toLocaleString('en-AU', { maximumFractionDigits: 1 })} metres apart in ${input.scenario.terrain.replace(/-/g, ' ')} conditions.`),
    }
  }
  return {
    label: 'Resolved contestants',
    detail: analystSuffix('The displayed identities, quantities and size choices come directly from the submitted scenario.'),
  }
}
