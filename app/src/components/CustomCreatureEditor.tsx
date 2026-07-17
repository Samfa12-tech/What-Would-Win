import { useState } from 'react'
import {
  customCreatureWarnings,
  type SavedCustomCreature,
  validateCustomCreature,
} from '../customCreatures'
import type { Creature } from '../types'

interface CustomCreatureEditorProps {
  item: SavedCustomCreature
  onSave: (item: SavedCustomCreature) => void
  onCancel: () => void
}

const physicalFields: Array<{ field: keyof Creature; label: string; min: number; max: number; step: string }> = [
  { field: 'representative_peak_mass_kg', label: 'Representative peak mass (kg)', min: 0.000001, max: 1e12, step: 'any' },
  { field: 'body_length_m', label: 'Body length (m)', min: 0.000001, max: 1e7, step: 'any' },
  { field: 'shoulder_or_body_height_m', label: 'Body height (m)', min: 0.000001, max: 1e7, step: 'any' },
  { field: 'burst_speed_kph', label: 'Burst speed (km/h)', min: 0, max: 1e6, step: 'any' },
  { field: 'effective_reach_m', label: 'Effective reach (m)', min: 0.000001, max: 1e7, step: 'any' },
]

const normalizedFields: Array<{ field: keyof Creature; label: string }> = [
  { field: 'attack', label: 'Attack' },
  { field: 'defense', label: 'Defence' },
  { field: 'durability', label: 'Durability' },
  { field: 'agility', label: 'Agility' },
  { field: 'stamina', label: 'Stamina' },
  { field: 'intelligence', label: 'Intelligence' },
  { field: 'aggression', label: 'Aggression' },
  { field: 'coordination', label: 'Teamwork / coordination' },
  { field: 'morale', label: 'Morale' },
  { field: 'armor', label: 'Armour' },
  { field: 'multi_target', label: 'Area control' },
]

const capabilityFields: Array<{ field: keyof Creature; label: string }> = [
  { field: 'can_fly', label: 'Can fly' },
  { field: 'aquatic', label: 'Aquatic' },
  { field: 'venomous', label: 'Venomous' },
  { field: 'ranged', label: 'Ranged attacks' },
  { field: 'regenerates', label: 'Regenerates' },
  { field: 'undead_or_construct', label: 'Undead or construct' },
]

function listText(values: string[]): string {
  return values.join(', ')
}

function parseList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function CustomCreatureEditor({ item, onSave, onCancel }: CustomCreatureEditorProps) {
  const [draft, setDraft] = useState<SavedCustomCreature>(() => ({
    ...item,
    creature: {
      ...item.creature,
      habitats: [...item.creature.habitats],
      attack_modes: [...item.creature.attack_modes],
      traits: [...item.creature.traits],
    },
  }))
  const [errors, setErrors] = useState<string[]>([])
  const [listDrafts, setListDrafts] = useState({
    habitats: listText(item.creature.habitats),
    attack_modes: listText(item.creature.attack_modes),
    traits: listText(item.creature.traits),
  })
  const warnings = customCreatureWarnings(draft.creature)

  function updateCreature(field: keyof Creature, value: Creature[keyof Creature]) {
    setDraft((current) => ({
      ...current,
      creature: { ...current.creature, [field]: value },
    }))
    setErrors([])
  }

  function submit() {
    const validationErrors = validateCustomCreature(draft.creature)
    if (validationErrors.length) {
      setErrors(validationErrors)
      return
    }
    onSave({
      ...draft,
      updatedAt: new Date().toISOString(),
      creature: {
        ...draft.creature,
        name: draft.creature.name.trim(),
        category: draft.creature.category.trim(),
        icon: draft.creature.icon.trim(),
        model_notes: draft.creature.model_notes.trim(),
      },
    })
  }

  return (
    <section className="custom-editor" aria-labelledby="custom-editor-title" data-testid="custom-creature-editor">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">PRIVATE USER-AUTHORED PROFILE</p>
          <h2 id="custom-editor-title">Custom profile dossier</h2>
        </div>
        <button type="button" className="text-button" onClick={onCancel}>Cancel editing</button>
      </div>
      <p className="custom-editor-intro">
        This profile stays in this browser unless you explicitly export or share it. It is an authored assumption set, not verified creature data.
      </p>

      {errors.length > 0 && (
        <div className="error-banner" role="alert" data-testid="custom-validation-errors">
          <strong>Review the custom profile before saving.</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="custom-warning" role="status">
          <strong>Consistency review</strong>
          <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}

      <fieldset className="custom-fieldset">
        <legend>Identity and classification</legend>
        <div className="custom-form-grid">
          <label className="field-stack">
            <span>Profile name</span>
            <input data-testid="custom-name" value={draft.creature.name} maxLength={100} onChange={(event) => updateCreature('name', event.target.value)} />
          </label>
          <label className="field-stack">
            <span>Category</span>
            <input value={draft.creature.category} maxLength={100} onChange={(event) => updateCreature('category', event.target.value)} />
          </label>
          <label className="field-stack">
            <span>Kind</span>
            <select value={draft.creature.kind} onChange={(event) => updateCreature('kind', event.target.value as Creature['kind'])}>
              <option value="animal">Living animal</option>
              <option value="extinct">Extinct animal</option>
              <option value="fantasy">Fantasy or mythology</option>
              <option value="human">Generic human</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Icon</span>
            <input value={draft.creature.icon} maxLength={8} onChange={(event) => updateCreature('icon', event.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="custom-fieldset">
        <legend>Physical measurements</legend>
        <div className="custom-form-grid physical-grid">
          {physicalFields.map(({ field, label, min, max, step }) => (
            <label className="field-stack" key={field}>
              <span>{label}</span>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={Number.isFinite(draft.creature[field] as number) ? draft.creature[field] as number : ''}
                onChange={(event) => updateCreature(field, event.target.value === '' ? Number.NaN : Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="custom-fieldset">
        <legend>Normalized model scores</legend>
        <p className="field-note">Whole numbers from 0 to 100. Values are saved as the custom baseline, before scenario-specific overrides.</p>
        <div className="custom-form-grid stat-editor-grid">
          {normalizedFields.map(({ field, label }) => (
            <label className="field-stack" key={field}>
              <span>{label}</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Number.isFinite(draft.creature[field] as number) ? draft.creature[field] as number : ''}
                onChange={(event) => updateCreature(field, event.target.value === '' ? Number.NaN : Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="custom-fieldset">
        <legend>Capabilities and model labels</legend>
        <div className="custom-toggle-grid">
          {capabilityFields.map(({ field, label }) => (
            <label className="toggle-field" key={field}>
              <input type="checkbox" checked={draft.creature[field] as boolean} onChange={(event) => updateCreature(field, event.target.checked)} />
              <span><strong>{label}</strong></span>
            </label>
          ))}
        </div>
        <div className="custom-form-grid custom-list-grid">
          <label className="field-stack">
            <span>Habitats (comma separated)</span>
            <input value={listDrafts.habitats} onChange={(event) => {
              setListDrafts((current) => ({ ...current, habitats: event.target.value }))
              updateCreature('habitats', parseList(event.target.value))
            }} />
          </label>
          <label className="field-stack">
            <span>Attack modes (comma separated)</span>
            <input value={listDrafts.attack_modes} onChange={(event) => {
              setListDrafts((current) => ({ ...current, attack_modes: event.target.value }))
              updateCreature('attack_modes', parseList(event.target.value))
            }} />
          </label>
          <label className="field-stack">
            <span>Traits (comma separated)</span>
            <input value={listDrafts.traits} onChange={(event) => {
              setListDrafts((current) => ({ ...current, traits: event.target.value }))
              updateCreature('traits', parseList(event.target.value))
            }} />
          </label>
        </div>
        <label className="field-stack custom-notes-field">
          <span>Model notes and assumptions</span>
          <textarea value={draft.creature.model_notes} maxLength={2000} rows={4} onChange={(event) => updateCreature('model_notes', event.target.value)} />
        </label>
      </fieldset>

      <div className="custom-editor-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Discard changes</button>
        <button type="button" className="primary-button" data-testid="save-custom-creature" onClick={submit}>Save custom profile locally</button>
      </div>
    </section>
  )
}
