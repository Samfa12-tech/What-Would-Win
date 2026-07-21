import { Component, lazy, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import type { CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { assertValidBattleStoryboard, buildBattleStoryboard, RECONSTRUCTION_NOTICE, type BattleReconstructionInput, type BattleStoryboardPhase } from '../storyboard'
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

const MIN_DISPLAY_TIMELINE_MS = 7_000
const MAX_DISPLAY_TIMELINE_MS = 21_000
const MIN_DISPLAY_PHASE_MS = 250

function boundedPlaybackTimeline(phases: BattleStoryboardPhase[]) {
  const sourceStartSeconds = phases[0]?.startSeconds ?? 0
  const sourceEndSeconds = phases.reduce(
    (latest, phase) => Math.max(latest, phase.startSeconds + phase.durationSeconds),
    sourceStartSeconds,
  )
  const sourceDurationSeconds = Math.max(0.001, sourceEndSeconds - sourceStartSeconds)
  const displayDurationMs = Math.min(
    MAX_DISPLAY_TIMELINE_MS,
    Math.max(MIN_DISPLAY_TIMELINE_MS, sourceDurationSeconds * 1_000),
  )
  const millisecondsPerSourceSecond = displayDurationMs / sourceDurationSeconds
  const phaseDurationMs = phases.map((phase, index) => {
    const nextStartSeconds = phases[index + 1]?.startSeconds
    const sourceSegmentSeconds = nextStartSeconds === undefined
      ? phase.durationSeconds
      : nextStartSeconds - phase.startSeconds
    return Math.max(MIN_DISPLAY_PHASE_MS, Math.round(Math.max(0.001, sourceSegmentSeconds) * millisecondsPerSourceSecond))
  })

  return { sourceDurationSeconds, displayDurationMs, phaseDurationMs }
}

function secondsLabel(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
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
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [recording, setRecording] = useState(false)
  const [captureStatus, setCaptureStatus] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const phase = storyboard.phases[phaseIndex]
  const playbackTimeline = boundedPlaybackTimeline(storyboard.phases)
  const phasePlaybackDelayMs = Math.max(MIN_DISPLAY_PHASE_MS, Math.round(playbackTimeline.phaseDurationMs[phaseIndex] / speed))

  useEffect(() => {
    setPhaseIndex(0)
    setPlaying(false)
  }, [storyboard.storySeed, storyboard.scenarioHash, storyboard.resultHash])

  useEffect(() => {
    if (!playing || reducedMotion) return undefined
    const timer = window.setTimeout(() => {
      setPhaseIndex((current) => {
        if (current >= storyboard.phases.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, phasePlaybackDelayMs)
    return () => window.clearTimeout(timer)
  }, [phaseIndex, phasePlaybackDelayMs, playing, reducedMotion, storyboard.phases.length])

  useEffect(() => {
    if (!soundEnabled) return undefined
    let context: AudioContext | undefined
    const closeContext = () => {
      if (context && context.state !== 'closed') void context.close().catch(() => undefined)
    }
    try {
      context = new AudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const eventCount = Math.min(5, phase.events.length)
      oscillator.type = 'sine'
      oscillator.frequency.value = 180 + (phaseIndex * 28) + (eventCount * 14)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
      const closeTimer = window.setTimeout(closeContext, 250)
      return () => {
        window.clearTimeout(closeTimer)
        closeContext()
      }
    } catch {
      setSoundEnabled(false)
      setCaptureStatus('Phase tones are unavailable in this browser.')
      closeContext()
      return undefined
    }
  }, [phase.events.length, phaseIndex, soundEnabled])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const movePhase = (delta: number) => {
    setPlaying(false)
    setPhaseIndex((current) => Math.max(0, Math.min(storyboard.phases.length - 1, current + delta)))
  }

  const seekPhase = (index: number) => {
    setPlaying(false)
    setPhaseIndex(Math.max(0, Math.min(storyboard.phases.length - 1, index)))
  }

  const tacticalCanvas = () => panelRef.current?.querySelector<HTMLCanvasElement>('.tactical-canvas-shell canvas')

  const downloadStill = () => {
    const canvas = tacticalCanvas()
    if (!canvas) {
      setCaptureStatus('The scene must finish loading before it can be exported.')
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setCaptureStatus('This browser could not encode the scene image.')
        return
      }
      downloadBlob(`what-would-win-reconstruction-${storyboard.storySeed}.png`, blob)
      setCaptureStatus('Scene image downloaded as PNG.')
    }, 'image/png')
  }

  const toggleRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      return
    }
    const canvas = tacticalCanvas()
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setCaptureStatus('WebM scene recording is unavailable in this browser.')
      return
    }
    try {
      const stream = canvas.captureStream(30)
      const preferredType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
      recordingChunksRef.current = []
      recordingStreamRef.current = stream
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' })
        if (blob.size > 0) downloadBlob(`what-would-win-reconstruction-${storyboard.storySeed}.webm`, blob)
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        recorderRef.current = null
        setRecording(false)
        setCaptureStatus(blob.size > 0 ? 'Scene recording downloaded as WebM.' : 'No scene frames were recorded.')
      }
      recorder.start(250)
      setRecording(true)
      setPlaying(!reducedMotion)
      setCaptureStatus('Recording the tactical canvas. Select Stop WebM to finish the download.')
    } catch {
      setCaptureStatus('WebM scene recording could not start in this browser.')
    }
  }

  return (
    <div
      ref={panelRef}
      className="reconstruction-panel tactical-panel"
      id="tactical-reconstruction"
      data-testid="tactical-reconstruction-panel"
      data-source-timeline-seconds={playbackTimeline.sourceDurationSeconds}
      data-display-timeline-ms={playbackTimeline.displayDurationMs}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === ' ' && !reducedMotion) { event.preventDefault(); setPlaying((current) => !current) }
        if (event.key === 'ArrowLeft') movePhase(-1)
        if (event.key === 'ArrowRight') movePhase(1)
      }}
    >
      <div className="reconstruction-heading">
        <div><p className="eyebrow">OPTIONAL TACTICAL DIORAMA</p><h3>Tactical reconstruction</h3></div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction} disabled={recording}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>

      <div className="tactical-controls" aria-label="Tactical reconstruction controls">
        <button type="button" onClick={() => setPlaying((current) => !current)} disabled={reducedMotion} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => movePhase(-1)} disabled={phaseIndex === 0}>Previous phase</button>
        <button type="button" onClick={() => movePhase(1)} disabled={phaseIndex === storyboard.phases.length - 1}>Next phase</button>
        <label>Playback speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
        <label className="tactical-seek">
          Seek to phase
          <input
            type="range"
            min={1}
            max={storyboard.phases.length}
            step={1}
            value={phaseIndex + 1}
            aria-label="Seek to battle phase"
            aria-valuetext={`Phase ${phaseIndex + 1}: ${phase.id.replace('-', ' ')}`}
            onChange={(event) => seekPhase(Number(event.target.value) - 1)}
          />
          <output>{phaseIndex + 1} / {storyboard.phases.length} — {phase.id.replace('-', ' ')}</output>
        </label>
        <button type="button" aria-pressed={cameraMode === 'free'} onClick={() => setCameraMode((current) => current === 'directed' ? 'free' : 'directed')}>{cameraMode === 'directed' ? 'Directed camera' : 'Free camera'}</button>
        <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>Labels</button>
        <button type="button" aria-pressed={showRanges} onClick={() => setShowRanges((current) => !current)}>Attack ranges</button>
        <button type="button" aria-pressed={showCounts} onClick={() => setShowCounts((current) => !current)}>Effective counts</button>
        <button type="button" aria-pressed={showFactors} onClick={() => setShowFactors((current) => !current)}>Factor annotations</button>
        <button type="button" aria-pressed={reducedMotion} onClick={() => { setReducedMotion((current) => !current); setPlaying(false) }}>Reduced motion</button>
        <button type="button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((current) => !current)}>Phase tones</button>
        <button type="button" onClick={downloadStill} disabled={!webGlAvailable || storyboard.reconstructionType === 'conceptual-scale'}>Download scene PNG</button>
        <button type="button" aria-pressed={recording} onClick={toggleRecording} disabled={!webGlAvailable || storyboard.reconstructionType === 'conceptual-scale'}>{recording ? 'Stop WebM' : 'Record scene WebM'}</button>
      </div>
      <p className="capture-status" role="status" aria-live="polite">{captureStatus}</p>

      <div
        className="tactical-caption"
        aria-live="polite"
        aria-atomic="true"
        data-testid="tactical-caption"
        data-source-start-seconds={phase.startSeconds}
        data-source-duration-seconds={phase.durationSeconds}
        data-display-delay-ms={phasePlaybackDelayMs}
      >
        <strong>Phase {phaseIndex + 1} of {storyboard.phases.length}: {phase.id.replace('-', ' ')}</strong>
        <p>{phase.narration}</p>
        <p className="tactical-timing">Modelled time {secondsLabel(phase.startSeconds)}–{secondsLabel(phase.startSeconds + phase.durationSeconds)} seconds · {secondsLabel(phasePlaybackDelayMs / 1_000)} seconds at {speed}× playback.</p>
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
      <p className="keyboard-hint">Keyboard: focus this panel, press Space to play or pause, and use Left/Right Arrow to change phase. The phase slider supports standard Arrow, Home and End keys. In free-camera mode use W/A/S/D and Q/E inside the scene.</p>
    </div>
  )
}
