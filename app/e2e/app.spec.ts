import { readFile } from 'node:fs/promises'
import { expect, test, type Browser, type Page } from '@playwright/test'

const CUSTOM_STORAGE_KEY = 'what-would-win-custom-creatures-v1'
const CUSTOM_NAME = 'Codex Field Beast'

function soloPanel(page: Page) {
  return page.locator('.combatant-panel').filter({
    has: page.getByRole('heading', { name: 'The one', exact: true }),
  })
}

async function createSavedCustom(page: Page, name = CUSTOM_NAME): Promise<string> {
  await soloPanel(page).getByRole('button', { name: 'Clone as custom' }).click()
  const editor = page.getByTestId('custom-creature-editor')
  await expect(editor).toBeVisible()
  await editor.getByTestId('custom-name').fill(name)
  await editor.getByLabel('Attack', { exact: true }).fill('73')
  await editor.getByLabel('Model notes and assumptions').fill('Browser-authored calibration profile for a transparent test scenario.')
  await editor.getByTestId('save-custom-creature').click()
  await expect(page.locator('.custom-status')).toContainText(`${name} was saved privately in this browser.`)
  const customId = await page.getByTestId('solo-creature-select').inputValue()
  expect(customId).toMatch(/^custom:/)
  return customId
}

function decodeSharePayload(url: string): Record<string, unknown> {
  const encoded = new URL(url).searchParams.get('s')
  expect(encoded).toBeTruthy()
  return JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')) as Record<string, unknown>
}

function encodeSharePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

async function openSharedScenarioInCleanBrowser(browser: Browser, shareUrl: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(shareUrl)
  return { context, page }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads the production app with its interpretation and privacy disclosures', async ({ page }) => {
  await expect(page).toHaveTitle(/What Would Win/)
  await expect(page.getByRole('heading', { name: 'What Would Win' })).toBeVisible()
  await expect(page.getByText(/transparent entertainment model, not a scientific prediction/i)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Custom profile tools' })).toContainText('save it only in this browser')
  await expect(page.locator('footer')).toContainText(/Model .+ · Data .+ · React\/TypeScript/)
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled()
})

test('rejects invalid quantities and handles 10^100 as a conceptual calculation', async ({ page }) => {
  const quantity = page.getByLabel('Quantity')
  await quantity.fill('0')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a whole-number quantity')

  await quantity.fill('10^100')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.getByText(/Conceptual-scale result:/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('technical depth runs 15,000 trials and exposes the calculation record', async ({ page }) => {
  await page.getByText('Technical record', { exact: true }).click()
  await expect(page.getByText('15,000 uncertainty trials')).toBeVisible()
  await page.getByRole('button', { name: 'Run simulation' }).click()

  const record = page.locator('.technical-grid')
  await expect(page.getByText('Technical calculation record')).toBeVisible()
  await expect(record.getByText('Trials', { exact: true })).toBeVisible()
  await expect(record.getByText('15,000', { exact: true })).toBeVisible()
})

test('clones, names, edits, saves, reloads and uses a private custom profile', async ({ page }) => {
  const customId = await createSavedCustom(page)
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), CUSTOM_STORAGE_KEY)
  expect(stored.storageVersion).toBe(1)
  expect(stored.items[0].creature).toMatchObject({ id: customId, name: CUSTOM_NAME, attack: 73 })

  await page.reload()
  await page.getByTestId('solo-creature-select').selectOption(customId)
  await expect(page.getByTestId('solo-creature-select').locator('option:checked')).toHaveText(CUSTOM_NAME)
  await soloPanel(page).getByRole('button', { name: 'Edit custom' }).click()
  await page.getByTestId('custom-creature-editor').getByLabel('Attack', { exact: true }).fill('81')
  await page.getByTestId('save-custom-creature').click()
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results').getByRole('heading', { name: CUSTOM_NAME, level: 2 })).toBeVisible()

  const edited = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), CUSTOM_STORAGE_KEY)
  expect(edited.items[0].creature.attack).toBe(81)
})

test('versioned share URL embeds a custom profile without saving it in a clean browser', async ({ page, browser }) => {
  const customId = await createSavedCustom(page, 'Shared Field Beast')
  await page.getByLabel('Quantity').fill('37')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  const groupId = await page.getByTestId('group-creature-select').inputValue()

  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page).toHaveURL(/\?s=/)
  const shareUrl = page.url()
  const payload = decodeSharePayload(shareUrl)
  expect(payload).toEqual(expect.objectContaining({
    formatVersion: expect.any(Number),
    modelVersion: expect.any(String),
    dataVersion: expect.any(String),
  }))
  expect(payload.customCreatures).toEqual([
    expect.objectContaining({ id: customId, name: 'Shared Field Beast' }),
  ])

  const clean = await openSharedScenarioInCleanBrowser(browser, shareUrl)
  try {
    await expect(clean.page.getByTestId('solo-creature-select')).toHaveValue(customId)
    await expect(clean.page.getByTestId('group-creature-select')).toHaveValue(groupId)
    await expect(clean.page.getByLabel('Quantity')).toHaveValue('37')
    await expect(clean.page.getByTestId('solo-creature-select').locator('option:checked')).toHaveText('Shared Field Beast')
    expect(await clean.page.evaluate((key) => localStorage.getItem(key), CUSTOM_STORAGE_KEY)).toBeNull()
    await expect(soloPanel(clean.page).getByRole('button', { name: 'Edit custom' })).toHaveCount(0)
    await expect(soloPanel(clean.page).getByRole('button', { name: 'Clone as custom' })).toBeVisible()
  } finally {
    await clean.context.close()
  }
})

test('a shared custom profile cannot shadow a saved local profile with the same ID', async ({ page }) => {
  const customId = await createSavedCustom(page, 'Saved Local Beast')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page).toHaveURL(/\?s=/)
  const payload = decodeSharePayload(page.url())
  const shared = (payload.customCreatures as Array<Record<string, unknown>>)[0]
  shared.name = 'Shared Shadow Beast'

  await page.goto(`/?s=${encodeSharePayload(payload)}`)

  await expect(page.getByRole('alert')).toContainText('ignored because a saved local profile uses the same ID')
  await expect(page.getByTestId('solo-creature-select')).toHaveValue(customId)
  await expect(page.getByTestId('solo-creature-select').locator('option:checked')).toHaveText('Saved Local Beast')
})

test('corrupt custom-profile storage recovers visibly without overwriting the stored data', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, '{not valid json'), CUSTOM_STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('alert')).toContainText('Saved custom profiles contain invalid JSON')
  await expect(page.getByRole('alert')).toContainText('stored data was left untouched')
  expect(await page.evaluate((key) => localStorage.getItem(key), CUSTOM_STORAGE_KEY)).toBe('{not valid json')
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled()
})

test('result JSON download includes version metadata and the selected custom record', async ({ page }) => {
  const customId = await createSavedCustom(page, 'Exported Field Beast')
  await page.getByRole('button', { name: 'Run simulation' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download result JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('what-would-win-result.json')
  const path = await download.path()
  expect(path).toBeTruthy()
  const exported = JSON.parse(await readFile(path!, 'utf8'))

  expect(exported.modelVersion).toEqual(expect.any(String))
  expect(exported.dataVersion).toEqual(expect.any(String))
  expect(exported.shareFormatVersion).toEqual(expect.any(Number))
  expect(exported.result.technical.modelVersion).toBe(exported.modelVersion)
  expect(exported.result.technical.dataVersion).toBe(exported.dataVersion)
  expect(exported.scenario.soloId).toBe(customId)
  expect(exported.contestants.solo).toMatchObject({ id: customId, name: 'Exported Field Beast' })
  expect(exported.customCreatures).toEqual([
    expect.objectContaining({ id: customId, name: 'Exported Field Beast' }),
  ])
})

test('360px mobile layout has no horizontal overflow, including the custom editor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'The dedicated mobile project owns the 360px contract.')
  expect(await page.evaluate(() => window.innerWidth)).toBe(360)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  await soloPanel(page).getByRole('button', { name: 'Clone as custom' }).click()
  await expect(page.getByTestId('custom-creature-editor')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
