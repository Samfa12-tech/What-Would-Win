import { readFile } from 'node:fs/promises'
import { expect, test, type Browser, type Page } from '@playwright/test'

const CUSTOM_STORAGE_KEY = 'what-would-win-custom-creatures-v1'
const HISTORY_STORAGE_KEY = 'what-would-win-history-v1'
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

interface CompactSharePayload {
  formatVersion: number
  modelVersion: string
  dataVersion: string
  scenario: unknown
  customCreatures?: unknown[][]
}

function decodeSharePayload(url: string): CompactSharePayload {
  const encoded = new URL(url).searchParams.get('s')
  expect(encoded).toBeTruthy()
  const separatorIndex = encoded!.indexOf('.')
  expect(separatorIndex).toBeGreaterThan(0)
  const formatVersion = Number(encoded!.slice(0, separatorIndex))
  const wire = JSON.parse(Buffer.from(encoded!.slice(separatorIndex + 1), 'base64url').toString('utf8')) as unknown[]
  return {
    formatVersion,
    modelVersion: wire[0] as string,
    dataVersion: wire[1] as string,
    scenario: wire[2],
    ...(wire.length === 4 ? { customCreatures: wire[3] as unknown[][] } : {}),
  }
}

function encodeSharePayload(payload: CompactSharePayload): string {
  const wire = [
    payload.modelVersion,
    payload.dataVersion,
    payload.scenario,
    ...(payload.customCreatures ? [payload.customCreatures] : []),
  ]
  return `${payload.formatVersion}.${Buffer.from(JSON.stringify(wire), 'utf8').toString('base64url')}`
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
  await page.getByText('How the model works', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Transparent assumptions, deterministic authority' })).toBeVisible()
  await expect(page.getByText('one versus X', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Custom profile tools' })).toContainText('save it only in this browser')
  await expect(page.locator('footer')).toContainText(/Model .+ · Data .+ · React\/TypeScript/)
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeEnabled()
})

test('searches the roster and loads a suggested field briefing', async ({ page }) => {
  const soloSearch = page.getByTestId('solo-creature-search')
  const soloSelect = page.getByTestId('solo-creature-select')

  await soloSearch.fill('whale')
  await expect(soloSelect.locator('option')).toHaveCount(3)
  await expect(soloSelect.locator('option[value="sperm-whale"]')).toHaveCount(1)
  await expect(soloSelect.locator('option[value="blue-whale"]')).toHaveCount(1)

  await page.getByRole('button', { name: /Pressure in deep water/ }).click()
  await expect(soloSelect).toHaveValue('sperm-whale')
  await expect(page.getByTestId('group-creature-select')).toHaveValue('orca')
  await expect(page.getByLabel('Quantity')).toHaveValue('8')
  await expect(page.getByLabel('Terrain')).toHaveValue('deep-ocean')
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toContainText('8 × Orca')
  await expect(page.getByText('Unrun changes', { exact: true })).toHaveCount(1)
})

test('publishes the branded icon and install metadata', async ({ page, request }) => {
  await expect(page.locator('link[rel="icon"][sizes="any"]')).toHaveAttribute('href', './icons/favicon.ico')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', './icons/apple-touch-icon.png')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './site.webmanifest')

  const manifestResponse = await request.get('/site.webmanifest')
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json() as { name: string; icons: Array<{ src: string; sizes: string }> }
  expect(manifest.name).toBe('What Would Win')
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: 'icons/icon-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: 'icons/icon-512.png', sizes: '512x512' }),
  ]))

  const iconResponse = await request.get('/icons/icon-192.png')
  expect(iconResponse.ok()).toBe(true)
  expect(iconResponse.headers()['content-type']).toContain('image/png')
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

test('debate methodology controls survive simulation, history and a clean-browser share', async ({ page, browser }) => {
  await page.getByTestId('solo-creature-select').selectOption('sperm-whale')
  await page.getByTestId('group-creature-select').selectOption('orca')
  await page.getByLabel('Quantity').fill('8')
  await page.getByLabel('Win condition').selectOption('death')
  await page.getByLabel(/Sperm whale mindset/).selectOption('bloodlusted')
  await page.getByLabel(/Orca mindset/).selectOption('committed')
  await page.getByText('Advanced dossier', { exact: true }).click()
  await page.getByLabel('Prior knowledge').selectOption('both')
  await page.getByLabel('Initial awareness advantage').selectOption('solo')
  await page.getByLabel('Initial facing').selectOption('group-exposed')
  await page.getByLabel('Arena boundary').selectOption('open')
  await page.getByLabel('Arena diameter (m)').fill('1000')
  await page.getByLabel('Water depth (m)').fill('50')
  await page.getByLabel('Group doctrine').selectOption('disciplined')
  await page.getByLabel('Group casualty tolerance').selectOption('unlimited')
  await page.getByLabel('Solo specimen basis').selectOption('prime-adult')
  await page.getByLabel('Solo specimen sex').selectOption('female')
  await page.getByRole('button', { name: 'Run simulation' }).click()

  await page.getByText('Assumptions and limitations', { exact: true }).click()
  await expect(page.getByText(/Mindsets are solo: bloodlusted and group: committed/)).toBeVisible()
  await expect(page.getByText(/Water depth is fixed at 50 m/)).toBeVisible()
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), HISTORY_STORAGE_KEY)
  expect(stored.items[0].scenario).toMatchObject({
    winCondition: 'death', soloMindset: 'bloodlusted', groupMindset: 'committed',
    priorKnowledge: 'both', arenaBoundary: 'open', waterDepthM: 50,
    coordinationDoctrine: 'disciplined', casualtyTolerance: 'unlimited',
    soloSpecimenProfile: 'prime-adult', soloSpecimenSex: 'female',
  })

  await page.getByRole('button', { name: 'Copy share link' }).click()
  const clean = await openSharedScenarioInCleanBrowser(browser, page.url())
  try {
    await expect(clean.page.getByLabel('Win condition')).toHaveValue('death')
    await expect(clean.page.getByLabel(/Sperm whale mindset/)).toHaveValue('bloodlusted')
    await clean.page.getByText('Advanced dossier', { exact: true }).click()
    await expect(clean.page.getByLabel('Water depth (m)')).toHaveValue('50')
    await expect(clean.page.getByLabel('Group doctrine')).toHaveValue('disciplined')
    await expect(clean.page.getByLabel('Solo specimen sex')).toHaveValue('female')
  } finally {
    await clean.context.close()
  }
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
  expect(payload.customCreatures?.[0]?.[0]).toBe(customId)
  expect(payload.customCreatures?.[0]?.[1]).toBe('Shared Field Beast')

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
  const shared = payload.customCreatures?.[0]
  expect(shared).toBeTruthy()
  shared![1] = 'Shared Shadow Beast'

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

test('legacy history migrates to a versioned envelope and corrupt history remains untouched', async ({ page }) => {
  await page.getByRole('button', { name: 'Run simulation' }).click()
  const current = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), HISTORY_STORAGE_KEY)
  const legacy = current.items.map(({ formatVersion: _formatVersion, modelVersion: _modelVersion, dataVersion: _dataVersion, ...item }: Record<string, unknown>) => item)
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: HISTORY_STORAGE_KEY, value: JSON.stringify(legacy) })
  await page.reload()

  await expect(page.getByTestId('history-warning')).toContainText('migrated')
  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), HISTORY_STORAGE_KEY)
  expect(migrated.storageVersion).toBe(1)
  expect(migrated.items[0]).toEqual(expect.objectContaining({
    formatVersion: 1,
    modelVersion: expect.any(String),
    dataVersion: expect.any(String),
  }))

  await page.evaluate((key) => localStorage.setItem(key, '{bad history json'), HISTORY_STORAGE_KEY)
  await page.reload()
  await expect(page.getByTestId('history-warning')).toContainText('invalid JSON')
  expect(await page.evaluate((key) => localStorage.getItem(key), HISTORY_STORAGE_KEY)).toBe('{bad history json')
})

test('history entries referencing a deleted custom profile remain visible but cannot be restored', async ({ page }) => {
  await createSavedCustom(page, 'History Field Beast')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await soloPanel(page).getByRole('button', { name: 'Delete custom' }).click()
  await page.reload()

  await expect(page.getByTestId('history-warning')).toContainText('profile that is no longer available')
  const unavailableCard = page.locator('.history-card').filter({ hasText: 'History Field Beast' })
  await expect(unavailableCard).toBeDisabled()
  await expect(unavailableCard).toContainText('Unavailable: missing custom profile')
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
  expect(exported.scenario).toEqual(expect.objectContaining({
    winCondition: 'incapacitation',
    soloMindset: 'natural',
    arenaBoundary: 'bounded',
  }))
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
