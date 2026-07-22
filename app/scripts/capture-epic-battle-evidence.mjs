import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = process.env.WWW_CAPTURE_URL ?? 'http://127.0.0.1:4175'
const outputDir = resolve(process.cwd(), '..', 'output', 'playwright', 'epic-battle-final')

async function configure(page, pilot) {
  await page.goto(baseUrl)
  await page.getByTestId('solo-creature-select').selectOption(pilot.solo)
  await page.getByTestId('group-creature-select').selectOption(pilot.group)
  await page.getByLabel('Quantity').fill(pilot.quantity)
  await page.getByLabel('Starting distance (m)').fill(pilot.distance)
  await page.locator(`input[name="scaling-mode"][value="${pilot.scaling}"]`).check({ force: true })
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await page.locator('.results').waitFor()
}

async function openView(page, name, testId) {
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByTestId(testId).waitFor()
}

async function frameEvidence(page) {
  return page.evaluate(async () => {
    const intervals = await new Promise((resolveFrames) => {
      const values = []
      let previous = performance.now()
      const frame = (now) => {
        values.push(now - previous)
        previous = now
        if (values.length >= 120) resolveFrames(values.slice(1))
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    const sorted = [...intervals].sort((a, b) => a - b)
    const memory = performance.memory
    return {
      meanFrameMs: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      maxFrameMs: Math.max(...intervals),
      jsHeapUsedBytes: memory?.usedJSHeapSize ?? null,
      jsHeapLimitBytes: memory?.jsHeapSizeLimit ?? null,
    }
  })
}

async function capturePilot(browser, pilot) {
  const context = await browser.newContext(pilot.mobile
    ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }
    : { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await configure(page, pilot)
  await openView(page, 'Likely battle', 'likely-battle-panel')
  const resultPanel = page.locator('section.results')
  await page.locator('.workspace-nav').evaluate((element) => { element.style.visibility = 'hidden' })
  await resultPanel.evaluate((element, height) => {
    element.style.height = `${height}px`
    element.style.overflow = 'hidden'
  }, pilot.mobile ? 1600 : 1000)
  await resultPanel.screenshot({ path: resolve(outputDir, `${pilot.id}-story-${pilot.mobile ? 'mobile' : 'desktop'}.png`) })
  await resultPanel.evaluate((element) => {
    element.style.height = ''
    element.style.overflow = ''
  })
  await openView(page, 'Tactical reconstruction', 'tactical-reconstruction-panel')
  const panel = page.getByTestId('tactical-reconstruction-panel')
  if (pilot.mobile) await panel.getByRole('button', { name: 'Tactical map', exact: true }).click()
  else await panel.getByTestId('tactical-canvas').waitFor({ timeout: 15_000 })
  for (let index = 0; index < pilot.advanceBeats; index += 1) await panel.getByRole('button', { name: 'Next beat' }).click()
  await page.waitForTimeout(400)
  await panel.screenshot({ path: resolve(outputDir, `${pilot.id}-guided-${pilot.mobile ? 'mobile' : 'desktop'}.png`) })
  if (!pilot.mobile) await panel.getByRole('button', { name: 'Play reconstruction' }).click()
  const runtime = await frameEvidence(page)
  await context.close()
  return { pilot: pilot.id, viewport: pilot.mobile ? '412x915 touch' : '1440x1000', ...runtime }
}

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
try {
  const results = []
  results.push(await capturePilot(browser, { id: 'dragon-archers', solo: 'western-dragon', group: 'prepared-archer', quantity: '200', distance: '25', scaling: 'magical', advanceBeats: 4, mobile: false }))
  results.push(await capturePilot(browser, { id: 'eagle-mice', solo: 'golden-eagle', group: 'house-mouse', quantity: '1000000', distance: '25', scaling: 'strict', advanceBeats: 3, mobile: true }))
  await writeFile(resolve(outputDir, 'runtime-evidence.json'), `${JSON.stringify({ capturedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
}
