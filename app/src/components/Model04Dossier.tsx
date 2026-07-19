import type { Ability, AbilityCondition, AbilityEffect } from '../model04/contracts'
import type { Model04Dossier as Model04DossierData } from '../model04/runtime'

interface Model04DossierProps {
  dossier: Model04DossierData
}

function words(value: string): string {
  return value.replaceAll('-', ' ')
}

function enabledSenses(dossier: Model04DossierData): string {
  const enabled = Object.entries(dossier.profile.senses).filter(([, value]) => value).map(([key]) => words(key))
  return enabled.length ? enabled.join(', ') : 'none declared'
}

function enabledLocomotion(dossier: Model04DossierData): string {
  const enabled = Object.entries(dossier.profile.locomotion).filter(([, value]) => value).map(([key]) => words(key))
  return enabled.length ? enabled.join(', ') : 'stationary / no ordinary locomotion'
}

function effectText(effect: AbilityEffect): string {
  return `${words(effect.kind)} via ${words(effect.channel)} · potency ${effect.potency}${effect.targetModifier === undefined ? '' : ` · target modifier ${effect.targetModifier}`}`
}

function conditionText(conditions?: AbilityCondition): string[] {
  if (!conditions) return []
  const entries: string[] = []
  if (conditions.requiresLineOfSight) entries.push('line of sight')
  if (conditions.requiresAttackerFacing) entries.push('attacker facing target')
  if (conditions.requiresTargetFacing) entries.push('target facing attacker')
  if (conditions.requiresMutualFacing) entries.push('mutual facing')
  if (conditions.minimumDistanceM !== undefined) entries.push(`minimum distance ${conditions.minimumDistanceM} m`)
  if (conditions.maximumDistanceM !== undefined) entries.push(`maximum distance ${conditions.maximumDistanceM} m`)
  if (conditions.minimumTargetMassKg !== undefined) entries.push(`minimum target mass ${conditions.minimumTargetMassKg} kg`)
  if (conditions.maximumTargetMassKg !== undefined) entries.push(`maximum target mass ${conditions.maximumTargetMassKg} kg`)
  if (conditions.terrains?.length) entries.push(`terrain: ${conditions.terrains.join(', ')}`)
  if (conditions.forbiddenWeather?.length) entries.push(`blocked by: ${conditions.forbiddenWeather.join(', ')}`)
  if (conditions.timeOfDay?.length) entries.push(`time: ${conditions.timeOfDay.join(', ')}`)
  if (conditions.targetPhysiology?.length) entries.push(`target physiology: ${conditions.targetPhysiology.map(words).join(', ')}`)
  if (conditions.requiredTargetSenses?.length) entries.push(`target senses: ${conditions.requiredTargetSenses.map(words).join(', ')}`)
  return entries
}

function AbilityRecord({ ability, origin }: { ability: Ability; origin: string }) {
  const conditions = conditionText(ability.conditions)
  return (
    <li>
      <strong>{ability.name}</strong> — {words(ability.kind)} · {words(ability.delivery)} · {words(ability.geometryScaling ?? 'inherited')} geometry
      <small>Origin: {words(origin)}.</small>
      <ul>
        {ability.rangeM !== undefined && <li>Authored range: {ability.rangeM.toLocaleString('en-AU')} m</li>}
        {ability.areaRadiusM !== undefined && <li>Authored area radius: {ability.areaRadiusM.toLocaleString('en-AU')} m</li>}
        <li>Target coverage: {words(ability.targetLimit ?? 'single')}</li>
        {ability.effects.map((effect, index) => <li key={`${ability.id}-effect-${index}`}>{effectText(effect)}</li>)}
        <li>Resource: {words(ability.resource.pool)}{ability.resource.capacity === undefined ? '' : ` · capacity ${ability.resource.capacity}`}{ability.resource.rechargeSeconds === undefined ? '' : ` · recharge ${ability.resource.rechargeSeconds}s`}</li>
        {conditions.length > 0 && <li>Conditions: {conditions.join('; ')}</li>}
        {ability.counteredBy?.length ? <li>Counters: {ability.counteredBy.map(words).join(', ')}</li> : null}
      </ul>
      <small>{ability.notes}</small>
    </li>
  )
}

export function Model04Dossier({ dossier }: Model04DossierProps) {
  const modifiers = Object.entries(dossier.profile.channelModifiers)
  return (
    <div data-testid="model04-dossier">
      <p><strong>Fixed interpretation:</strong> {dossier.fixedInterpretation}</p>
      <p><strong>Review:</strong> {words(dossier.reviewStatus)} · {words(dossier.activationRoute)}. {dossier.reviewNote}</p>
      <dl className="technical-grid">
        <div><dt>Physiology</dt><dd>{words(dossier.profile.physiology)}</dd></div>
        <div><dt>Senses</dt><dd>{enabledSenses(dossier)}</dd></div>
        <div><dt>Locomotion</dt><dd>{enabledLocomotion(dossier)}</dd></div>
        <div><dt>Contact reach</dt><dd>{dossier.profile.contact_reach_m.toLocaleString('en-AU')} m baseline</dd></div>
        <div><dt>Channel modifiers</dt><dd>{modifiers.length ? modifiers.map(([channel, value]) => `${words(channel)} ${value}`).join(', ') : 'none declared'}</dd></div>
      </dl>
      <h4>Abilities and counters</h4>
      <ol className="factor-list">
        {dossier.profile.abilities.map((ability) => (
          <AbilityRecord key={ability.id} ability={ability} origin={dossier.abilityOrigins[ability.id]} />
        ))}
      </ol>
    </div>
  )
}
