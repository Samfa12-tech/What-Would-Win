import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { assertValidBattleStoryboard, buildBattleStoryboard, RECONSTRUCTION_NOTICE, type BattleReconstructionInput } from '../storyboard'
import { EvidenceTooltip } from './EvidenceTooltip'
import { buildTacticalChoreography, phaseStartBeatIndexes } from './tactical/beatPlan'
import { buildTacticalPlan } from './tactical/contracts'
import { TacticalMap } from './tactical/TacticalMap'
import './reconstruction.css'
import './tactical-guidance.css'

const TacticalScene = lazy(async () => {
  const module = await import('./tactical/TacticalScene')
  return { default: module.TacticalScene }
})

interface TacticalReconstructionPanelProps {
  input: BattleReconstructionInput
  onAnotherReconstruction: () => void
}

interface SceneBoundaryState { failed: boolean }

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }
  static getDerivedStateFromError(): SceneBoundaryState { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* The map and HTML transcript remain authoritative. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

type TacticalViewMode = 'story' | 'map' | 'free'

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

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return 'conceptual'
  return Math.round(value).toLocaleString()
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  const words = text.split(/\s+/)
  let line = ''
  let cursorY = y
  let lines = 0
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && line) {
      if (lines + 1 >= maxLines) { context.fillText(`${line}…`, x, cursorY); return cursorY }
      context.fillText(line, x, cursorY)
      lines++
      cursorY += lineHeight
      line = word
    } else line = candidate
  }
  if (line) context.fillText(line, x, cursorY)
  return cursorY
}

export function tacticalCompositeEvidenceLines(details: { solo: string; group: string; who: string; what: string; target: string | null; result: string; why: string; counts: string; evidenceIds: string[] }) {
  return {
    legend: `Side legend: SOLO ◆ ${details.solo} | GROUP ■ ${details.group} | RESERVE □ staged behind the active front`,
    callout: [`Who: ${details.who}`, `What: ${details.what}`, `Target: ${details.target ?? 'Battlefield position'}`, `Result: ${details.result}`, `Why: ${details.why}`],
    counts: details.counts,
    evidence: `Evidence: ${details.evidenceIds.join(', ') || 'validated scenario conditions'}`,
    notice: RECONSTRUCTION_NOTICE,
  }
}

export function TacticalReconstructionPanel({ input, onAnotherReconstruction }: TacticalReconstructionPanelProps) {
  const storyboard = useMemo(() => assertValidBattleStoryboard(buildBattleStoryboard(input), input), [input])
  const beats = useMemo(() => buildTacticalChoreography(storyboard), [storyboard])
  const phaseStarts = useMemo(() => phaseStartBeatIndexes(storyboard, beats), [beats, storyboard])
  const tacticalPlan = useMemo(() => buildTacticalPlan(storyboard, input.contestants, input.scenario), [input.contestants, input.scenario, storyboard])
  const [beatIndex, setBeatIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [viewMode, setViewMode] = useState<TacticalViewMode>('story')
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [showLabels, setShowLabels] = useState(true)
  const [showRanges, setShowRanges] = useState(true)
  const [showFactors, setShowFactors] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(systemPrefersReducedMotion)
  const [webGlAvailable] = useState(supportsWebGl2)
  const [recording, setRecording] = useState(false)
  const [captureStatus, setCaptureStatus] = useState('')
  const [beatProgress, setBeatProgress] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
  const compositeRendererRef = useRef<(output: HTMLCanvasElement) => boolean>(() => false)
  const beat = beats[Math.min(beatIndex, Math.max(0, beats.length - 1))]
  const phase = storyboard.phases[beat?.phaseIndex ?? 0]
  const beatDelayMs = Math.max(250, Math.round((beat?.displayDurationMs ?? 2_000) / speed))
  const totalDisplayMs = beats.reduce((sum, item) => sum + item.displayDurationMs, 0)
  const phaseBeats = beats.filter((item) => item.phaseId === beat?.phaseId)
  const phaseBeatIndex = Math.max(0, phaseBeats.findIndex((item) => item.id === beat?.id))
  const completedEventIds = beats.slice(0, beatIndex).flatMap((item) => item.eventIds)
  const groupActor = tacticalPlan.actors.find((actor) => actor.side === 'group')

  useEffect(() => {
    setBeatIndex(0)
    setPlaying(false)
  }, [storyboard.storySeed, storyboard.scenarioHash, storyboard.resultHash])

  useEffect(() => {
    const progress = reducedMotion ? 1 : 0
    progressRef.current = progress
    setBeatProgress(progress)
  }, [beatIndex, reducedMotion, storyboard.storySeed, storyboard.scenarioHash, storyboard.resultHash])

  useEffect(() => {
    if (!webGlAvailable || storyboard.reconstructionType === 'conceptual-scale') setViewMode('map')
  }, [storyboard.reconstructionType, webGlAvailable])

  useEffect(() => {
    if (!playing || reducedMotion || !beat) return undefined
    let frame = 0
    const started = performance.now() - progressRef.current * beatDelayMs
    const advance = (now: number) => {
      const progress = Math.min(1, (now - started) / beatDelayMs)
      progressRef.current = progress
      setBeatProgress(progress)
      if (progress < 1) frame = requestAnimationFrame(advance)
      else setBeatIndex((current) => {
        if (current >= beats.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }
    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [beat, beatDelayMs, beats.length, playing, reducedMotion])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current)
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  if (!beat || !phase) return <div className="warning-banner">The validated storyboard contains no displayable tactical beats.</div>

  const moveBeat = (delta: number) => {
    setPlaying(false)
    setBeatIndex((current) => Math.max(0, Math.min(beats.length - 1, current + delta)))
  }

  const seekPhase = (phaseIndex: number) => {
    setPlaying(false)
    setBeatIndex(phaseStarts[phaseIndex] ?? 0)
  }

  const seekBeat = (index: number) => {
    setPlaying(false)
    setBeatIndex(Math.max(0, Math.min(beats.length - 1, index)))
    const progress = reducedMotion ? 1 : 0
    progressRef.current = progress
    setBeatProgress(progress)
  }

  const visualCanvas = () => panelRef.current?.querySelector<HTMLCanvasElement>('.tactical-viewport canvas')

  const renderComposite = (output: HTMLCanvasElement) => {
    const source = visualCanvas()
    if (!source) return false
    output.width = 1600
    output.height = 1000
    const context = output.getContext('2d')
    if (!context) return false
    const effectiveLog = storyboard.representedQuantity.effectiveActiveCountLog10
    const effective = storyboard.reconstructionType === 'conceptual-scale' ? 'conceptual aggregate' : effectiveLog === null ? 'not applicable' : effectiveLog < 7 ? `≈${formatQuantity(10 ** effectiveLog)}` : `10^${effectiveLog.toFixed(2)}`
    const perFigure = storyboard.representedQuantity.representedActorsPerVisibleActor
    const text = tacticalCompositeEvidenceLines({
      solo: input.contestants.solo.name, group: input.contestants.group.name, ...beat.callout,
      counts: `Counts: ${input.scenario.groupQuantity} declared · ${groupActor?.visibleCount ?? 0} visible · ${groupActor?.visibleActiveCount ?? 0} active-front · ${groupActor?.visibleReserveCount ?? 0} reserve visible · ${perFigure === null ? 'aggregate pressure' : `≈${formatQuantity(perFigure)} per figure`} · effective basis ${effective}`,
      evidenceIds: beat.evidenceIds,
    })
    context.fillStyle = '#07121d'
    context.fillRect(0, 0, output.width, output.height)
    context.drawImage(source, 0, 0, output.width, 500)
    context.fillStyle = 'rgba(7, 18, 29, 0.96)'
    context.fillRect(0, 500, output.width, 500)
    context.fillStyle = '#e9bd62'
    context.font = '700 25px system-ui'
    context.fillText(`Phase ${beat.phaseIndex + 1}/7 · Beat ${phaseBeatIndex + 1}/${phaseBeats.length} · ${beat.title}`, 42, 542)
    context.fillStyle = '#f5f7f8'
    context.font = '20px system-ui'
    wrapText(context, text.legend, 42, 580, 1515, 25, 2)
    context.font = '19px system-ui'
    wrapText(context, text.callout[0], 42, 630, 725, 24, 4)
    wrapText(context, text.callout[1], 42, 690, 725, 24, 5)
    wrapText(context, text.callout[2], 42, 790, 725, 24, 4)
    wrapText(context, text.callout[3], 820, 630, 730, 24, 5)
    wrapText(context, text.callout[4], 820, 730, 730, 24, 5)
    context.fillStyle = '#e9bd62'
    wrapText(context, text.evidence, 820, 850, 730, 22, 3)
    context.fillStyle = '#f5f7f8'
    wrapText(context, text.counts, 42, 900, 1515, 23, 3)
    context.fillStyle = '#b8c2cb'
    context.font = '17px system-ui'
    context.fillText(text.notice, 42, 975)
    return true
  }
  compositeRendererRef.current = renderComposite

  const downloadStill = () => {
    const output = document.createElement('canvas')
    if (!renderComposite(output)) {
      setCaptureStatus('The tactical view must finish loading before it can be exported.')
      return
    }
    output.toBlob((blob) => {
      if (!blob) return setCaptureStatus('This browser could not encode the reconstruction image.')
      downloadBlob(`what-would-win-reconstruction-${storyboard.storySeed}.png`, blob)
      setCaptureStatus('Composite reconstruction image downloaded as PNG.')
    }, 'image/png')
  }

  const toggleRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      try { recorderRef.current.requestData() } catch { /* stop still flushes where requestData is unavailable */ }
      recorderRef.current.stop()
      return
    }
    if (typeof MediaRecorder === 'undefined') return setCaptureStatus('WebM reconstruction recording is unavailable in this browser.')
    const output = document.createElement('canvas')
    if (!renderComposite(output) || typeof output.captureStream !== 'function') return setCaptureStatus('The tactical view must finish loading before recording.')
    try {
      const stream = output.captureStream(30)
      const preferredType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
      recordingChunksRef.current = []
      recordingStreamRef.current = stream
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordingChunksRef.current.push(event.data) }
      recorder.onstop = () => {
        if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' })
        if (blob.size > 0) downloadBlob(`what-would-win-reconstruction-${storyboard.storySeed}.webm`, blob)
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        recorderRef.current = null
        setRecording(false)
        setCaptureStatus(blob.size > 0 ? 'Composite reconstruction recording downloaded as WebM.' : 'No reconstruction frames were recorded.')
      }
      recordingTimerRef.current = window.setInterval(() => compositeRendererRef.current(output), 100)
      recorder.start(250)
      setRecording(true)
      setPlaying(!reducedMotion)
      setCaptureStatus('Recording the guided reconstruction. Select Stop WebM to finish.')
    } catch {
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
      recorderRef.current = null
      setRecording(false)
      setCaptureStatus('WebM reconstruction recording could not start in this browser.')
    }
  }

  const mapView = (compact = false) => <TacticalMap storyboard={storyboard} contestants={input.contestants} scenario={input.scenario} beat={beat} beatProgress={beatProgress} completedEventIds={completedEventIds} showRanges={showRanges} showLabels={showLabels} compact={compact} />
  const showMap = viewMode === 'map' || !webGlAvailable || storyboard.reconstructionType === 'conceptual-scale'

  return (
    <div
      ref={panelRef}
      className="reconstruction-panel tactical-panel"
      id="tactical-reconstruction"
      data-testid="tactical-reconstruction-panel"
      data-source-timeline-seconds={storyboard.estimatedDurationSeconds ?? 'conceptual'}
      data-display-timeline-ms={totalDisplayMs}
      data-beat-progress={beatProgress.toFixed(3)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === ' ' && !reducedMotion) { event.preventDefault(); setPlaying((current) => !current) }
        if (event.key === 'ArrowLeft') moveBeat(-1)
        if (event.key === 'ArrowRight') moveBeat(1)
      }}
    >
      <div className="reconstruction-heading">
        <div><p className="eyebrow">OPTIONAL GUIDED TACTICAL DIORAMA</p><h3>Tactical reconstruction</h3></div>
        <button type="button" className="secondary-button" onClick={onAnotherReconstruction} disabled={recording}>Another reconstruction</button>
      </div>
      <p className="reconstruction-notice">{RECONSTRUCTION_NOTICE}</p>

      <div className={`tactical-viewport mode-${viewMode}`} data-view-mode={viewMode}>
        {showMap ? mapView() : (<>
          <div className="tactical-canvas-shell">
            <SceneBoundary fallback={<div className="scene-map-fallback" role="alert">{mapView()}<span className="sr-only">The optional 3D scene could not start; this synchronized tactical map remains complete.</span></div>}>
              <Suspense fallback={<div className="method-banner">Loading the lazy 3D runtime…</div>}>
                <TacticalScene
                  storyboard={storyboard}
                  contestants={input.contestants}
                  scenario={input.scenario}
                  activePhaseIndex={beat.phaseIndex}
                  activeEventIds={beat.eventIds}
                  completedEventIds={completedEventIds}
                  cameraCue={beat.cameraCue}
                  focusPositions={beat.focusPositions}
                  actorStateTransitions={beat.actorStateTransitions}
                  beatProgress={beatProgress}
                  playing={playing}
                  reducedMotion={reducedMotion}
                  cameraMode={viewMode === 'free' ? 'free' : 'story'}
                  cameraResetKey={cameraResetKey}
                  showRanges={showRanges}
                  showLabels={showLabels}
                />
              </Suspense>
            </SceneBoundary>
          </div>
          <div className="tactical-map-inset" style={{ position: 'absolute', right: 10, bottom: 10, width: 'min(34%, 340px)', height: 180 }}>{mapView(true)}</div>
        </>)}
      </div>
      {!webGlAvailable && <p className="section-intro" data-testid="no-webgl-fallback">WebGL is unavailable; the synchronized tactical map, captions, controls and transcript remain complete.</p>}

      <section className="tactical-callout" data-testid="tactical-callout" aria-live="polite" aria-atomic="true">
        <header>
          <span><span className="visually-hidden">Phase {beat.phaseIndex + 1} of 7 · Beat {phaseBeatIndex + 1} of {phaseBeats.length}</span><span aria-hidden="true">P{beat.phaseIndex + 1}/7 · B{phaseBeatIndex + 1}/{phaseBeats.length}</span></span>
          <strong>{beat.title}</strong>
        </header>
        <dl>
          <div><dt>Who</dt><dd>{beat.callout.who}</dd></div>
          <div><dt>What</dt><dd>{beat.callout.what}</dd></div>
          <div><dt>Target</dt><dd>{beat.callout.target ?? 'Battlefield position'}</dd></div>
          <div><dt>Result</dt><dd>{beat.callout.result}</dd></div>
        </dl>
        <p><strong>Why:</strong> {beat.callout.why}</p>
        <p><strong>Evidence:</strong> {beat.evidenceIds.join(', ') || 'Validated scenario conditions'}</p>
      </section>

      <div className="tactical-primary-controls" aria-label="Tactical playback controls">
        <button type="button" onClick={() => setPlaying((current) => !current)} disabled={reducedMotion} aria-pressed={playing}>{playing ? 'Pause reconstruction' : 'Play reconstruction'}</button>
        <button type="button" onClick={() => moveBeat(-1)} disabled={beatIndex === 0}>Previous beat</button>
        <button type="button" onClick={() => moveBeat(1)} disabled={beatIndex === beats.length - 1}>Next beat</button>
        <button type="button" onClick={() => seekBeat(0)} disabled={beatIndex === 0 && beatProgress === 0}>Restart</button>
        <label>Speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
      </div>

      <div className="tactical-view-switch" aria-label="Tactical camera mode">
        <button type="button" aria-pressed={viewMode === 'story'} disabled={!webGlAvailable || storyboard.reconstructionType === 'conceptual-scale'} onClick={() => setViewMode('story')}>Story camera</button>
        <button type="button" aria-pressed={viewMode === 'map'} onClick={() => setViewMode('map')}>Tactical map</button>
        <button type="button" aria-pressed={viewMode === 'free'} disabled={!webGlAvailable || storyboard.reconstructionType === 'conceptual-scale'} onClick={() => setViewMode('free')}>Free look</button>
        {viewMode === 'free' && <button type="button" onClick={() => setCameraResetKey((current) => current + 1)}>Reset view</button>}
      </div>

      <nav className="tactical-timeline" data-testid="tactical-timeline" aria-label="Battle phase and beat timeline">
        {storyboard.phases.map((item, itemIndex) => {
          const itemBeats = beats.filter((candidate) => candidate.phaseId === item.id)
          const activePhase = item.id === beat.phaseId
          return (
            <div key={item.id} className="phase-beat-group">
              <button className="phase-seek" type="button" aria-current={activePhase ? 'step' : undefined} onClick={() => seekPhase(itemIndex)}>{itemIndex + 1}. {item.id.replace(/-/g, ' ')}</button>
              <span className="beat-dots" aria-label={`${itemBeats.length} beats`}>
                {itemBeats.map((candidate, localIndex) => {
                  const index = beats.indexOf(candidate)
                  const state = candidate.id === beat.id ? 'current' : index < beatIndex ? 'complete' : ''
                  return <button key={candidate.id} type="button" className={state} aria-current={state === 'current' ? 'step' : undefined} aria-label={`Seek to ${item.id.replace(/-/g, ' ')} beat ${localIndex + 1}: ${candidate.title}`} onClick={() => seekBeat(index)}><span aria-hidden="true">{state === 'current' ? '■' : state === 'complete' ? '●' : '○'}</span></button>
                })}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="tactical-count-chips" aria-label="Quantity representation">
        <EvidenceTooltip label="The group quantity entered for the authoritative simulation." technicalDetail={`Declared quantity log10: ${storyboard.representedQuantity.declaredQuantityLog10}.`}><strong>{input.scenario.groupQuantity}</strong> declared</EvidenceTooltip>
        <EvidenceTooltip label="The capped number of representative group figures visible in the reconstruction." technicalDetail="Visible figures are capped at 80 and never change the simulation."><strong>{groupActor?.visibleCount ?? 0}</strong> shown</EvidenceTooltip>
        <EvidenceTooltip label="The approximate declared quantity represented by each visible group figure." technicalDetail={storyboard.representedQuantity.abstractionLabel}><strong>{storyboard.representedQuantity.representedActorsPerVisibleActor === null ? 'aggregate' : `≈${formatQuantity(storyboard.representedQuantity.representedActorsPerVisibleActor)}`}</strong> per figure</EvidenceTooltip>
        <EvidenceTooltip label="The figures that can contribute at the resolved frontage now." technicalDetail={`Effective active count log10: ${storyboard.representedQuantity.effectiveActiveCountLog10 ?? 'not applicable'}.`}><strong>{groupActor?.visibleActiveCount ?? 0}</strong> active-front figures</EvidenceTooltip>
        <EvidenceTooltip label="Visible representative figures staged behind the active frontage. Their broader reserve contribution is represented by the authoritative quantity model." technicalDetail={`${formatQuantity(groupActor?.reserveCount ?? 0)} declared members remain beyond the active count.`}><strong>{groupActor?.visibleReserveCount ?? 0}</strong> reserve figures</EvidenceTooltip>
      </div>

      <details className="tactical-advanced-controls">
          <summary style={{ minHeight: 44 }}>Display and capture</summary>
        <div className="tactical-controls">
          <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>Actor labels</button>
          <button type="button" aria-pressed={showRanges} onClick={() => setShowRanges((current) => !current)}>Range and area overlays</button>
          <button type="button" aria-pressed={showFactors} onClick={() => setShowFactors((current) => !current)}>Factor annotations</button>
          <button type="button" aria-pressed={reducedMotion} onClick={() => { setReducedMotion((current) => !current); setPlaying(false) }}>Reduced motion</button>
          <button type="button" onClick={downloadStill}>Download guided PNG</button>
          <button type="button" aria-pressed={recording} onClick={toggleRecording}>{recording ? 'Stop WebM' : 'Record guided WebM'}</button>
        </div>
      </details>
      <p className="capture-status" role="status" aria-live="polite">{captureStatus}</p>
      {showFactors && <p className="factor-annotation"><strong>Supporting evidence:</strong> {phase.supportingFactorIds.join(', ') || 'Validated scenario conditions only'}</p>}

      <details className="tactical-transcript">
        <summary>Full reconstruction transcript</summary>
        <ol>{beats.map((item) => <li key={item.id} aria-current={item.id === beat.id ? 'step' : undefined}><strong>{item.phaseId.replace(/-/g, ' ')} · {item.title}</strong><p>{item.callout.who}: {item.callout.what}</p><p>Target: {item.callout.target ?? 'Battlefield position'}</p><p>{item.callout.result}. {item.callout.why}</p><p>Evidence: {item.evidenceIds.join(', ') || 'validated scenario conditions'}</p></li>)}</ol>
      </details>
      <p className="keyboard-hint">Keyboard: focus this panel, press Space to play or pause, and use Left/Right Arrow for previous or next beat. Free look supports pointer drag, wheel or pinch zoom; Reset view restores the guided starting position.</p>
    </div>
  )
}
