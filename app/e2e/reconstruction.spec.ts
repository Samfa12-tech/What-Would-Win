import { expect, test, type Browser, type Page } from '@playwright/test'

const HISTORY_STORAGE_KEY = 'what-would-win-history-v3'
const RECONSTRUCTION_NOTICE = 'A likely story based on the result—not a replay of an individual trial.'

async function openDeepDive(page: Page) {
  await page.getByRole('button', { name: 'Deep dive' }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible()
}

async function runDefaultSimulation(page: Page) {
  await page.goto('/')
  await openDeepDive(page)
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results')).toBeVisible()
}

function storySeed(page: Page) {
  return page.getByText(/Story seed \d+ changes presentation(?: choices)? only\./)
}

async function openLikelyBattle(page: Page) {
  const tab = page.getByRole('tab', { name: 'Likely battle', exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  }).toPass({ timeout: 30_000 })
  await expect(page.getByTestId('likely-battle-panel')).toBeVisible({ timeout: 30_000 })
}

async function cleanSharedPage(browser: Browser, url: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  await openDeepDive(page)
  return { context, page }
}

test('likely battle is a fully annotated, explicitly non-trial presentation', async ({ page }) => {
  await runDefaultSimulation(page)
  await openLikelyBattle(page)

  await expect(page.getByText(RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  const reader = page.getByLabel('Readable likely battle account')
  await expect(reader.locator('.layman-story-stage')).toHaveCount(3)
  const reasonCount = await reader.getByRole('list', { name: 'Clear reasons for the result' }).getByRole('listitem').count()
  expect(reasonCount).toBeGreaterThanOrEqual(1)
  expect(reasonCount).toBeLessThanOrEqual(3)
  await expect(reader).toHaveAttribute('data-story-issues', '0')
  await expect(reader).toContainText(/horse-sized mallard duck/i)
  await expect(reader).toContainText(/100 duck-sized horses/i)
  await expect(reader).toContainText(/600 kilograms/i)
  await expect(reader).toContainText(/1\.5 kilograms/i)
  await expect(page.getByLabel('Quantity representation disclosure')).toContainText(/roughly the force of 6 attackers.*not a literal count of bodies attacking at once/i)
  await expect(reader).toContainText(/reasons that matter|main edge|advantage that matters/i)
  await expect(reader).not.toContainText(/Legacy|aquatic movement|death condition|contest closes/i)
  expect(await reader.locator('.evidence-tooltip-trigger').count()).toBe(await reader.locator('.evidence-anchor .evidence-tooltip-trigger').count())
  const details = page.locator('details.detailed-reconstruction')
  await expect(details).not.toHaveAttribute('open', '')
  await expect(page.getByLabel('Seven-phase detailed reconstruction')).not.toBeVisible()
  await details.locator('summary').click()
  await expect(page.getByLabel('Seven-phase detailed reconstruction').locator('> section')).toHaveCount(7)
  await expect(page.getByLabel('Quantity representation disclosure')).toContainText(/join the fight|declared|wait behind/i)
  await expect(page.getByRole('heading', { name: 'Alternate path' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Analyst', exact: true }).click()
  const analyst = page.getByTestId('analyst-account')
  const evidenceDetails = analyst.locator('details').filter({ hasText: 'Evidence annotations' }).last()
  await expect(evidenceDetails).toContainText(/evidence|model|scenario|factor/i)
})

test('another reconstruction changes the story seed without changing the verdict, probability, or factor ledger', async ({ page, browser }) => {
  test.slow()
  await runDefaultSimulation(page)
  const verdict = await page.locator('.verdict-copy').innerText()
  const probability = await page.locator('.probability-seal strong').innerText()
  await openLikelyBattle(page)
  const originalSeed = await storySeed(page).innerText()
  const originalStory = await page.locator('.layman-story').innerText()

  await page.getByRole('button', { name: 'Another reconstruction' }).click()
  await expect(storySeed(page)).not.toHaveText(originalSeed)
  await expect(page.locator('.layman-story')).not.toHaveText(originalStory)
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
  expect(storyboard).toMatchObject({ version: 3, simulationSeed: expect.any(Number), storySeed: expect.any(Number), phases: expect.any(Array) })
  expect(storyboard.phases).toHaveLength(7)
  expect(storyboard.evidence.length).toBeGreaterThan(0)
  expect(storyboard.phases.every((phase: { storyBeats?: unknown[] }) => (phase.storyBeats?.length ?? 0) > 0)).toBe(true)
  expect(storyboard.caveats).toContain(RECONSTRUCTION_NOTICE)
})
