import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './evidence-tooltip.css'

interface EvidenceTooltipProps {
  children: ReactNode
  label: string
  technicalDetail?: string
}

const OPEN_EVENT = 'www:tip'

export function EvidenceTooltip({ children, label, technicalDetail }: EvidenceTooltipProps) {
  const tooltipId = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [mode, setMode] = useState(0)
  const open = mode > 0

  function show(nextPinned = false) {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: tooltipId }))
    setMode(nextPinned ? 2 : 1)
  }

  function close() {
    setMode(0)
  }
  const closeTransient = () => mode < 2 && close()

  useEffect(() => {
    if (!open) return
    function closeOther(event: Event) {
      if ((event as CustomEvent<string>).detail !== tooltipId) close()
    }
    function closeOutside(event: MouseEvent) {
      if (mode === 2 && !wrapperRef.current?.contains(event.target as Node | null)) close()
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener(OPEN_EVENT, closeOther)
    document.addEventListener('click', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener(OPEN_EVENT, closeOther)
      document.removeEventListener('click', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, mode, tooltipId])

  return (
    <span ref={wrapperRef} className="evidence-tooltip">
      <button
        type="button"
        className="evidence-tooltip-trigger"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onPointerEnter={(event) => event.pointerType !== 'touch' && show()}
        onPointerLeave={(event) => event.pointerType !== 'touch' && closeTransient()}
        onFocus={() => show()}
        onBlur={closeTransient}
        onClick={() => { if (mode === 2) close(); else show(true) }}
      >
        {children}
      </button>
      {open && (
        <span id={tooltipId} role="tooltip" className="evidence-tooltip-content">
          <strong>{label}</strong>
          {technicalDetail && <span>{technicalDetail}</span>}
        </span>
      )}
    </span>
  )
}
