import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { loadBuiltInCreatures } from './data/loadBuiltInCreatures'
import './styles.css'

const root = createRoot(document.getElementById('root')!)

async function start(): Promise<void> {
  root.render(
    <main className="app-shell" aria-live="polite">
      <section className="control-deck">
      <p className="eyebrow">WHAT WOULD WIN</p>
      <h1>Loading creature roster…</h1>
      <p role="status">Preparing the simulation data.</p>
      </section>
    </main>,
  )

  try {
    const builtInCreatures = await loadBuiltInCreatures()
    root.render(
      <StrictMode>
        <App builtInCreatures={builtInCreatures} />
      </StrictMode>,
    )
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'The built-in creature roster could not be loaded.'
    root.render(
      <main className="app-shell">
        <section className="control-deck">
        <p className="eyebrow">STARTUP INTERRUPTED</p>
        <h1>Creature roster unavailable</h1>
        <div className="error-banner" role="alert">{message}</div>
        <button type="button" className="primary-action" onClick={() => void start()}>Try again</button>
        </section>
      </main>,
    )
  }
}

void start()
