import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const execFileAsync = promisify(execFile)

const baseUrl = process.env.WWW_ANDROID_URL
const cdpUrl = process.env.WWW_ANDROID_CDP_URL ?? 'http://127.0.0.1:9222'
const outputDir = resolve(process.cwd(), '..', 'output', 'playwright', 'android-device-final')

if (!baseUrl) throw new Error('Set WWW_ANDROID_URL to the phone-accessible test origin before running this capture.')

const pilots = [
  { id: 'dragon-archers', solo: 'western-dragon', group: 'prepared-archer', quantity: '200', distance: '25', scaling: 'magical', advanceBeats: 4, winner: 'Western dragon', actor: 'Western dragon', target: 'Prepared archer', mode: 'Story camera' },
  { id: 'eagle-mice', solo: 'golden-eagle', group: 'house-mouse', quantity: '1000000', distance: '25', scaling: 'strict', advanceBeats: 3, winner: 'Golden eagle', actor: 'Golden eagle', target: 'House mouse', mode: 'Tactical map' },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

async function frameEvidence(page) {
  const intervals = await page.evaluate(async () => new Promise((resolveFrames) => {
    const values = []
    let previous = performance.now()
    const frame = (now) => {
      values.push(now - previous)
      previous = now
      if (values.length >= 180) resolveFrames(values.slice(1))
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }))
  return {
    sampleCount: intervals.length,
    meanFrameMs: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
    p95FrameMs: percentile(intervals, 0.95),
    maxFrameMs: Math.max(...intervals),
  }
}

async function touch(client, locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  assert(box, 'Touch target has no rendered bounds.')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await client.send('Input.synthesizeTapGesture', { x, y, duration: 80, gestureSourceType: 'touch' })
  await locator.page().waitForTimeout(120)
}

async function configure(page, pilot) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
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

async function capturePilot(page, client, pilot) {
  const consoleErrors = []
  const onConsole = (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) }
  const onPageError = (error) => consoleErrors.push(error.message)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  await configure(page, pilot)
  const resultPanel = page.locator('section.results')
  const winner = (await resultPanel.locator('.results-header h2').innerText()).trim()
  assert(winner === pilot.winner, `${pilot.id}: expected winner ${pilot.winner}, received ${winner}.`)

  await openView(page, 'Likely battle', 'likely-battle-panel')
  await assertLockedPilot(page, pilot)
  const story = page.getByTestId('story-account')
  const notice = (await page.getByTestId('likely-battle-panel').locator('.reconstruction-notice').innerText()).trim()
  const chapterCount = await story.locator('.story-chapter').count()
  const storyCharacters = (await story.innerText()).trim().length
  const firstEvidence = story.locator('button.evidence-tooltip-trigger').first()
  const secondEvidence = story.locator('button.evidence-tooltip-trigger').nth(1)
  await touch(client, firstEvidence)
  assert(await page.locator('[role="tooltip"]:visible').count() === 1, `${pilot.id}: first touch tooltip did not pin.`)
  await touch(client, secondEvidence)
  assert(await page.locator('[role="tooltip"]:visible').count() === 1, `${pilot.id}: tooltip handoff did not keep one open tooltip.`)
  assert(await secondEvidence.getAttribute('aria-expanded') === 'true', `${pilot.id}: second touch tooltip did not become active.`)
  await page.getByTestId('likely-battle-panel').scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(outputDir, `${pilot.id}-story-sm-s948b.png`) })

  await openView(page, 'Tactical reconstruction', 'tactical-reconstruction-panel')
  const panel = page.getByTestId('tactical-reconstruction-panel')
  await touch(client, panel.getByRole('button', { name: 'Story camera', exact: true }))
  await panel.getByTestId('tactical-canvas').waitFor({ timeout: 20_000 })

  for (let index = 0; index < pilot.advanceBeats; index += 1) await touch(client, panel.getByRole('button', { name: 'Next beat', exact: true }))

  const callout = panel.getByTestId('tactical-callout')
  const terms = await callout.locator('dt').allInnerTexts()
  const descriptions = await callout.locator('dd').allInnerTexts()
  const fields = Object.fromEntries(terms.map((term, index) => [term.trim(), descriptions[index]?.trim() ?? '']))
  const calloutText = (await callout.innerText()).trim()
  const quantityText = (await panel.locator('.tactical-count-chips').innerText()).trim()
  const transcriptOpen = await panel.locator('details.tactical-transcript').evaluate((element) => element.open)
  const viewportOrder = await panel.evaluate((element) => {
    const noticeElement = element.querySelector('.reconstruction-notice')
    const viewportElement = element.querySelector('.tactical-viewport')
    const controlsElement = element.querySelector('.tactical-primary-controls')
    if (!noticeElement || !viewportElement || !controlsElement) return false
    return noticeElement.compareDocumentPosition(viewportElement) & Node.DOCUMENT_POSITION_FOLLOWING
      ? Boolean(viewportElement.compareDocumentPosition(controlsElement) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false
  })

  assert(fields.Who === pilot.actor, `${pilot.id}: callout does not identify the current actor.`)
  assert(fields.Target === pilot.target, `${pilot.id}: callout does not identify the target.`)
  assert(Boolean(fields.What), `${pilot.id}: callout does not identify the action.`)
  assert(Boolean(fields.Result), `${pilot.id}: callout does not identify the result.`)
  assert(/Why:/.test(calloutText), `${pilot.id}: callout does not expose its evidence explanation.`)
  assert(!transcriptOpen, `${pilot.id}: transcript should remain closed during comprehension evidence.`)
  assert(viewportOrder, `${pilot.id}: battlefield is not ordered between the notice and primary controls.`)
  assert(quantityText.includes(`${pilot.quantity} declared`), `${pilot.id}: declared quantity is not disclosed.`)

  const playButton = panel.getByRole('button', { name: 'Play reconstruction', exact: true })
  if (await playButton.isEnabled()) await touch(client, playButton)
  const frames = await frameEvidence(page)
  const device = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="tactical-canvas"]')
    const canvas = root instanceof HTMLCanvasElement ? root : root?.querySelector('canvas')
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    const debug = gl?.getExtension('WEBGL_debug_renderer_info')
    return {
      innerWidth,
      innerHeight,
      devicePixelRatio,
      screenWidth: screen.width,
      screenHeight: screen.height,
      userAgent: navigator.userAgent,
      deviceMemoryGiB: navigator.deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency,
      prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      jsHeapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
      jsHeapLimitBytes: performance.memory?.jsHeapSizeLimit ?? null,
      webGlRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      webGlVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    }
  })
  const performanceMetrics = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]))

  const freeLook = panel.getByRole('button', { name: 'Free look', exact: true })
  assert(await freeLook.isEnabled(), `${pilot.id}: Free look is unavailable on the physical WebGL device.`)
  await touch(client, freeLook)
  const canvasRoot = panel.getByTestId('tactical-canvas')
  await canvasRoot.scrollIntoViewIfNeeded()
  const canvasBox = await canvasRoot.boundingBox()
  assert(canvasBox, `${pilot.id}: Free look canvas has no rendered bounds.`)
  await client.send('Input.synthesizePinchGesture', { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2, scaleFactor: 1.25, relativeSpeed: 600, gestureSourceType: 'touch' })
  await touch(client, panel.getByRole('button', { name: 'Reset view', exact: true }))
  const finalMode = panel.getByRole('button', { name: pilot.mode, exact: true })
  await touch(client, finalMode)
  if (pilot.mode === 'Tactical map') await panel.getByTestId('tactical-map').waitFor()
  else await panel.getByTestId('tactical-canvas').waitFor()
  const freeLookTouchAndPinch = true

  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(outputDir, `${pilot.id}-tactical-sm-s948b.png`) })
  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  return {
    pilot: pilot.id,
    winner,
    notice,
    chapterCount,
    storyCharacters,
    selectedMode: pilot.mode,
    performanceMode: 'Story camera',
    fields,
    calloutText,
    quantityText,
    transcriptOpen,
    viewportOrder,
    consoleErrors,
    device,
    frames,
    performanceMetrics: {
      JSHeapUsedSize: performanceMetrics.JSHeapUsedSize ?? null,
      JSHeapTotalSize: performanceMetrics.JSHeapTotalSize ?? null,
      Nodes: performanceMetrics.Nodes ?? null,
      LayoutCount: performanceMetrics.LayoutCount ?? null,
      RecalcStyleCount: performanceMetrics.RecalcStyleCount ?? null,
    },
    checks: {
      currentActorActionTargetResultVisible: true,
      eventualWinnerVisibleWithoutTranscript: true,
      touchTooltipHandoff: true,
      freeLookTouchAndPinch,
      frameTarget33Ms: frames.p95FrameMs <= 33,
      jsHeapTarget192MiB: device.jsHeapUsedBytes === null || device.jsHeapUsedBytes <= 192 * 1024 * 1024,
    },
  }
}

function metric(text, pattern) {
  const value = text.match(pattern)?.[1]
  return value === undefined ? null : Number(value)
}

async function androidEvidence() {
  const [{ stdout: meminfo }, { stdout: gfxinfo }, { stdout: model }, { stdout: release }] = await Promise.all([
    execFileAsync('adb', ['shell', 'dumpsys', 'meminfo', 'com.android.chrome']),
    execFileAsync('adb', ['shell', 'dumpsys', 'gfxinfo', 'com.android.chrome', 'framestats']),
    execFileAsync('adb', ['shell', 'getprop', 'ro.product.model']),
    execFileAsync('adb', ['shell', 'getprop', 'ro.build.version.release']),
  ])
  const total = meminfo.match(/^\s*TOTAL\s+(\d+)\s+(\d+)\s+/m)
  const privateDirtyKiB = total ? Number(total[2]) : null
  return {
    model: model.trim(),
    androidRelease: release.trim(),
    chromeTotalPssKiB: total ? Number(total[1]) : null,
    chromePrivateDirtyKiB: privateDirtyKiB,
    chromeGraphicsPssKiB: metric(meminfo, /^\s*Graphics:\s+(\d+)/m),
    chromeEglMtrackKiB: metric(meminfo, /^\s*EGL mtrack\s+(\d+)/m),
    chromeGlMtrackKiB: metric(meminfo, /^\s*GL mtrack\s+(\d+)/m),
    gpuCacheBytes: metric(gfxinfo, /Total GPU memory usage:\s+(\d+) bytes/),
    jankyFramePercent: metric(gfxinfo, /Janky frames:\s+\d+\s+\(([\d.]+)%\)/),
    p95UiFrameMs: metric(gfxinfo, /95th percentile:\s+(\d+)ms/),
    memoryScope: 'Chrome private dirty and graphics include browser chrome and any other open Chrome tab; per-page JavaScript heap and WebGL renderer are reported per pilot.',
    checks: { chromePrivateDirtyTarget192MiB: privateDirtyKiB === null || privateDirtyKiB <= 192 * 1024 },
  }
}

await mkdir(outputDir, { recursive: true })
await execFileAsync('adb', ['shell', 'dumpsys', 'gfxinfo', 'com.android.chrome', 'reset'])
const browser = await chromium.connectOverCDP(cdpUrl)
try {
  const context = browser.contexts()[0]
  assert(context, 'Android Chrome exposed no browser context.')
  const page = context.pages().find((candidate) => candidate.url().startsWith(baseUrl)) ?? await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Performance.enable')
  const results = []
  for (const pilot of pilots) results.push(await capturePilot(page, client, pilot))
  const android = await androidEvidence()
  const report = { capturedAt: new Date().toISOString(), baseUrl, cdpUrl, android, results }
  await writeFile(resolve(outputDir, 'device-evidence.json'), `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} finally {
  await browser.close()
}
