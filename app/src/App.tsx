import { useMemo, useRef, useState } from 'react'
import creatureJson from './data/creatures.json'
import { CreaturePanel } from './components/CreaturePanel'
import { ResultPanel } from './components/ResultPanel'
import { StatControls } from './components/StatControls'
import { CustomCreatureEditor } from './components/CustomCreatureEditor'
import { MethodologyPanel } from './components/MethodologyPanel'
import {
  cloneAsCustom,
  cloneSavedItem,
  exportCustomCreature,
  importCustomCreature,
  isCustomCreature,
  loadCustomCreatures,
  saveCustomCreatures,
  type SavedCustomCreature,
} from './customCreatures'
import { defaultScenario, simulate, TRIALS_BY_DEPTH } from './simulation/engine'
import { buildShareUrl, decodeScenarioPayload } from './simulation/share'
import type { Creature, HistoryItem, HistoryStore, Scenario, SimulationResult, StatOverrides } from './types'
import { validateScenario } from './validation'
import { DATA_VERSION, MODEL_VERSION, SHARE_FORMAT_VERSION } from './version'
import { withMethodologyDefaults } from './scenarioDefaults'

const builtInCreatures = creatureJson as Creature[]
export const HISTORY_KEY = 'what-would-win-history-v1'
export const HISTORY_STORAGE_VERSION = 1
export const HISTORY_ITEM_FORMAT_VERSION = 1
const MAX_HISTORY_ITEMS = 12

const scalingModes: Array<{ value: Scenario['scalingMode']; title: string; description: string }> = [
  { value: 'strict', title: 'Strict biology', description: 'Square-cube-style structural stress can cripple extreme resizing.' },
  { value: 'functional', title: 'Functional scaling', description: 'Resized creatures remain healthy, with moderated allometric effects.' },
  { value: 'magical', title: 'Magical scaling', description: 'Function is preserved and power rises almost directly with mass.' },
]

const reportDepths: Array<{ value: Scenario['reportDepth']; title: string; description: string }> = [
  { value: 'verdict', title: 'Verdict only', description: 'Fast headline result and core metrics.' },
  { value: 'assumptions', title: 'Assumptions', description: 'Adds battle reconstruction and modelling limits.' },
  { value: 'transparent', title: 'Transparent', description: 'Adds factors, strengths, weaknesses and source context.' },
  { value: 'technical', title: 'Technical record', description: 'Maximum trials plus the full calculation ledger.' },
]

const terrainOptions = ['open', 'forest', 'urban', 'river', 'swamp', 'ocean', 'deep-ocean', 'mountain', 'snow', 'desert', 'cave', 'fortification']
const weatherOptions = ['clear', 'rain', 'storm', 'fog', 'snow', 'heat']

function mergeScenario(candidate: Scenario | null, creatures: Creature[] = builtInCreatures): Scenario {
  const base = defaultScenario(builtInCreatures)
  if (!candidate) return base
  const normalized = withMethodologyDefaults(candidate) as Scenario
  const validSolo = creatures.some((item) => item.id === normalized.soloId)
  const validGroup = creatures.some((item) => item.id === normalized.groupId)
  return {
    ...base,
    ...normalized,
    soloId: validSolo ? normalized.soloId : base.soloId,
    groupId: validGroup ? normalized.groupId : base.groupId,
    soloSize: normalized.soloSize ?? base.soloSize,
    groupSize: normalized.groupSize ?? base.groupSize,
    soloOverrides: normalized.soloOverrides ?? {},
    groupOverrides: normalized.groupOverrides ?? {},
  }
}

interface InitialAppState {
  scenario: Scenario
  savedCustoms: SavedCustomCreature[]
  sharedCustoms: Creature[]
  warning: string
  history: HistoryItem[]
  historyWarning: string
}

export interface HistoryLoadResult {
  items: HistoryItem[]
  warning: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const allowed = new Set(keys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function validHistoryText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200
}

function parseHistoryItem(value: unknown, legacy: boolean): HistoryItem | null {
  if (!isRecord(value)) return null
  const legacyKeys = ['id', 'createdAt', 'scenario', 'winnerName', 'soloName', 'groupName', 'soloWinProbability']
  const currentKeys = ['formatVersion', 'modelVersion', 'dataVersion', ...legacyKeys]
  if (!hasOnlyKeys(value, legacy ? legacyKeys : currentKeys)) return null
  const previousVersion = value.modelVersion === '0.1.0' && value.dataVersion === '0.1.0'
  if (!legacy && !previousVersion && (
    value.formatVersion !== HISTORY_ITEM_FORMAT_VERSION
    || value.modelVersion !== MODEL_VERSION
    || value.dataVersion !== DATA_VERSION
  )) return null
  const migratedScenario = withMethodologyDefaults(value.scenario) as Scenario
  if (
    !validHistoryText(value.id)
    || typeof value.createdAt !== 'string'
    || !Number.isFinite(Date.parse(value.createdAt))
    || !validHistoryText(value.winnerName)
    || !validHistoryText(value.soloName)
    || !validHistoryText(value.groupName)
    || typeof value.soloWinProbability !== 'number'
    || !Number.isFinite(value.soloWinProbability)
    || value.soloWinProbability < 0
    || value.soloWinProbability > 1
    || !validateScenario(migratedScenario).valid
  ) return null

  return {
    formatVersion: HISTORY_ITEM_FORMAT_VERSION,
    modelVersion: MODEL_VERSION,
    dataVersion: DATA_VERSION,
    id: value.id,
    createdAt: value.createdAt,
    scenario: migratedScenario,
    winnerName: value.winnerName,
    soloName: value.soloName,
    groupName: value.groupName,
    soloWinProbability: value.soloWinProbability,
  }
}

function historyStore(items: HistoryItem[]): HistoryStore {
  return { storageVersion: HISTORY_STORAGE_VERSION, items }
}

export function loadHistory(storage: Storage): HistoryLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(HISTORY_KEY)
  } catch {
    return { items: [], warning: 'Recent history could not be read from this browser.' }
  }
  if (!raw) return { items: [], warning: '' }

  try {
    const parsed: unknown = JSON.parse(raw)
    const legacy = Array.isArray(parsed)
    if (!legacy && (
      !isRecord(parsed)
      || !hasOnlyKeys(parsed, ['storageVersion', 'items'])
      || parsed.storageVersion !== HISTORY_STORAGE_VERSION
      || !Array.isArray(parsed.items)
    )) {
      return { items: [], warning: 'Recent history uses an incompatible or damaged storage format. The stored data was left untouched.' }
    }

    const candidates = (legacy ? parsed : (parsed as { items: unknown[] }).items)
    const items: HistoryItem[] = []
    const ids = new Set<string>()
    let ignored = Math.max(0, candidates.length - MAX_HISTORY_ITEMS)
    let upgradedVersionedItems = 0
    for (const candidate of candidates.slice(0, MAX_HISTORY_ITEMS)) {
      const item = parseHistoryItem(candidate, legacy)
      if (!item || ids.has(item.id)) {
        ignored += 1
        continue
      }
      ids.add(item.id)
      items.push(item)
      if (!legacy && isRecord(candidate) && candidate.modelVersion === '0.1.0' && candidate.dataVersion === '0.1.0') {
        upgradedVersionedItems += 1
      }
    }

    let migrationWarning = ''
    if (legacy && ignored === 0) {
      try {
        storage.setItem(HISTORY_KEY, JSON.stringify(historyStore(items)))
        migrationWarning = 'Legacy recent history was migrated to the current version.'
      } catch {
        migrationWarning = 'Legacy recent history was loaded but could not be migrated in this browser.'
      }
    } else if (upgradedVersionedItems > 0 && ignored === 0) {
      try {
        storage.setItem(HISTORY_KEY, JSON.stringify(historyStore(items)))
        migrationWarning = `${upgradedVersionedItems} previous-version history ${upgradedVersionedItems === 1 ? 'entry was' : 'entries were'} migrated and will be recalculated when restored.`
      } catch {
        migrationWarning = 'Previous-version history was loaded but could not be migrated in this browser.'
      }
    }
    const ignoredWarning = ignored
      ? `${ignored} invalid, incompatible or duplicate history ${ignored === 1 ? 'entry was' : 'entries were'} ignored. The stored data was left untouched.`
      : ''
    return { items, warning: [migrationWarning, ignoredWarning].filter(Boolean).join(' ') }
  } catch {
    return { items: [], warning: 'Recent history contains invalid JSON. The stored data was left untouched.' }
  }
}

function saveHistoryStore(storage: Storage, items: HistoryItem[]): void {
  storage.setItem(HISTORY_KEY, JSON.stringify(historyStore(items)))
}

function unavailableHistoryReferences(item: HistoryItem, creatures: Creature[]): string[] {
  const availableIds = new Set(creatures.map((creature) => creature.id))
  return [...new Set([item.scenario.soloId, item.scenario.groupId].filter((id) => !availableIds.has(id)))]
}

function initialAppState(): InitialAppState {
  if (typeof window === 'undefined') {
    return {
      scenario: defaultScenario(builtInCreatures),
      savedCustoms: [],
      sharedCustoms: [],
      warning: '',
      history: [],
      historyWarning: '',
    }
  }
  const loaded = loadCustomCreatures(window.localStorage)
  const loadedHistory = loadHistory(window.localStorage)
  const encoded = new URLSearchParams(window.location.search).get('s')
  const decoded = encoded ? decodeScenarioPayload(encoded) : null
  const decodedSharedCustoms = decoded?.ok ? decoded.payload.customCreatures ?? [] : []
  const savedIds = new Set(loaded.items.map((item) => item.creature.id))
  const sharedCustoms = decodedSharedCustoms.filter((creature) => !savedIds.has(creature.id))
  const ignoredSharedCount = decodedSharedCustoms.length - sharedCustoms.length
  const creatures = [
    ...builtInCreatures,
    ...loaded.items.map((item) => item.creature),
    ...sharedCustoms,
  ]
  const shareWarning = decoded && !decoded.ok
    ? decoded.message
    : decoded?.status === 'migrated-v2'
      ? 'This version 2 share link was migrated to the current debate-method format and recalculated.'
    : decoded?.status === 'migrated-v1'
      ? 'This version 1 share link was migrated to the compact current format.'
      : decoded?.status === 'migrated-legacy'
        ? 'This legacy share link was migrated to the current scenario format.'
        : ''
  const collisionWarning = ignoredSharedCount
    ? 'A shared custom profile was ignored because a saved local profile uses the same ID.'
    : ''
  const unavailableHistoryCount = loadedHistory.items.filter((item) => unavailableHistoryReferences(item, creatures).length > 0).length
  const unavailableHistoryWarning = unavailableHistoryCount
    ? `${unavailableHistoryCount} recent history ${unavailableHistoryCount === 1 ? 'entry references' : 'entries reference'} a profile that is no longer available. Import the missing custom profile to restore it.`
    : ''
  return {
    scenario: mergeScenario(decoded?.ok ? decoded.payload.scenario : null, creatures),
    savedCustoms: loaded.items,
    sharedCustoms,
    warning: [loaded.warning, shareWarning, collisionWarning].filter(Boolean).join(' '),
    history: loadedHistory.items,
    historyWarning: [loadedHistory.warning, unavailableHistoryWarning].filter(Boolean).join(' '),
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function presetOverrides(creature: Creature, preset: string): StatOverrides {
  if (preset === 'baseline') return {}
  if (preset === 'enraged') {
    return {
      aggression: 100,
      morale: clamp(creature.morale + 18),
      attack: clamp(creature.attack + 8),
      intelligence: clamp(creature.intelligence - 8),
      stamina: clamp(creature.stamina - 5),
    }
  }
  if (preset === 'disciplined') {
    return {
      intelligence: clamp(Math.max(82, creature.intelligence + 12)),
      coordination: clamp(Math.max(88, creature.coordination + 18)),
      morale: clamp(Math.max(82, creature.morale + 10)),
      aggression: clamp(creature.aggression - 5),
    }
  }
  if (preset === 'exhausted') {
    return {
      stamina: 25,
      agility: clamp(creature.agility - 22),
      morale: clamp(creature.morale - 18),
      attack: clamp(creature.attack - 10),
    }
  }
  if (preset === 'armored') {
    return {
      armor: clamp(Math.max(82, creature.armor + 35)),
      defense: clamp(creature.defense + 16),
      agility: clamp(creature.agility - 12),
      stamina: clamp(creature.stamina - 8),
    }
  }
  return {}
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 5): number {
  const words = text.split(/\s+/)
  let line = ''
  let lineNumber = 0
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineNumber * lineHeight)
      line = word
      lineNumber += 1
      if (lineNumber >= maxLines - 1) break
    } else {
      line = test
    }
  }
  if (lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight)
  return y + (lineNumber + 1) * lineHeight
}

function App() {
  const starting = useMemo(initialAppState, [])
  const startingScenario = starting.scenario
  const [savedCustoms, setSavedCustoms] = useState<SavedCustomCreature[]>(starting.savedCustoms)
  const [sharedCustoms] = useState<Creature[]>(starting.sharedCustoms)
  const [editingCustom, setEditingCustom] = useState<{ item: SavedCustomCreature; side: 'solo' | 'group' } | null>(null)
  const [customError, setCustomError] = useState(starting.warning)
  const [customStatus, setCustomStatus] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const creatures = useMemo(() => {
    const savedIds = new Set(savedCustoms.map((item) => item.creature.id))
    return [
      ...builtInCreatures,
      ...savedCustoms.map((item) => item.creature),
      ...sharedCustoms.filter((creature) => !savedIds.has(creature.id)),
    ]
  }, [savedCustoms, sharedCustoms])
  const [scenario, setScenario] = useState<Scenario>(startingScenario)
  const [simulatedScenario, setSimulatedScenario] = useState<Scenario>(startingScenario)
  const [result, setResult] = useState<SimulationResult>(() => simulate(creatures, startingScenario))
  const [error, setError] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>(starting.history)
  const [historyWarning, setHistoryWarning] = useState(starting.historyWarning)

  const solo = creatures.find((item) => item.id === scenario.soloId) ?? creatures[0]
  const group = creatures.find((item) => item.id === scenario.groupId) ?? creatures[1]
  const simulatedSolo = creatures.find((item) => item.id === simulatedScenario.soloId) ?? creatures[0]
  const simulatedGroup = creatures.find((item) => item.id === simulatedScenario.groupId) ?? creatures[1]
  const isDirty = JSON.stringify(scenario) !== JSON.stringify(simulatedScenario)

  function update<K extends keyof Scenario>(key: K, value: Scenario[K]) {
    setScenario((current) => ({ ...current, [key]: value }))
  }

  function selectCreature(side: 'solo' | 'group', id: string) {
    setScenario((current) => side === 'solo'
      ? { ...current, soloId: id, soloOverrides: {} }
      : { ...current, groupId: id, groupOverrides: {} })
  }

  function startClone(side: 'solo' | 'group', creature: Creature) {
    setEditingCustom({ item: cloneAsCustom(creature), side })
    setCustomError('')
    setCustomStatus('Cloning copies the baseline profile. Temporary size and stat overrides are not included.')
  }

  function startEdit(side: 'solo' | 'group', creature: Creature) {
    const saved = savedCustoms.find((item) => item.creature.id === creature.id)
    if (!saved) {
      setCustomError('This shared custom profile is temporary. Clone it to create an editable local copy.')
      return
    }
    setEditingCustom({ item: cloneSavedItem(saved), side })
    setCustomError('')
    setCustomStatus('')
  }

  function saveEditedCustom(item: SavedCustomCreature) {
    const index = savedCustoms.findIndex((saved) => saved.creature.id === item.creature.id)
    const nextItems = index >= 0
      ? savedCustoms.map((saved, itemIndex) => itemIndex === index ? item : saved)
      : [...savedCustoms, item]
    try {
      saveCustomCreatures(window.localStorage, nextItems)
      setSavedCustoms(nextItems)
      if (editingCustom) selectCreature(editingCustom.side, item.creature.id)
      setEditingCustom(null)
      setCustomError('')
      setCustomStatus(`${item.creature.name} was saved privately in this browser.`)
    } catch (caught) {
      setCustomError(caught instanceof Error ? caught.message : 'The custom profile could not be saved.')
    }
  }

  function deleteCustom(creature: Creature) {
    if (!window.confirm(`Delete the local custom profile “${creature.name}”? This cannot be recovered unless it was exported.`)) return
    const nextItems = savedCustoms.filter((item) => item.creature.id !== creature.id)
    try {
      saveCustomCreatures(window.localStorage, nextItems)
      setSavedCustoms(nextItems)
      setEditingCustom((current) => current?.item.creature.id === creature.id ? null : current)
      const defaults = defaultScenario(builtInCreatures)
      const nextScenario: Scenario = {
        ...scenario,
        soloId: scenario.soloId === creature.id ? defaults.soloId : scenario.soloId,
        groupId: scenario.groupId === creature.id ? defaults.groupId : scenario.groupId,
        soloOverrides: scenario.soloId === creature.id ? {} : scenario.soloOverrides,
        groupOverrides: scenario.groupId === creature.id ? {} : scenario.groupOverrides,
      }
      if (simulatedScenario.soloId === creature.id || simulatedScenario.groupId === creature.id) run(nextScenario, false)
      else setScenario(nextScenario)
      setCustomError('')
      setCustomStatus(`${creature.name} was deleted from this browser.`)
    } catch (caught) {
      setCustomError(caught instanceof Error ? caught.message : 'The custom profile could not be deleted.')
    }
  }

  function customItemForExport(creature: Creature): SavedCustomCreature {
    return savedCustoms.find((item) => item.creature.id === creature.id) ?? {
      creature,
      baseCreatureId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  function downloadCustom(creature: Creature) {
    try {
      const payload = exportCustomCreature(customItemForExport(creature))
      const safeName = creature.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-creature'
      downloadBlob(`${safeName}.what-would-win.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
      setCustomError('')
      setCustomStatus(`${creature.name} was exported as JSON.`)
    } catch (caught) {
      setCustomError(caught instanceof Error ? caught.message : 'The custom profile could not be exported.')
    }
  }

  async function importCustomFile(file: File) {
    try {
      if (file.size > 1_000_000) throw new Error('Custom profile imports must be smaller than 1 MB.')
      const imported = importCustomCreature(await file.text())
      if (savedCustoms.some((item) => item.creature.id === imported.creature.id) || sharedCustoms.some((creature) => creature.id === imported.creature.id)) {
        throw new Error('A custom profile with this ID is already available. Delete it or import a differently identified export.')
      }
      const nextItems = [...savedCustoms, imported]
      saveCustomCreatures(window.localStorage, nextItems)
      setSavedCustoms(nextItems)
      selectCreature('solo', imported.creature.id)
      setCustomError('')
      setCustomStatus(`${imported.creature.name} was imported, saved locally and selected as The one.`)
    } catch (caught) {
      setCustomError(caught instanceof Error ? caught.message : 'The custom profile could not be imported.')
    }
  }

  function saveHistory(nextScenario: Scenario, nextResult: SimulationResult) {
    const nextItem: HistoryItem = {
      formatVersion: HISTORY_ITEM_FORMAT_VERSION,
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      scenario: nextScenario,
      winnerName: nextResult.winnerName,
      soloName: creatures.find((item) => item.id === nextScenario.soloId)?.name ?? nextScenario.soloId,
      groupName: creatures.find((item) => item.id === nextScenario.groupId)?.name ?? nextScenario.groupId,
      soloWinProbability: nextResult.soloWinProbability,
    }
    const nextHistory = [nextItem, ...history].slice(0, MAX_HISTORY_ITEMS)
    setHistory(nextHistory)
    try {
      saveHistoryStore(localStorage, nextHistory)
      setHistoryWarning('')
    } catch {
      setHistoryWarning('The simulation ran, but recent history could not be saved in this browser.')
    }
  }

  function run(nextScenario = scenario, recordHistory = true) {
    try {
      const nextResult = simulate(creatures, nextScenario)
      setResult(nextResult)
      setScenario(nextScenario)
      setSimulatedScenario(nextScenario)
      setError('')
      setShareStatus('')
      if (recordHistory) saveHistory(nextScenario, nextResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The simulation could not be completed.')
    }
  }

  function reroll() {
    run({ ...scenario, seed: (scenario.seed + 1) >>> 0 })
  }

  function restoreHistory(item: HistoryItem) {
    const unavailable = unavailableHistoryReferences(item, creatures)
    if (unavailable.length > 0) {
      setHistoryWarning('This history entry cannot be restored because a referenced profile is no longer available. Import the missing custom profile and try again.')
      return
    }
    run(mergeScenario(item.scenario, creatures), false)
    setHistoryWarning('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function copyShareLink() {
    const referencedCustoms = [simulatedSolo, simulatedGroup].filter(isCustomCreature)
    const url = buildShareUrl(simulatedScenario, referencedCustoms)
    try {
      await navigator.clipboard.writeText(url)
      window.history.replaceState({}, '', url)
      setShareStatus('Share link copied.')
    } catch {
      setShareStatus('Copy was blocked; the share URL is now in the address bar.')
      window.history.replaceState({}, '', url)
    }
  }

  function downloadResultJson() {
    const payload = {
      app: 'What Would Win',
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      shareFormatVersion: SHARE_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      scenario: simulatedScenario,
      contestants: { solo: simulatedSolo, group: simulatedGroup },
      customCreatures: [simulatedSolo, simulatedGroup].filter(isCustomCreature),
      result,
    }
    downloadBlob('what-would-win-result.json', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  }

  function downloadResultImage() {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#0b1220'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#c9a86a'
    context.fillRect(0, 0, 18, canvas.height)
    context.font = '700 24px system-ui, sans-serif'
    context.fillText('WHAT WOULD WIN · THEORETICAL CONFLICT ANALYSIS', 70, 72)
    context.fillStyle = '#f8fafc'
    context.font = '800 54px system-ui, sans-serif'
    const matchup = `${simulatedSolo.name} vs ${simulatedScenario.groupQuantity} × ${simulatedGroup.name}`
    wrapCanvasText(context, matchup, 70, 145, 1060, 64, 2)
    context.fillStyle = '#c9a86a'
    context.font = '800 76px system-ui, sans-serif'
    context.fillText(result.winnerName, 70, 320)
    context.fillStyle = '#e5e7eb'
    context.font = '500 29px system-ui, sans-serif'
    wrapCanvasText(context, result.verdict, 70, 370, 1010, 40, 2)

    context.fillStyle = '#172033'
    context.fillRect(70, 470, 1060, 92)
    context.fillStyle = '#f8fafc'
    context.font = '700 29px system-ui, sans-serif'
    context.fillText(`Duration: ${result.estimatedDuration}`, 100, 525)
    context.fillText(`50/50 force: ${result.coinFlipQuantity}`, 540, 525)
    context.fillStyle = '#94a3b8'
    context.font = '500 19px system-ui, sans-serif'
    context.fillText('Entertainment model · peak-adult profiles · no graphic injury simulation', 70, 602)

    canvas.toBlob((blob) => {
      if (blob) downloadBlob('what-would-win-result.png', blob)
    }, 'image/png')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-mark" aria-hidden="true">WWW</div>
        <div>
          <p className="eyebrow">THEORETICAL CONFLICT ANALYSIS UNIT</p>
          <h1>What Would Win</h1>
          <p className="hero-copy">A mock-serious, textual simulator for one creature versus an effectively unlimited opposing force.</p>
        </div>
        <div className="header-meta">
          <span>134-profile database</span>
          <span>1 vs X engine</span>
          <span>Zero graphic violence</span>
        </div>
      </header>

      <main>
        <div className="method-banner">
          <strong>Interpretation rule:</strong> real animals use a representative high-end adult profile. Fantasy entries are explicit design assumptions. The result is a transparent entertainment model, not a scientific prediction or animal-welfare guide.
        </div>

        <MethodologyPanel />

        <section className="custom-profile-bar" aria-label="Custom profile tools">
          <div>
            <strong>Private custom profiles</strong>
            <span>Clone a selected dossier, edit its assumptions and save it only in this browser.</span>
          </div>
          <button type="button" className="secondary-button" data-testid="import-custom-creature" onClick={() => importInputRef.current?.click()}>Import custom JSON</button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="Choose custom profile JSON to import"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importCustomFile(file)
              event.target.value = ''
            }}
          />
        </section>
        {customError && <div className="error-banner custom-message" role="alert">{customError}</div>}
        {customStatus && <div className="custom-status custom-message" role="status">{customStatus}</div>}

        <section className="matchup-grid" aria-label="Contestant selection">
          <CreaturePanel
            title="The one"
            subtitle="SOLO PROFILE · QUANTITY FIXED AT 1"
            creature={solo}
            creatures={creatures}
            selectedId={scenario.soloId}
            size={scenario.soloSize}
            scalingMode={scenario.scalingMode}
            overrides={scenario.soloOverrides}
            onCreatureChange={(id) => selectCreature('solo', id)}
            onSizeChange={(size) => update('soloSize', size)}
            onOverridesChange={(value) => update('soloOverrides', value)}
            onPresetApply={(preset) => update('soloOverrides', presetOverrides(solo, preset))}
            onCloneCreature={() => startClone('solo', solo)}
            onEditCreature={() => startEdit('solo', solo)}
            onDeleteCreature={() => deleteCustom(solo)}
            onExportCreature={() => downloadCustom(solo)}
            customIsSaved={savedCustoms.some((item) => item.creature.id === solo.id)}
          />

          <div className="versus-mark" aria-hidden="true"><span>VS</span></div>

          <CreaturePanel
            title="The many"
            subtitle="GROUP PROFILE · USER-DEFINED QUANTITY"
            creature={group}
            creatures={creatures}
            selectedId={scenario.groupId}
            size={scenario.groupSize}
            scalingMode={scenario.scalingMode}
            overrides={scenario.groupOverrides}
            quantity={scenario.groupQuantity}
            onCreatureChange={(id) => selectCreature('group', id)}
            onSizeChange={(size) => update('groupSize', size)}
            onOverridesChange={(value) => update('groupOverrides', value)}
            onPresetApply={(preset) => update('groupOverrides', presetOverrides(group, preset))}
            onQuantityChange={(quantity) => update('groupQuantity', quantity)}
            onCloneCreature={() => startClone('group', group)}
            onEditCreature={() => startEdit('group', group)}
            onDeleteCreature={() => deleteCustom(group)}
            onExportCreature={() => downloadCustom(group)}
            customIsSaved={savedCustoms.some((item) => item.creature.id === group.id)}
          />
        </section>

        {editingCustom && (
          <CustomCreatureEditor
            key={editingCustom.item.creature.id}
            item={editingCustom.item}
            onSave={saveEditedCustom}
            onCancel={() => setEditingCustom(null)}
          />
        )}

        <section className="control-deck">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MODEL CONFIGURATION</p>
              <h2>Choose the laws of the argument</h2>
            </div>
            <p>Simple controls stay visible. The advanced dossier contains tactical variables and every normalized combat statistic.</p>
          </div>

          <fieldset className="choice-fieldset">
            <legend>Size physics</legend>
            <div className="choice-card-grid three-up">
              {scalingModes.map((mode) => (
                <label className={`choice-card ${scenario.scalingMode === mode.value ? 'selected' : ''}`} key={mode.value}>
                  <input type="radio" name="scaling-mode" value={mode.value} checked={scenario.scalingMode === mode.value} onChange={() => update('scalingMode', mode.value)} />
                  <strong>{mode.title}</strong>
                  <span>{mode.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="environment-grid">
            <label className="field-stack">
              <span>Terrain</span>
              <select value={scenario.terrain} onChange={(event) => update('terrain', event.target.value)}>
                {terrainOptions.map((option) => <option key={option} value={option}>{option.replace('-', ' ')}</option>)}
              </select>
            </label>
            <label className="field-stack">
              <span>Weather</span>
              <select value={scenario.weather} onChange={(event) => update('weather', event.target.value)}>
                {weatherOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="field-stack">
              <span>Starting distance (m)</span>
              <input type="number" min="0" max="100000" value={scenario.startingDistanceM} onChange={(event) => update('startingDistanceM', Math.max(0, Number(event.target.value) || 0))} />
            </label>
          </div>

          <fieldset className="choice-fieldset">
            <legend>Rules of engagement</legend>
            <div className="environment-grid">
              <label className="field-stack">
                <span>Win condition</span>
                <select value={scenario.winCondition} onChange={(event) => update('winCondition', event.target.value as Scenario['winCondition'])}>
                  <option value="incapacitation">Incapacitation</option>
                  <option value="death">Death (abstract)</option>
                  <option value="retreat">Retreat / rout</option>
                </select>
              </label>
              <label className="field-stack">
                <span>{solo.name} mindset</span>
                <select value={scenario.soloMindset} onChange={(event) => update('soloMindset', event.target.value as Scenario['soloMindset'])}>
                  <option value="natural">Natural / in character</option>
                  <option value="committed">Committed</option>
                  <option value="bloodlusted">Bloodlusted / optimal</option>
                </select>
              </label>
              <label className="field-stack">
                <span>{group.name} mindset</span>
                <select value={scenario.groupMindset} onChange={(event) => update('groupMindset', event.target.value as Scenario['groupMindset'])}>
                  <option value="natural">Natural / in character</option>
                  <option value="committed">Committed</option>
                  <option value="bloodlusted">Bloodlusted / optimal</option>
                </select>
              </label>
            </div>
            <p className="field-help">“Bloodlusted” means efficient, optimal use of abilities—not a berserker rage.</p>
          </fieldset>

          <fieldset className="choice-fieldset">
            <legend>Report depth and simulation effort</legend>
            <div className="choice-card-grid four-up">
              {reportDepths.map((depth) => (
                <label className={`choice-card ${scenario.reportDepth === depth.value ? 'selected' : ''}`} key={depth.value}>
                  <input type="radio" name="report-depth" value={depth.value} checked={scenario.reportDepth === depth.value} onChange={() => update('reportDepth', depth.value)} />
                  <strong>{depth.title}</strong>
                  <span>{depth.description}</span>
                  <small>{TRIALS_BY_DEPTH[depth.value].toLocaleString('en-AU')} trials</small>
                </label>
              ))}
            </div>
          </fieldset>

          <details className="advanced-dossier">
            <summary>
              <span>Advanced dossier</span>
              <small>Knowledge, geometry, specimens, group doctrine and all editable stats</small>
            </summary>

            <div className="advanced-battlefield-grid">
              <label className="field-stack">
                <span>Preparation time (minutes)</span>
                <input type="number" min="0" max="1000000" value={scenario.preparationMinutes} onChange={(event) => update('preparationMinutes', Math.max(0, Number(event.target.value) || 0))} />
              </label>
              <label className="field-stack">
                <span>Prior knowledge</span>
                <select value={scenario.priorKnowledge} onChange={(event) => update('priorKnowledge', event.target.value as Scenario['priorKnowledge'])}>
                  <option value="none">Neither side</option>
                  <option value="solo">Solo side only</option>
                  <option value="group">Group side only</option>
                  <option value="both">Both sides</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Initial awareness advantage</span>
                <select value={scenario.awareness} onChange={(event) => update('awareness', event.target.value as Scenario['awareness'])}>
                  <option value="mutual">Mutual awareness</option>
                  <option value="solo">Solo side</option>
                  <option value="group">Group side</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Initial facing</span>
                <select value={scenario.facing} onChange={(event) => update('facing', event.target.value as Scenario['facing'])}>
                  <option value="mutual">Facing each other</option>
                  <option value="solo-exposed">Solo side exposed</option>
                  <option value="group-exposed">Group side exposed</option>
                  <option value="random">Random orientation</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Arena boundary</span>
                <select value={scenario.arenaBoundary} onChange={(event) => update('arenaBoundary', event.target.value as Scenario['arenaBoundary'])}>
                  <option value="bounded">Bounded arena</option>
                  <option value="open">Open / escapable</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Arena diameter (m)</span>
                <input type="number" min="1" max="1000000" value={scenario.arenaDiameterM} onChange={(event) => update('arenaDiameterM', Math.max(1, Number(event.target.value) || 1))} />
              </label>
              <label className="field-stack">
                <span>Water depth (m)</span>
                <input type="number" min="0" max="10000" step="0.1" value={scenario.waterDepthM} onChange={(event) => update('waterDepthM', Math.max(0, Number(event.target.value) || 0))} />
              </label>
              <label className="field-stack">
                <span>Group doctrine</span>
                <select value={scenario.coordinationDoctrine} onChange={(event) => update('coordinationDoctrine', event.target.value as Scenario['coordinationDoctrine'])}>
                  <option value="instinctive">Instinctive / baseline</option>
                  <option value="cooperative">Cooperative plan</option>
                  <option value="disciplined">Disciplined formation</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Group casualty tolerance</span>
                <select value={scenario.casualtyTolerance} onChange={(event) => update('casualtyTolerance', event.target.value as Scenario['casualtyTolerance'])}>
                  <option value="natural">Natural self-preservation</option>
                  <option value="committed">Committed</option>
                  <option value="unlimited">Unlimited / no rout</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Solo specimen basis</span>
                <select value={scenario.soloSpecimenProfile} onChange={(event) => update('soloSpecimenProfile', event.target.value as Scenario['soloSpecimenProfile'])}>
                  <option value="profile-baseline">Profile baseline</option>
                  <option value="average-adult">Average adult (declared)</option>
                  <option value="prime-adult">Prime adult (declared)</option>
                  <option value="exceptional">Exceptional specimen (declared)</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Solo specimen sex</span>
                <select value={scenario.soloSpecimenSex} onChange={(event) => update('soloSpecimenSex', event.target.value as Scenario['soloSpecimenSex'])}>
                  <option value="unspecified">Unspecified</option><option value="female">Female</option><option value="male">Male</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Group specimen basis</span>
                <select value={scenario.groupSpecimenProfile} onChange={(event) => update('groupSpecimenProfile', event.target.value as Scenario['groupSpecimenProfile'])}>
                  <option value="profile-baseline">Profile baseline</option>
                  <option value="average-adult">Average adult (declared)</option>
                  <option value="prime-adult">Prime adult (declared)</option>
                  <option value="exceptional">Exceptional specimen (declared)</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Group specimen sex</span>
                <select value={scenario.groupSpecimenSex} onChange={(event) => update('groupSpecimenSex', event.target.value as Scenario['groupSpecimenSex'])}>
                  <option value="unspecified">Unspecified</option><option value="female">Female</option><option value="male">Male</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Time of day</span>
                <select value={scenario.timeOfDay} onChange={(event) => update('timeOfDay', event.target.value as Scenario['timeOfDay'])}>
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Ambush</span>
                <select value={scenario.ambush} onChange={(event) => update('ambush', event.target.value as Scenario['ambush'])}>
                  <option value="none">None</option>
                  <option value="solo">Solo side</option>
                  <option value="group">Group side</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Defensive position</span>
                <select value={scenario.defensivePosition} onChange={(event) => update('defensivePosition', event.target.value as Scenario['defensivePosition'])}>
                  <option value="none">None</option>
                  <option value="solo">Solo side</option>
                  <option value="group">Group side</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Resources / ammunition</span>
                <input type="range" min="0" max="100" value={scenario.resourcesPercent} onChange={(event) => update('resourcesPercent', Number(event.target.value))} />
                <small>{scenario.resourcesPercent}% available</small>
              </label>
              <label className="toggle-field">
                <input type="checkbox" checked={scenario.escapeAllowed} onChange={(event) => update('escapeAllowed', event.target.checked)} />
                <span><strong>Escape allowed</strong><small>Mobility can secure a retreat and expected losses fall.</small></span>
              </label>
            </div>

            <div className="advanced-stat-columns">
              <section>
                <h3>{solo.name}: advanced stats</h3>
                <StatControls creature={solo} value={scenario.soloOverrides} onChange={(value) => update('soloOverrides', value)} advanced />
              </section>
              <section>
                <h3>{group.name}: advanced stats</h3>
                <StatControls creature={group} value={scenario.groupOverrides} onChange={(value) => update('groupOverrides', value)} advanced />
              </section>
            </div>
          </details>

          <div className="run-bar">
            <div>
              <strong>{TRIALS_BY_DEPTH[scenario.reportDepth].toLocaleString('en-AU')} uncertainty trials</strong>
              <span>Deterministic physics first; stochastic variation second.</span>
            </div>
            <button type="button" className="secondary-button" onClick={reroll}>New uncertainty sample</button>
            <button type="button" className="primary-button" onClick={() => run()}>Run simulation</button>
          </div>
          {error && <div className="error-banner" role="alert">{error}</div>}
          {isDirty && <div className="stale-banner">Inputs have changed. Run the simulation to update the verdict below.</div>}
        </section>

        <ResultPanel
          result={result}
          scenario={simulatedScenario}
          solo={simulatedSolo}
          group={simulatedGroup}
          shareStatus={shareStatus}
          onCopyShare={copyShareLink}
          onDownloadImage={downloadResultImage}
          onDownloadJson={downloadResultJson}
        />

        <section className="history-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">LOCAL BROWSER HISTORY</p>
              <h2>Recent arguments</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setHistory([])
                setHistoryWarning('')
                localStorage.removeItem(HISTORY_KEY)
              }}
            >Clear history</button>
          </div>
          {historyWarning && <div className="error-banner" role="alert" data-testid="history-warning">{historyWarning}</div>}
          {history.length === 0 ? (
            <p className="empty-state">Run a simulation and it will be stored on this device without an account.</p>
          ) : (
            <div className="history-grid">
              {history.map((item) => {
                const unavailable = unavailableHistoryReferences(item, creatures)
                return (
                  <button
                    type="button"
                    className="history-card"
                    key={item.id}
                    onClick={() => restoreHistory(item)}
                    disabled={unavailable.length > 0}
                    title={unavailable.length > 0 ? 'A referenced profile is no longer available.' : undefined}
                  >
                    <span>{new Date(item.createdAt).toLocaleString('en-AU')}</span>
                    <strong>{item.soloName} vs {item.scenario.groupQuantity} {item.groupName}</strong>
                    <small>{unavailable.length > 0 ? 'Unavailable: missing custom profile' : `Winner: ${item.winnerName}`}</small>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer>
        <strong>What Would Win</strong>
        <span>Model {MODEL_VERSION} · Data {DATA_VERSION} · React/TypeScript · designed for static hosting on samfa12.com</span>
      </footer>
    </div>
  )
}

export default App
