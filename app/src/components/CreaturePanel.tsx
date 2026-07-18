import { useState } from 'react'
import type { Creature, Scenario, SizeConfig, StatOverrides } from '../types'
import { isCustomCreature } from '../customCreatures'
import { SizeControl } from './SizeControl'
import { StatControls } from './StatControls'

interface CreaturePanelProps {
  side: 'solo' | 'group'
  title: string
  subtitle: string
  creature: Creature
  creatures: Creature[]
  selectedId: string
  size: SizeConfig
  scalingMode: Scenario['scalingMode']
  overrides: StatOverrides
  onCreatureChange: (id: string) => void
  onSizeChange: (size: SizeConfig) => void
  onOverridesChange: (value: StatOverrides) => void
  onPresetApply: (preset: string) => void
  quantity?: string
  onQuantityChange?: (quantity: string) => void
  onCloneCreature: () => void
  onEditCreature: () => void
  onDeleteCreature: () => void
  onExportCreature: () => void
  customIsSaved: boolean
}

const kindLabels: Record<Creature['kind'], string> = {
  animal: 'Living animals',
  extinct: 'Extinct animals',
  fantasy: 'Fantasy & mythology',
  human: 'Generic humans',
}

export function CreaturePanel(props: CreaturePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesQuery = (item: Creature) => !normalizedQuery || [item.name, item.category, item.kind]
    .some((value) => value.toLowerCase().includes(normalizedQuery))
  const visibleCreatures = props.creatures.filter((item) => matchesQuery(item) || item.id === props.selectedId)
  const grouped = Object.entries(kindLabels).map(([kind, label]) => ({
    kind: kind as Creature['kind'],
    label,
    items: visibleCreatures.filter((item) => item.kind === kind && !isCustomCreature(item)),
  }))
  const customCreatures = visibleCreatures.filter(isCustomCreature)
  const selectedIsCustom = isCustomCreature(props.creature)
  const matchCount = props.creatures.filter(matchesQuery).length
  const sideId = props.side

  return (
    <section className="combatant-panel">
      <div className="combatant-heading">
        <div>
          <p className="eyebrow">{props.subtitle}</p>
          <h2>{props.title}</h2>
        </div>
      </div>

      <label className="field-stack creature-search">
        <span>Find contestant</span>
        <input
          type="search"
          data-testid={`${sideId}-creature-search`}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search animals, extinct, myths…"
          aria-describedby={`${sideId}-search-help`}
        />
        <small id={`${sideId}-search-help`} aria-live="polite">
          {normalizedQuery ? `${matchCount} matching profile${matchCount === 1 ? '' : 's'}; the selected profile stays available.` : `Search or browse all ${props.creatures.length} profiles.`}
        </small>
      </label>

      <label className="field-stack">
        <span>Contestant</span>
        <select aria-label={`${props.title} contestant`} data-testid={`${sideId}-creature-select`} value={props.selectedId} onChange={(event) => { props.onCreatureChange(event.target.value); setSearchQuery('') }}>
          {grouped.map((group) => (
            <optgroup key={group.kind} label={group.label}>
              {group.items.map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </optgroup>
          ))}
          {customCreatures.length > 0 && (
            <optgroup label="My custom profiles">
              {customCreatures.map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <div className="profile-actions">
        <button type="button" className="text-button" onClick={props.onCloneCreature}>Clone as custom</button>
        {selectedIsCustom && (
          <>
            {props.customIsSaved && <button type="button" className="text-button" onClick={props.onEditCreature}>Edit custom</button>}
            <button type="button" className="text-button" onClick={props.onExportCreature}>Export custom</button>
            {props.customIsSaved && <button type="button" className="text-button danger-text" onClick={props.onDeleteCreature}>Delete custom</button>}
          </>
        )}
      </div>

      {props.quantity !== undefined && props.onQuantityChange && (
        <label className="field-stack quantity-field">
          <span>Quantity</span>
          <input
            inputMode="text"
            value={props.quantity}
            onChange={(event) => props.onQuantityChange?.(event.target.value)}
            placeholder="100, 1e12 or 10^100"
            aria-describedby="quantity-help"
          />
          <small id="quantity-help">Whole numbers and scientific notation are accepted. There is no displayed upper limit.</small>
        </label>
      )}

      <SizeControl creature={props.creature} value={props.size} scalingMode={props.scalingMode} onChange={props.onSizeChange} />

      <div className="profile-summary">
        <span>{props.creature.category.replaceAll('-', ' ')}</span>
        <span>{props.creature.representative_peak_mass_kg.toLocaleString('en-AU')} kg baseline</span>
        <span>{selectedIsCustom ? 'private · user-authored' : `${props.creature.data_confidence} data`}</span>
      </div>

      <details className="profile-tuning">
        <summary>
          <span>Tune tactical profile</span>
          <small>Aggression {props.overrides.aggression ?? props.creature.aggression} · Intelligence {props.overrides.intelligence ?? props.creature.intelligence} · Teamwork {props.overrides.coordination ?? props.creature.coordination}</small>
        </summary>
        <div className="profile-tuning-content">
          <label className="field-stack">
            <span>Profile preset</span>
            <select defaultValue="" onChange={(event) => { props.onPresetApply(event.target.value); event.currentTarget.value = '' }}>
              <option value="" disabled>Apply a preset…</option>
              <option value="baseline">Natural baseline</option>
              <option value="enraged">Enraged</option>
              <option value="disciplined">Disciplined</option>
              <option value="exhausted">Exhausted</option>
              <option value="armored">Armoured</option>
            </select>
          </label>
          <StatControls creature={props.creature} value={props.overrides} onChange={props.onOverridesChange} />
        </div>
      </details>

      <details className="creature-data">
        <summary>Baseline profile and source</summary>
        <dl>
          <div><dt>Burst speed</dt><dd>{props.creature.burst_speed_kph} km/h</dd></div>
          <div><dt>Reach</dt><dd>{props.creature.effective_reach_m} m</dd></div>
          <div><dt>Attack modes</dt><dd>{props.creature.attack_modes.join(', ')}</dd></div>
          <div><dt>Traits</dt><dd>{props.creature.traits.join(', ') || 'none recorded'}</dd></div>
        </dl>
        <p>{props.creature.model_notes}</p>
        {selectedIsCustom && <p className="user-authored-note">Private user-authored modelled profile. The reference below describes its original orientation source, not your edits.</p>}
        <a href={props.creature.source_url} target="_blank" rel="noreferrer">Open orientation reference</a>
      </details>
    </section>
  )
}
