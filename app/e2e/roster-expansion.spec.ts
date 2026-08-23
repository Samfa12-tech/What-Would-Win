import { expect, test, type Page } from '@playwright/test'

const ROSTER_EXPANSION = [
  { id: 'musk-ox', name: 'Musk ox' },
  { id: 'tasmanian-devil', name: 'Tasmanian devil' },
  { id: 'giant-armadillo', name: 'Giant armadillo' },
  { id: 'capybara', name: 'Capybara' },
  { id: 'harpy-eagle', name: 'Harpy eagle' },
  { id: 'piranha', name: 'Piranha' },
  { id: 'giant-otter', name: 'Giant otter' },
  { id: 'leopard-seal', name: 'Leopard seal' },
  { id: 'giant-freshwater-stingray', name: 'Giant freshwater stingray' },
  { id: 'coconut-crab', name: 'Coconut crab' },
  { id: 'utahraptor', name: 'Utahraptor' },
  { id: 'mosasaurus', name: 'Mosasaurus' },
  { id: 'dunkleosteus', name: 'Dunkleosteus' },
  { id: 'glyptodon', name: 'Glyptodon' },
  { id: 'average-unarmed-adult-human', name: 'Average unarmed adult human' },
  { id: 'trained-heavyweight-boxer', name: 'Trained heavyweight boxer' },
  { id: 'trained-wrestler', name: 'Trained wrestler' },
  { id: 'sumo-wrestler', name: 'Sumo wrestler' },
  { id: 'armoured-sword-and-shield-fighter', name: 'Armoured sword-and-shield fighter' },
  { id: 'prepared-crossbow-carrier', name: 'Prepared crossbow carrier' },
] as const

const EXPECTED_CATEGORY_TOTALS = [
  ['Living animals', 86],
  ['Extinct animals', 25],
  ['Fantasy & mythology', 38],
  ['Generic humans', 10],
] as const

const SIMPLE_MODE_SMOKE = [
  { id: 'musk-ox', name: 'Musk ox' },
  { id: 'prepared-crossbow-carrier', name: 'Prepared crossbow carrier' },
] as const

async function openDeepDive(page: Page) {
  await page.getByRole('button', { name: 'Deep dive' }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible()
}

async function assertDeepDiveRosterSearches(page: Page, side: 'solo' | 'group') {
  const search = page.getByTestId(`${side}-creature-search`)
  const select = page.getByTestId(`${side}-creature-select`)
  const searchStatus = page.locator(`#${side}-search-help`)

  await expect(select.locator('option')).toHaveCount(159)
  for (const [label, total] of EXPECTED_CATEGORY_TOTALS) {
    await expect(select.locator(`optgroup[label="${label}"] option`)).toHaveCount(total)
  }

  for (const entry of ROSTER_EXPANSION) {
    await search.fill(entry.name)
    await expect(searchStatus).toHaveText('1 matching profile; the selected profile stays available.')
    await expect(select.locator(`option[value="${entry.id}"]`)).toHaveText(entry.name)
    await select.selectOption(entry.id)
    await expect(select).toHaveValue(entry.id)
  }
}

async function assertSimpleRosterSearches(page: Page, side: 'solo' | 'group') {
  const search = page.getByTestId(`${side}-simple-creature-search`)
  const select = page.getByTestId(`${side}-creature-select`)
  const searchStatus = page.locator(`#simple-${side}-search-status`)

  await expect(select.locator('option')).toHaveCount(159)
  for (const entry of SIMPLE_MODE_SMOKE) {
    await search.fill(entry.name)
    await expect(searchStatus).toHaveText('1 matching creature. Open the contestant list to choose one.')
    await expect(select.locator(`option[value="${entry.id}"]`)).toHaveText(entry.name)
    await select.selectOption(entry.id)
    await expect(select).toHaveValue(entry.id)
  }
}

test('makes every 0.9 roster addition searchable and selectable in both modes without browser errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')
  await openDeepDive(page)

  for (const side of ['solo', 'group'] as const) await assertDeepDiveRosterSearches(page, side)

  await page.getByRole('button', { name: 'Simple' }).click()
  await expect(page.getByTestId('simple-mode')).toBeVisible()
  for (const side of ['solo', 'group'] as const) await assertSimpleRosterSearches(page, side)

  const reflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }))
  expect(reflow.pageWidth).toBeLessThanOrEqual(reflow.viewportWidth + 1)
  expect(consoleErrors).toEqual([])
})
