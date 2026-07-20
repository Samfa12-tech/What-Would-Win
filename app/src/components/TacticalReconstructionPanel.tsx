import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import type { CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { assertValidBattleStoryboard, buildBattleStoryboard, RECONSTRUCTION_NOTICE, type BattleReconstructionInput } from '../storyboard'
import './reconstruction.css'

const TacticalScene = lazy(async () => {
  const module = await import('./tactical/TacticalScene')
  return { default: module.TacticalScene }
})

interface TacticalReconstructionPanelProps {
  input: BattleReconstructionInput
  onAnotherReconstruction: () => void
}

interface SceneBoundaryState { failed: boolean }

class SceneBoundary extends Component<{ children: ReactNode }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }
  static getDerivedStateFromError(): SceneBoundaryState { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* The HTML transcript remains authoritative. */ }
  render() {
    return this.state.failed
      ? <div className="warning-banner" role="alert">The optional 3D scene could not start. The complete captions and transcript remain available below.</div>
      : this.props.children
  }
}

function supportsWebGl2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TacticalReconstructionPanel({ input, onAnotherReconstruction }: TacticalReconstructionPanelProps) {
  const storyboard = assertValidBattleStoryboard(buildBattleStoryboard(input), input)
  const contestants: { solo: CreatureV4Draft; group: CreatureV4Draft } = input.contestants
  const scenario: ScenarioV4Draft = input.scenario
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [cameraMode, setCameraMode] = useState<'directed' | 'free'>('directed')
  const [showLabels, setShowLabels] = useState(true)
  const [showRanges, setShowRanges] = useState(true)
  const [showCounts, setShowCounts] = useState(true)
  const [showFactors, setShowFactors] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(systemPrefersReducedMotion)
  const [webGlAvailable] = useState(supportsWebGl2)
  const phase = storyboard.phases[phaseIndex]

  useEffect(() => {
    setPhaseIndex(0)
    setPlaying(false)
  }, [storyboard.storySeed, storyboard.scenarioHash, storyboard.resultHash])

  useEffect(() => {
    if (!playing || reducedMotion) return undefined
    const delay = Math.max(350, 1600 / speed)
    const timer = window.setTimeout(() => {
      setPhaseIndex((current) => {
        if (current >= storyboard.phases.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [phaseIndex, playing, reducedMotion, speed, storyboard.phases.length])

  const movePhase = (delta: number) => {
    setPlaying(false)
    setPhaseIndex((current) => Math.max(0, Math.min(storyboard.phases.length - 1, current + delta)))
  }

  return (
    <div
      className="reconstruction-panel tactical-panel"
      id="tactical-reconstruction"
      data-testid="tactical-reconstruction-panel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === ' ') { event.preventDefault(); setPlaying((current) => !current) }
        if (event.key === 'ArrowLeft') movePhase(-1)
        if (event.key === 'ArrowRight') movePhase(1)
      }}
    >
      <div className="reconstruction-heading">
        <div><p className="eyebrow">OPTIONAL TACTICAL DIORAMA</p><h3>Tactical reconstruction</h3></div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>

      <div className="tactical-controls" aria-label="Tactical reconstruction controls">
        <button type="button" onClick={() => setPlaying((current) => !current)} disabled={reducedMotion} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => movePhase(-1)} disabled={phaseIndex === 0}>Previous phase</button>
        <button type="button" onClick={() => movePhase(1)} disabled={phaseIndex === storyboard.phases.length - 1}>Next phase</button>
        <label>Playback speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
        <button type="button" aria-pressed={cameraMode === 'free'} onClick={() => setCameraMode((current) => current === 'directed' ? 'free' : 'directed')}>{cameraMode === 'directed' ? 'Directed camera' : 'Free camera'}</button>
        <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>Labels</button>
        <button type="button" aria-pressed={showRanges} onClick={() => setShowRanges((current) => !current)}>Attack ranges</button>
        <button type="button" aria-pressed={showCounts} onClick={() => setShowCounts((current) => !current)}>Effective counts</button>
        <button type="button" aria-pressed={showFactors} onClick={() => setShowFactors((current) => !current)}>Factor annotations</button>
        <button type="button" aria-pressed={reducedMotion} onClick={() => { setReducedMotion((current) => !current); setPlaying(false) }}>Reduced motion</button>
      </div>

      <div className="tactical-caption" aria-live="polite" aria-atomic="true" data-testid="tactical-caption">
        <strong>Phase {phaseIndex + 1} of {storyboard.phases.length}: {phase.id.replace('-', ' ')}</strong>
        <p>{phase.narration}</p>
      </div>

      {showCounts && <p className="quantity-disclosure" data-testid="effective-counts">{storyboard.representedQuantity.abstractionLabel}</p>}
      {showFactors && <p className="factor-annotation"><strong>Phase factors:</strong> {phase.supportingFactorIds.join(', ') || 'Scenario conditions only'}</p>}

      {storyboard.reconstructionType === 'conceptual-scale' ? (
        <div className="no-webgl-fallback" data-testid="conceptual-tactical-fallback">
          <strong>Conceptual-scale reconstruction</strong>
          <p>No literal battlefield or actors are created. The phase display uses aggregate pressure, access, frontage and reserves only.</p>
        </div>
      ) : !webGlAvailable ? (
        <div className="no-webgl-fallback" data-testid="no-webgl-fallback">
          <strong>3D is unavailable in this browser</strong>
          <p>The complete reconstruction remains available through the phase caption, controls and transcript.</p>
        </div>
      ) : (
        <div className="tactical-canvas-shell" aria-hidden="true">
          <SceneBoundary>
            <Suspense fallback={<div className="method-banner">Loading the lazy 3D runtime…</div>}>
              <TacticalScene storyboard={storyboard} contestants={contestants} scenario={scenario} activePhaseIndex={phaseIndex} playing={playing} reducedMotion={reducedMotion} cameraMode={cameraMode} showRanges={showRanges} showLabels={showLabels} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}

      <details className="tactical-transcript" open>
        <summary>Full reconstruction transcript</summary>
        <ol>{storyboard.phases.map((item) => <li key={item.id}><strong>{item.id.replace('-', ' ')}</strong><p>{item.narration}</p>{item.events.map((event) => <p key={event.id}>{event.caption}</p>)}</li>)}</ol>
      </details>
      <p className="keyboard-hint">Keyboard: focus this panel, press Space to play or pause, and use Left/Right Arrow to change phase. In free-camera mode use W/A/S/D and Q/E inside the scene.</p>
    </div>
  )
}
