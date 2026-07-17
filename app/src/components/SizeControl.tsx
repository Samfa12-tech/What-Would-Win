import type { Creature, NamedSize, Scenario, SizeConfig } from '../types'
import { describeSize, NAMED_SIZE_MASS_KG } from '../simulation/engine'

interface SizeControlProps {
  creature: Creature
  value: SizeConfig
  scalingMode: Scenario['scalingMode']
  onChange: (value: SizeConfig) => void
}

const namedSizes = Object.keys(NAMED_SIZE_MASS_KG) as NamedSize[]

export function SizeControl({ creature, value, scalingMode, onChange }: SizeControlProps) {
  return (
    <div className="field-stack size-control">
      <label>
        <span>Size method</span>
        <select
          value={value.method}
          onChange={(event) => {
            const method = event.target.value as SizeConfig['method']
            if (method === 'normal') onChange({ method: 'normal', value: 'normal' })
            if (method === 'named') onChange({ method: 'named', value: 'horse' })
            if (method === 'exact') onChange({ method: 'exact', value: creature.representative_peak_mass_kg })
            if (method === 'relative') onChange({ method: 'relative', value: 1 })
          }}
        >
          <option value="normal">Natural size</option>
          <option value="named">Named size preset</option>
          <option value="exact">Exact target mass</option>
          <option value="relative">Relative linear scale</option>
        </select>
      </label>

      {value.method === 'named' && (
        <label>
          <span>Target size</span>
          <select value={value.value} onChange={(event) => onChange({ method: 'named', value: event.target.value as NamedSize })}>
            {namedSizes.map((size) => (
              <option key={size} value={size}>
                {size[0].toUpperCase() + size.slice(1)}-sized ({NAMED_SIZE_MASS_KG[size].toLocaleString('en-AU')} kg)
              </option>
            ))}
          </select>
        </label>
      )}

      {value.method === 'exact' && (
        <label>
          <span>Target mass (kg)</span>
          <input
            type="number"
            min="0.000001"
            max="1000000000000"
            step="any"
            value={value.value}
            onChange={(event) => onChange({ method: 'exact', value: Math.max(0.000001, Number(event.target.value) || 0.000001) })}
          />
        </label>
      )}

      {value.method === 'relative' && (
        <label>
          <span>Linear scale multiplier</span>
          <input
            type="number"
            min="0.001"
            max="10000"
            step="0.01"
            value={value.value}
            onChange={(event) => onChange({ method: 'relative', value: Math.max(0.001, Number(event.target.value) || 0.001) })}
          />
        </label>
      )}

      <p className="field-note">{describeSize(creature, value, scalingMode)}</p>
    </div>
  )
}
