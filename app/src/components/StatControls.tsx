import type { Creature, StatOverrides } from '../types'

interface StatControlsProps {
  creature: Creature
  value: StatOverrides
  onChange: (value: StatOverrides) => void
  advanced?: boolean
}

const simpleFields: Array<[keyof StatOverrides, string]> = [
  ['aggression', 'Aggression'],
  ['intelligence', 'Intelligence'],
  ['coordination', 'Teamwork'],
]

const advancedFields: Array<[keyof StatOverrides, string]> = [
  ['attack', 'Attack'],
  ['defense', 'Defence'],
  ['durability', 'Durability'],
  ['agility', 'Agility'],
  ['stamina', 'Stamina'],
  ['morale', 'Morale'],
  ['armor', 'Armour'],
  ['multi_target', 'Area control'],
]

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function StatControls({ creature, value, onChange, advanced = false }: StatControlsProps) {
  const fields = advanced ? advancedFields : simpleFields
  return (
    <div className="slider-grid">
      {fields.map(([field, label]) => {
        const current = value[field] ?? creature[field]
        return (
          <label className="slider-field" key={field}>
            <span>
              {label}
              <output>{current}</output>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={current}
              onChange={(event) => onChange({ ...value, [field]: clamp(Number(event.target.value)) })}
            />
          </label>
        )
      })}
    </div>
  )
}
