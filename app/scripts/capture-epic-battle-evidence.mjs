import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = process.env.WWW_CAPTURE_URL ?? 'http://127.0.0.1:4175'
const outputDir = resolve(process.cwd(), '..', 'output', 'playwright', 'epic-battle-final')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function configure(page, pilot) {
  await page.goto(baseUrl)
  await page.getByTestId('solo-creature-select').selectOption(pilot.solo)
  await page.getByTestId('group-creature-select').selectOption(pilot.group)
  const combatants = page.locator('section.combatant-panel')
  const soloPanel = combatants.filter({ has: page.getByRole('heading', { name: 'The one', exact: true }) })
  const groupPanel = combatants.filter({ has: page.getByRole('heading', { name: 'The many', exact: true }) })
  await soloPanel.getByLabel('Size method').selectOption('normal')
  await groupPanel.getByLabel('Size method').selectOption('normal')
  assert(await soloPanel.getByLabel('Size method').inputValue() === 'normal', `${pilot.id}: solo size is not natural.`)
  assert(await groupPanel.getByLabel('Size method').inputValue() === 'normal', `${pilot.id}: group size is not natural.`)
  await page.getByLabel('Quantity').fill(pilot.quantity)
  await page.getByLabel('Starting distance (m)').fill(pilot.distance)
  await page.locator(`input[name="scaling-mode"][value="${pilot.scaling}"]`).check({ force: true })
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await page.locator('.results').waitFor()
}

async function assertLockedPilot(page, pilot) {
  const panel = page.getByTestId('likely-battle-panel')
  const storyText = await panel.getByTestId('story-account').innerText()
  const quantityText = await panel.getByLabel('Quantity representation disclosure').innerText()
  if (pilot.id === 'dragon-archers') {
    assert(/\b80 metres\b/.test(storyText), 'dragon-archers: locked 80 m bow range is missing.')
    assert(/\b35 metres\b/.test(storyText), 'dragon-archers: locked 35 m fire range is missing.')
    assert(/\b10-metre radius\b/.test(storyText), 'dragon-archers: locked 10 m fire area is missing.')
    assert(/\b132 effective at active frontage\b/.test(quantityText), 'dragon-archers: locked effective basis 132 is missing.')
  } else if (pilot.id === 'eagle-mice') {
    assert(/1,000,000 declared/.test(quantityText), 'eagle-mice: declared quantity is not locked to one million.')
    assert(/48 visible/.test(quantityText), 'eagle-mice: locked visible count 48 is missing.')
    assert(/about 20,833 per figure/.test(quantityText), 'eagle-mice: locked compression ratio is missing.')
    assert(/6 effective at active frontage/.test(quantityText), 'eagle-mice: locked active frontage 6 is missing.')
    const brief = await panel.getByLabel('Three-part likely battle account').innerText()
    assert(/supported flight route[\s\S]*usable front[\s\S]*replacement wave/i.test(brief), 'eagle-mice: locked flight/frontage/replacement spine is missing.')
  }
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
  await assertLockedPilot(page, pilot)
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
