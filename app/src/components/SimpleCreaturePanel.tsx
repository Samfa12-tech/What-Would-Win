import { useState } from 'react'
import { NAMED_SIZE_MASS_KG } from '../simulation/engine'
import type { Creature, NamedSize, SizeConfig } from '../types'

interface SimpleCreaturePanelProps {
  side: 'solo' | 'group'
  eyebrow: string
  creature: Creature
  creatures: Creature[]
  selectedId: string
  size: SizeConfig
  quantity?: string
  onCreatureChange: (id: string) => void
  onSizeChange: (size: SizeConfig) => void
  onQuantityChange?: (quantity: string) => void
}

const namedSizes = Object.keys(NAMED_SIZE_MASS_KG) as NamedSize[]

const identityAssets: Partial<Record<string, string>> = {
  'mallard-duck': './assets/simple-mode/mallard-mark.png',
  horse: './assets/simple-mode/horse-mark.png',
}

function sizeValue(size: SizeConfig): string {
  if (size.method === 'normal') return 'normal'
  if (size.method === 'named') return `named:${size.value}`
  return 'custom'
}

function targetMass(creature: Creature, size: SizeConfig): number {
  if (size.method === 'normal') return creature.representative_peak_mass_kg
  if (size.method === 'named') return NAMED_SIZE_MASS_KG[size.value]
  if (size.method === 'exact') return size.value
  return creature.representative_peak_mass_kg * size.value ** 3
}

function targetLength(creature: Creature, size: SizeConfig): number {
  if (size.method === 'relative') return creature.body_length_m * size.value
  const massRatio = targetMass(creature, size) / creature.representative_peak_mass_kg
  return creature.body_length_m * Math.cbrt(Math.max(0.000001, massRatio))
}

function sizeName(creature: Creature, size: SizeConfig): string {
  if (size.method === 'normal') return 'Natural size'
  if (size.method === 'named') return `${size.value[0].toUpperCase()}${size.value.slice(1)}-sized`
  return `Custom size · ${targetMass(creature, size).toLocaleString('en-AU', { maximumFractionDigits: 2 })} kg`
}

function traitSummary(creature: Creature): string {
  const readable = creature.traits.slice(0, 3).map((trait) => trait.replaceAll('-', ' '))
  return readable.length ? readable.join(' · ') : creature.category.replaceAll('-', ' ')
}

export function SimpleCreaturePanel({
  side,
  eyebrow,
  creature,
  creatures,
  selectedId,
  size,
  quantity,
  onCreatureChange,
  onSizeChange,
  onQuantityChange,
}: SimpleCreaturePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const asset = identityAssets[creature.id]
  const resolvedMass = targetMass(creature, size)
  const resolvedLength = targetLength(creature, size)
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('en-AU')
  const matchesQuery = (item: Creature) => !normalizedQuery || [
    item.name,
    item.category,
    item.kind,
    ...item.traits,
  ].some((value) => value.toLocaleLowerCase('en-AU').includes(normalizedQuery))
  const matchingCreatures = creatures.filter(matchesQuery)
  const visibleCreatures = creatures.filter((item) => matchesQuery(item) || item.id === selectedId)

  return (
    <section className={`simple-contender simple-contender-${side}`} aria-labelledby={`simple-${side}-heading`}>
      <p className="eyebrow" id={`simple-${side}-heading`}>{eyebrow}</p>

      <label className="simple-creature-search">
        <span>Find creature</span>
        <input
          type="search"
          data-testid={`${side}-simple-creature-search`}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search name or type…"
          aria-describedby={`simple-${side}-search-status`}
        />
        <small className="visually-hidden" id={`simple-${side}-search-status`} aria-live="polite">
          {normalizedQuery ? `${matchingCreatures.length} matching creature${matchingCreatures.length === 1 ? '' : 's'}. Open the contestant list to choose one.` : `${creatures.length} creatures available.`}
        </small>
      </label>

      <label className="simple-select-field">
        <span className="visually-hidden">{eyebrow} contestant</span>
        <span className="simple-select-display">
          {asset && <img src={asset} alt="" width="54" height="54" />}
          <select
            aria-label={side === 'solo' ? 'The one contestant' : 'The many contestant'}
            data-testid={`${side}-creature-select`}
            value={selectedId}
            onChange={(event) => {
              onCreatureChange(event.target.value)
              setSearchQuery('')
            }}
          >
            {visibleCreatures.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </span>
      </label>

      {quantity !== undefined && onQuantityChange && (
        <label className="simple-quantity-field">
          <span>Quantity</span>
          <input
            aria-label="Quantity"
            inputMode="text"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            placeholder="100"
          />
          <small>Number of opponents</small>
        </label>
      )}

      <label className="simple-size-field">
        <span>Size</span>
        <span className={`simple-size-control${asset ? ' simple-size-control-with-asset' : ''}`}>
          {asset && <img src={asset} alt="" width="50" height="50" />}
          <span>
            <strong>{sizeName(creature, size)}</strong>
            <small>{size.method === 'normal' ? `The usual size for ${creature.name.toLocaleLowerCase('en-AU')}.` : `Scaled to about ${resolvedMass.toLocaleString('en-AU', { maximumFractionDigits: 1 })} kg.`}</small>
          </span>
          <select
            aria-label={`${eyebrow} size`}
            value={sizeValue(size)}
            onChange={(event) => {
              if (event.target.value === 'normal') onSizeChange({ method: 'normal', value: 'normal' })
              if (event.target.value.startsWith('named:')) onSizeChange({ method: 'named', value: event.target.value.slice(6) as NamedSize })
            }}
          >
            <option value="normal">Natural size</option>
            {namedSizes.map((named) => <option value={`named:${named}`} key={named}>{named[0].toUpperCase() + named.slice(1)}-sized</option>)}
            {(size.method === 'exact' || size.method === 'relative') && <option value="custom">Custom size from Deep dive</option>}
          </select>
        </span>
      </label>

      <dl className="simple-profile-facts">
        <div><dt>Mass</dt><dd>{resolvedMass.toLocaleString('en-AU', { maximumFractionDigits: 1 })} kg</dd></div>
        <div><dt>Length</dt><dd>{resolvedLength.toLocaleString('en-AU', { maximumFractionDigits: 2 })} m</dd></div>
        <div><dt>Key traits</dt><dd>{traitSummary(creature)}</dd></div>
      </dl>
    </section>
  )
}
