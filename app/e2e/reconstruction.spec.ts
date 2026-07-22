import { expect, test, type Browser, type Page } from '@playwright/test'

const HISTORY_STORAGE_KEY = 'what-would-win-history-v2'
const RECONSTRUCTION_NOTICE = 'One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.'

async function runDefaultSimulation(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results')).toBeVisible()
}

function storySeed(page: Page) {
  return page.getByText(/Story seed \d+ changes presentation(?: choices)? only\./)
}

async function openLikelyBattle(page: Page) {
  const tab = page.getByRole('button', { name: 'Likely battle', exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  }).toPass({ timeout: 30_000 })
  await expect(page.getByTestId('likely-battle-panel')).toBeVisible({ timeout: 30_000 })
}

async function openTactical(page: Page) {
  const tab = page.getByRole('button', { name: 'Tactical reconstruction', exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  }).toPass({ timeout: 30_000 })
  await expect(page.getByTestId('tactical-reconstruction-panel')).toBeVisible({ timeout: 30_000 })
}

async function cleanSharedPage(browser: Browser, url: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  return { context, page }
}

test('likely battle is a fully annotated, explicitly non-trial presentation', async ({ page }) => {
  await runDefaultSimulation(page)
  await openLikelyBattle(page)

  await expect(page.getByText(RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  await expect(page.getByLabel('Three-part likely battle account').locator('article')).toHaveCount(3)
  await expect(page.getByLabel('Seven-phase epic battle account').locator('> section')).toHaveCount(7)
  await expect(page.getByLabel('Quantity representation disclosure')).toContainText(/visible|represented|active|quantity/i)
  await expect(page.getByRole('heading', { name: 'Alternate path' })).toBeVisible()

  await page.getByRole('button', { name: 'Analyst', exact: true }).click()
  const analyst = page.getByTestId('analyst-account')
  const firstEvidence = analyst.getByText('Evidence annotations', { exact: true }).first()
  await firstEvidence.click()
  await expect(analyst.locator('details[open]').first()).toContainText(/evidence|model|scenario|factor/i)
})

test('another reconstruction changes the story seed without changing the verdict, probability, or factor ledger', async ({ page, browser }) => {
  await runDefaultSimulation(page)
  const verdict = await page.locator('.verdict-copy').innerText()
  const probability = await page.locator('.probability-seal strong').innerText()
  await openLikelyBattle(page)
  const originalSeed = await storySeed(page).innerText()

  await page.getByRole('button', { name: 'Another reconstruction' }).click()
  await expect(storySeed(page)).not.toHaveText(originalSeed)
  expect(await page.locator('.verdict-copy').innerText()).toBe(verdict)
  expect(await page.locator('.probability-seal strong').innerText()).toBe(probability)

  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page).toHaveURL(/[?&]r=\d+/)
  const shared = await cleanSharedPage(browser, page.url())
  try {
    await expect(shared.page.locator('.results')).toBeVisible()
    await openLikelyBattle(shared.page)
    await expect(storySeed(shared.page)).toHaveText(await storySeed(page).innerText())
    await expect(shared.page.locator('.verdict-copy')).toHaveText(verdict)
  } finally {
    await shared.context.close()
  }
})

test('history restores the saved story seed after another reconstruction', async ({ page }) => {
  test.slow()
  await runDefaultSimulation(page)
  await openLikelyBattle(page)
  await page.getByRole('button', { name: 'Another reconstruction' }).click()
  const savedSeed = await storySeed(page).innerText()
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), HISTORY_STORAGE_KEY)
  expect(stored.items?.[0]?.presentation?.storySeed).toEqual(Number(savedSeed.match(/\d+/)?.[0]))

  await page.getByRole('link', { name: /History/ }).click()
  const historyCard = page.locator('.history-card').first()
  await expect(historyCard).toBeVisible()
  await historyCard.click()
  await openLikelyBattle(page)
  await expect(storySeed(page)).toHaveText(savedSeed)
})

test('tactical controls are keyboard-operable and expose a complete transcript', async ({ page }) => {
  test.slow()
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  await expect(panel.getByText(RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Play reconstruction' })).toBeEnabled()
  await expect(panel.getByLabel('Speed')).toHaveValue('1')
  for (const name of ['Story camera', 'Tactical map', 'Free look']) await expect(panel.getByRole('button', { name })).toBeVisible()
  await expect(panel.getByText('Full reconstruction transcript', { exact: true })).toBeVisible()
  expect(await panel.locator('.tactical-transcript li').count()).toBeGreaterThan(7)
  await panel.getByText('Full reconstruction transcript', { exact: true }).click()
  await expect(panel.locator('.tactical-transcript li').first()).toContainText('Target:')
  await expect(panel.locator('.tactical-transcript li').first()).toContainText('Evidence:')
  await expect(panel.getByLabel('Quantity representation')).toBeVisible()

  const callout = panel.getByTestId('tactical-callout')
  const currentTranscript = panel.locator('.tactical-transcript li[aria-current="step"]')
  for (const value of await callout.locator('dd').allTextContents()) await expect(currentTranscript).toContainText(value)
  for (const value of (await callout.locator('p').allTextContents()).map((line) => line.replace(/^(Why|Evidence):\s*/, ''))) await expect(currentTranscript).toContainText(value)
  const firstBeat = await callout.innerText()
  await panel.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => callout.innerText()).not.toBe(firstBeat)
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => callout.innerText()).toBe(firstBeat)
  await page.keyboard.press('Space')
  await expect(panel.getByRole('button', { name: 'Pause reconstruction' })).toBeVisible()
  await panel.getByLabel('Speed').selectOption('2')
  await expect(panel.getByLabel('Speed')).toHaveValue('2')
  await panel.getByRole('button', { name: 'Free look' }).click()
  await expect(panel.getByRole('button', { name: 'Reset view' })).toBeVisible()
  await panel.getByText('Display and capture', { exact: true }).click()
  for (const name of ['Actor labels', 'Range and area overlays', 'Factor annotations', 'Reduced motion', 'Download guided PNG', 'Record guided WebM']) {
    await expect(panel.getByRole('button', { name })).toBeVisible()
  }
  await panel.getByRole('button', { name: 'Factor annotations' }).click()
  await expect(panel.locator('.factor-annotation')).toBeVisible()
})

test('the optional tactical canvas exports a labelled PNG without changing the storyboard', async ({ page }) => {
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  if (await panel.getByTestId('no-webgl-fallback').isVisible().catch(() => false)) {
    await expect(panel.getByTestId('tactical-map')).toBeVisible()
    return
  }
  const canvas = panel.getByTestId('tactical-canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  const originalCallout = await panel.getByTestId('tactical-callout').innerText()

  await panel.getByText('Display and capture', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Download guided PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^what-would-win-reconstruction-\d+\.png$/)
  const stream = await download.createReadStream()
  const signature = await new Promise<Buffer>((resolve, reject) => {
    stream.once('data', (chunk) => resolve(Buffer.from(chunk).subarray(0, 8)))
    stream.once('error', reject)
  })
  expect([...signature]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  await expect(panel.locator('.capture-status')).toContainText('Composite reconstruction image downloaded as PNG.')
  expect(await panel.getByTestId('tactical-callout').innerText()).toBe(originalCallout)
})

test('the tactical canvas records WebM where the browser exposes canvas recording', async ({ page }) => {
  test.slow()
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  if (await panel.getByTestId('no-webgl-fallback').isVisible().catch(() => false)) {
    await expect(panel.getByTestId('tactical-map')).toBeVisible()
    return
  }
  await expect(panel.getByTestId('tactical-canvas')).toBeVisible({ timeout: 15_000 })
  await panel.getByText('Display and capture', { exact: true }).click()
  const supported = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.tactical-viewport canvas')
    return Boolean(canvas && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined')
  })
  if (!supported) {
    await panel.getByRole('button', { name: 'Record guided WebM' }).click()
    await expect(panel.locator('.capture-status')).toContainText('unavailable')
    return
  }

  await panel.getByRole('button', { name: 'Record guided WebM' }).click()
  await expect(panel.getByRole('button', { name: 'Stop WebM' })).toBeVisible()
  await page.waitForTimeout(500)
  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Stop WebM' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^what-would-win-reconstruction-\d+\.webm$/)
  const stream = await download.createReadStream()
  const signature = await new Promise<Buffer>((resolve, reject) => {
    stream.once('data', (chunk) => resolve(Buffer.from(chunk).subarray(0, 4)))
    stream.once('error', reject)
  })
  expect([...signature]).toEqual([26, 69, 223, 163])
  await expect(panel.locator('.capture-status')).toContainText('Composite reconstruction recording downloaded as WebM.')
})

test('phase and beat seeking is direct, accessible, and exposes presentation timing', async ({ page }) => {
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  const callout = panel.getByTestId('tactical-callout')
  const timeline = panel.getByTestId('tactical-timeline')
  const phaseButtons = timeline.locator('.phase-seek')
  await expect(phaseButtons).toHaveCount(7)
  await expect(phaseButtons.first()).toHaveAttribute('aria-current', 'step')

  const beatButtons = timeline.locator('.beat-dots button')
  expect(await beatButtons.count()).toBeGreaterThan(7)
  expect(await beatButtons.evaluateAll((buttons) => buttons.every((button) => {
    const box = button.getBoundingClientRect()
    return box.width >= 44 && box.height >= 44
  }))).toBe(true)
  const directBeat = beatButtons.nth(3)
  await directBeat.click()
  await expect(directBeat).toHaveAttribute('aria-current', 'step')
  await expect(panel).toHaveAttribute('data-beat-progress', '0.000')
  await expect(callout).toContainText(/Beat \d+ of \d+/)
  await expect(callout).toContainText('Evidence:')

  await timeline.getByRole('button', { name: /7\. resolution/i }).click()
  await expect(callout).toContainText('Phase 7 of 7')
  await timeline.getByRole('button', { name: /5\. pressure/i }).click()
  await expect(callout).toContainText('Phase 5 of 7')
  await expect(timeline.getByRole('button', { name: /5\. pressure/i })).toHaveAttribute('aria-current', 'step')

  const sourceTimelineSeconds = Number(await panel.getAttribute('data-source-timeline-seconds'))
  const displayTimelineMs = Number(await panel.getAttribute('data-display-timeline-ms'))
  expect(sourceTimelineSeconds).toBeGreaterThan(0)
  expect(displayTimelineMs).toBeGreaterThanOrEqual(7_000)

  await panel.getByRole('button', { name: 'Play reconstruction' }).click()
  await expect(panel.getByRole('button', { name: 'Pause reconstruction' })).toBeVisible()
  await timeline.getByRole('button', { name: /3\. approach/i }).click()
  await expect(panel.getByRole('button', { name: 'Play reconstruction' })).toBeVisible()
  await expect(callout).toContainText('Phase 3 of 7')
})

test('playback advances after the validated beat display delay', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
      return contextId === 'webgl2' ? null : (original as Function).apply(this, [contextId, ...args])
    }
  })
  await runDefaultSimulation(page)
  await openTactical(page)
  await page.clock.install()

  const panel = page.getByTestId('tactical-reconstruction-panel')
  const callout = panel.getByTestId('tactical-callout')
  const firstBeat = await callout.innerText()
  await panel.getByLabel('Speed').selectOption('2')
  await panel.getByRole('button', { name: 'Play reconstruction' }).click()
  await page.evaluate(() => Promise.resolve())
  expect(await panel.getByRole('button', { name: 'Pause reconstruction' }).count()).toBe(1)
  await page.clock.fastForward(2_500)
  await page.evaluate(() => Promise.resolve())
  await expect(callout).not.toHaveText(firstBeat)
})

test('reduced-motion preference starts a tactical reconstruction paused', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await runDefaultSimulation(page)
    await openTactical(page)
    const panel = page.getByTestId('tactical-reconstruction-panel')
    await expect(panel.getByRole('button', { name: 'Play reconstruction' })).toBeDisabled()
    await expect(panel).toHaveAttribute('data-beat-progress', '1.000')
    await panel.getByText('Display and capture', { exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Reduced motion' })).toHaveAttribute('aria-pressed', 'true')
    await panel.focus()
    await page.keyboard.press('Space')
    await expect(panel.getByRole('button', { name: 'Play reconstruction' })).toBeDisabled()
    await expect(panel.getByTestId('tactical-callout')).toContainText('Phase 1 of 7')
  } finally {
    await context.close()
  }
})

test('no-WebGL keeps the accessible tactical fallback and transcript', async ({ browser }) => {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
      return contextId === 'webgl2' ? null : (original as Function).apply(this, [contextId, ...args])
    }
  })
  const page = await context.newPage()
  const requestedScripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') requestedScripts.push(request.url())
  })
  try {
    await runDefaultSimulation(page)
    await openTactical(page)
    await expect(page.getByTestId('no-webgl-fallback')).toBeVisible()
    await expect(page.getByTestId('tactical-map')).toBeVisible()
    await expect(page.getByTestId('tactical-callout')).toBeVisible()
    await expect(page.getByTestId('tactical-timeline')).toBeVisible()
    expect(await page.locator('.tactical-transcript li').count()).toBeGreaterThan(7)
    await expect(page.getByRole('button', { name: 'Story camera' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Free look' })).toBeDisabled()
    expect(requestedScripts.some((url) => /TacticalScene-[\w-]+\.js$/i.test(url))).toBe(false)
  } finally {
    await context.close()
  }
})

test('conceptual quantities never initialise a literal tactical battlefield', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Quantity').fill('10^100')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await openTactical(page)
  await expect(page.getByTestId('tactical-map')).toBeVisible()
  await expect(page.getByTestId('tactical-callout')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Story camera' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Free look' })).toBeDisabled()
  await expect(page.locator('.tactical-canvas-shell')).toHaveCount(0)
})

test('the TacticalScene chunk is deferred until tactical view is selected', async ({ page }) => {
  const requestedScripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') requestedScripts.push(request.url())
  })
  await runDefaultSimulation(page)
  await openLikelyBattle(page)
  expect(requestedScripts.some((url) => /TacticalScene-[\w-]+\.js$/i.test(url))).toBe(false)
  await openTactical(page)
  if (await page.getByTestId('no-webgl-fallback').isVisible().catch(() => false)) {
    expect(requestedScripts.some((url) => /TacticalScene-[\w-]+\.js$/i.test(url))).toBe(false)
    return
  }
  await expect.poll(() => requestedScripts.some((url) => /TacticalScene-[\w-]+\.js$/i.test(url))).toBe(true)
})

test('standalone storyboard JSON export contains the validated reconstruction record', async ({ page }) => {
  await runDefaultSimulation(page)
  const exportMenu = page.locator('details.result-export-menu')
  await exportMenu.locator('summary').press('Enter')
  await expect(exportMenu).toHaveAttribute('open', '')
  const downloadButton = exportMenu.getByRole('button', { name: 'Download storyboard JSON' })
  await expect(downloadButton).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const storyboard = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(download.suggestedFilename()).toBe('what-would-win-storyboard.json')
  expect(storyboard).toMatchObject({ version: 2, simulationSeed: expect.any(Number), storySeed: expect.any(Number), phases: expect.any(Array) })
  expect(storyboard.phases).toHaveLength(7)
  expect(storyboard.evidence.length).toBeGreaterThan(0)
  expect(storyboard.phases.every((phase: { storyBeats?: unknown[] }) => (phase.storyBeats?.length ?? 0) > 0)).toBe(true)
  expect(storyboard.caveats).toContain(RECONSTRUCTION_NOTICE)
})
