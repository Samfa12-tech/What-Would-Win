import { DATA_VERSION, MODEL_VERSION } from '../version'

export function MethodologyPanel() {
  return (
    <details className="methodology-panel">
      <summary>How the model works</summary>
      <div className="methodology-content">
        <div>
          <p className="eyebrow">METHODOLOGY / ABOUT</p>
          <h2>Transparent assumptions, deterministic authority</h2>
          <p>
            What Would Win computes a deterministic matchup from physical scale, authored capability scores,
            battlefield access and group coordination. Seeded Monte Carlo trials then vary biology and tactics
            around that fixed model. The winner is never selected by generated text or an AI opinion.
          </p>
        </div>
        <dl className="methodology-facts">
          <div><dt>Model</dt><dd>{MODEL_VERSION}</dd></div>
          <div><dt>Data</dt><dd>{DATA_VERSION}</dd></div>
          <div><dt>Scenario</dt><dd>one versus X</dd></div>
          <div><dt>Violence</dt><dd>abstract and non-graphic</dd></div>
        </dl>
        <div className="methodology-columns">
          <section>
            <h3>Scaling choices</h3>
            <p><strong>Strict</strong> applies structural penalties at extreme sizes.</p>
            <p><strong>Functional</strong> preserves healthy function with moderated allometry.</p>
            <p><strong>Magical</strong> preserves function and lets power rise almost directly with mass.</p>
          </section>
          <section>
            <h3>Interpretation limits</h3>
            <p>
              Physical values are representative prototypes. Normalized combat scores and fantasy profiles are
              authored model inputs. Results are entertainment analysis, not scientific predictions or welfare guidance.
            </p>
          </section>
        </div>
      </div>
    </details>
  )
}
