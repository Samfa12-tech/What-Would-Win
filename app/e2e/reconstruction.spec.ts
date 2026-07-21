import { expect, test, type Browser, type Page } from '@playwright/test'

const HISTORY_STORAGE_KEY = 'what-would-win-history-v2'
const RECONSTRUCTION_NOTICE = 'One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.'

async function runDefaultSimulation(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results')).toBeVisible()
}

function storySeed(page: Page) {
  return page.getByText(/Story seed \d+ changes presentation choices only\./)
}

async function openLikelyBattle(page: Page) {
  const tab = page.getByRole('button', { name: 'Likely battle', exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  }).toPass({ timeout: 15_000 })
  await expect(page.getByTestId('likely-battle-panel')).toBeVisible({ timeout: 15_000 })
}

async function openTactical(page: Page) {
  const tab = page.getByRole('button', { name: 'Tactical reconstruction', exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  }).toPass({ timeout: 15_000 })
  await expect(page.getByTestId('tactical-reconstruction-panel')).toBeVisible({ timeout: 15_000 })
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
  await expect(page.getByLabel('Seven-phase battle account').locator('> li')).toHaveCount(7)
  await expect(page.getByLabel('Quantity representation disclosure')).toContainText(/visible|represented|active|quantity/i)
  await expect(page.getByRole('heading', { name: 'Alternate path' })).toBeVisible()

  const firstEvidence = page.getByText('Evidence annotations', { exact: true }).first()
  await firstEvidence.click()
  await expect(page.locator('.storyboard-timeline details').first()).toContainText(/factors|scenario condition/i)
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
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  await expect(panel.getByText(RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Play' })).toBeEnabled()
  await expect(panel.getByLabel('Playback speed')).toHaveValue('1')
  await expect(panel.getByRole('button', { name: 'Directed camera' })).toBeVisible()
  for (const name of ['Labels', 'Attack ranges', 'Effective counts', 'Factor annotations', 'Reduced motion', 'Phase tones', 'Download scene PNG', 'Record scene WebM']) {
    await expect(panel.getByRole('button', { name })).toBeVisible()
  }
  await expect(panel.getByText('Full reconstruction transcript', { exact: true })).toBeVisible()
  await expect(panel.locator('.tactical-transcript li')).toHaveCount(7)
  await expect(panel.getByTestId('effective-counts')).toBeVisible()

  await panel.focus()
  await page.keyboard.press('ArrowRight')
  await expect(panel.getByTestId('tactical-caption')).toContainText('Phase 2 of 7')
  await page.keyboard.press('ArrowLeft')
  await expect(panel.getByTestId('tactical-caption')).toContainText('Phase 1 of 7')
  await page.keyboard.press('Space')
  await expect(panel.getByRole('button', { name: 'Pause' })).toBeVisible()
  await panel.getByLabel('Playback speed').selectOption('2')
  await expect(panel.getByLabel('Playback speed')).toHaveValue('2')
  await panel.getByRole('button', { name: 'Directed camera' }).click()
  await expect(panel.getByRole('button', { name: 'Free camera' })).toBeVisible()
  await panel.getByRole('button', { name: 'Factor annotations' }).click()
  await expect(panel.locator('.factor-annotation')).toBeVisible()
})

test('the optional tactical canvas exports a labelled PNG without changing the storyboard', async ({ page }) => {
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  if (await panel.getByTestId('no-webgl-fallback').isVisible().catch(() => false)) {
    await expect(panel.getByRole('button', { name: 'Download scene PNG' })).toBeDisabled()
    await expect(panel.getByRole('button', { name: 'Record scene WebM' })).toBeDisabled()
    return
  }
  const canvas = panel.getByTestId('tactical-canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  const originalCaption = await panel.getByTestId('tactical-caption').innerText()

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Download scene PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^what-would-win-reconstruction-\d+\.png$/)
  const stream = await download.createReadStream()
  const signature = await new Promise<Buffer>((resolve, reject) => {
    stream.once('data', (chunk) => resolve(Buffer.from(chunk).subarray(0, 8)))
    stream.once('error', reject)
  })
  expect([...signature]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  await expect(panel.locator('.capture-status')).toContainText('Scene image downloaded as PNG.')
  expect(await panel.getByTestId('tactical-caption').innerText()).toBe(originalCaption)
})

test('the tactical canvas records WebM where the browser exposes canvas recording', async ({ page }) => {
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  if (await panel.getByTestId('no-webgl-fallback').isVisible().catch(() => false)) {
    await expect(panel.getByRole('button', { name: 'Record scene WebM' })).toBeDisabled()
    return
  }
  await expect(panel.getByTestId('tactical-canvas')).toBeVisible({ timeout: 15_000 })
  const supported = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.tactical-canvas-shell canvas')
    return Boolean(canvas && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined')
  })
  if (!supported) {
    await panel.getByRole('button', { name: 'Record scene WebM' }).click()
    await expect(panel.locator('.capture-status')).toContainText('unavailable')
    return
  }

  await panel.getByRole('button', { name: 'Record scene WebM' }).click()
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
  await expect(panel.locator('.capture-status')).toContainText('Scene recording downloaded as WebM.')
})

test('phase seeking is direct, accessible, and exposes the modelled timeline', async ({ page }) => {
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  const caption = panel.getByTestId('tactical-caption')
  const seek = panel.getByLabel('Seek to battle phase')

  await expect(seek).toHaveAttribute('min', '1')
  await expect(seek).toHaveAttribute('max', '7')
  await expect(seek).toHaveAttribute('aria-valuetext', 'Phase 1: briefing')
  await seek.focus()
  await page.keyboard.press('End')
  await expect(caption).toContainText('Phase 7 of 7: resolution')
  await page.keyboard.press('Home')
  await expect(caption).toContainText('Phase 1 of 7: briefing')
  await seek.fill('5')
  await expect(caption).toContainText('Phase 5 of 7: pressure')
  await expect(seek).toHaveAttribute('aria-valuetext', 'Phase 5: pressure')

  const sourceStartSeconds = Number(await caption.getAttribute('data-source-start-seconds'))
  const sourceDurationSeconds = Number(await caption.getAttribute('data-source-duration-seconds'))
  const sourceTimelineSeconds = Number(await panel.getAttribute('data-source-timeline-seconds'))
  const displayTimelineMs = Number(await panel.getAttribute('data-display-timeline-ms'))
  expect(sourceStartSeconds).toBeGreaterThan(0)
  expect(sourceDurationSeconds).toBeGreaterThan(0)
  expect(sourceTimelineSeconds).toBeGreaterThan(sourceStartSeconds)
  expect(displayTimelineMs).toBeGreaterThanOrEqual(7_000)
  expect(displayTimelineMs).toBeLessThanOrEqual(21_000)
  await expect(caption.locator('.tactical-timing')).toContainText(/Modelled time .* seconds .* playback/)

  await panel.getByRole('button', { name: 'Play' }).click()
  await expect(panel.getByRole('button', { name: 'Pause' })).toBeVisible()
  await seek.fill('3')
  await expect(panel.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(caption).toContainText('Phase 3 of 7: approach')
})

test('playback advances after the metadata-derived phase delay', async ({ page }) => {
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
  const caption = panel.getByTestId('tactical-caption')
  await panel.getByLabel('Playback speed').selectOption('2')

  const sourcePhaseSeconds = Number(await caption.getAttribute('data-source-duration-seconds'))
  const sourceTimelineSeconds = Number(await panel.getAttribute('data-source-timeline-seconds'))
  const displayTimelineMs = Number(await panel.getAttribute('data-display-timeline-ms'))
  const expectedDelayMs = Math.max(250, Math.round((sourcePhaseSeconds / sourceTimelineSeconds) * displayTimelineMs / 2))
  await expect(caption).toHaveAttribute('data-display-delay-ms', String(expectedDelayMs))

  await panel.getByRole('button', { name: 'Play' }).click()
  await page.evaluate(() => Promise.resolve())
  expect(await panel.getByRole('button', { name: 'Pause' }).count()).toBe(1)
  await page.clock.fastForward(Math.floor(expectedDelayMs / 2))
  expect(await caption.innerText()).toContain('Phase 1 of 7')
  await page.clock.fastForward(Math.ceil(expectedDelayMs / 2))
  await page.evaluate(() => Promise.resolve())
  expect(await caption.innerText()).toContain('Phase 2 of 7')
})

test('reduced-motion preference starts a tactical reconstruction paused', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await runDefaultSimulation(page)
    await openTactical(page)
    const panel = page.getByTestId('tactical-reconstruction-panel')
    await expect(panel.getByRole('button', { name: 'Play' })).toBeDisabled()
    await expect(panel.getByRole('button', { name: 'Reduced motion' })).toHaveAttribute('aria-pressed', 'true')
    await panel.focus()
    await page.keyboard.press('Space')
    await expect(panel.getByRole('button', { name: 'Play' })).toBeDisabled()
    await expect(panel.getByTestId('tactical-caption')).toContainText('Phase 1 of 7')
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
    await expect(page.locator('.tactical-transcript li')).toHaveCount(7)
    await expect(page.getByRole('button', { name: 'Download scene PNG' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Record scene WebM' })).toBeDisabled()
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
  await expect(page.getByTestId('conceptual-tactical-fallback')).toBeVisible()
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
  await page.getByText('Export files', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download storyboard JSON' }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const storyboard = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(download.suggestedFilename()).toBe('what-would-win-storyboard.json')
  expect(storyboard).toMatchObject({ version: 1, simulationSeed: expect.any(Number), storySeed: expect.any(Number), phases: expect.any(Array) })
  expect(storyboard.phases).toHaveLength(7)
  expect(storyboard.caveats).toContain(RECONSTRUCTION_NOTICE)
})
