import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const RECONSTRUCTION_NOTICE = 'A likely story based on the result—not a replay of an individual trial.'

function visibleWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function renderedText(page: Page): Promise<string> {
  return page.locator('body').evaluate((body) => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
    const text: string[] = []
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement
      if (!parent || parent.closest('select, option, [hidden], .visually-hidden')) continue
      const style = getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const value = walker.currentNode.textContent?.trim()
      if (value) text.push(value)
    }
    for (const select of body.querySelectorAll('select')) {
      if (getComputedStyle(select).display !== 'none') text.push(select.selectedOptions[0]?.textContent?.trim() ?? '')
    }
    return text.join(' ')
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('defaults to a concise stepped matchup instead of the expert workspace', async ({ page }) => {
  await expect(page.getByTestId('simple-mode')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Simple' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Build your matchup' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Set the scene' })).toHaveCount(0)
  await expect(page.getByTestId('simple-result')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toHaveCount(0)

  const visibleText = await renderedText(page)
  const visibleControls = await page.locator('button:visible, input:visible, select:visible, a:visible').count()
  expect(visibleWordCount(visibleText)).toBeLessThanOrEqual(210)
  expect(visibleControls).toBeLessThanOrEqual(23)
})

test('searches the full roster without adding expert controls', async ({ page }) => {
  const soloSearch = page.getByTestId('solo-simple-creature-search')
  await soloSearch.fill('tyrannosaurus')

  const soloSelect = page.getByTestId('solo-creature-select')
  await expect(soloSelect.locator('option', { hasText: 'Tyrannosaurus rex' })).toHaveCount(1)
  await soloSelect.selectOption({ label: 'Tyrannosaurus rex' })

  await expect(soloSearch).toHaveValue('')
  await expect(soloSelect).toHaveValue('tyrannosaurus-rex')
})

test('walks a casual user from contestants to a concise, authoritative result', async ({ page }) => {
  test.slow()
  await page.getByTestId('solo-creature-select').selectOption('mallard-duck')
  await page.getByTestId('group-creature-select').selectOption('horse')
  await page.getByLabel('The one size').selectOption('named:horse')
  await page.getByLabel('The many size').selectOption('named:duck')
  await page.getByLabel('Quantity').fill('100')

  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await expect(page.getByRole('heading', { name: 'Set the scene' })).toBeVisible()
  await page.getByLabel('Creature resizing').selectOption('strict')
  await page.getByLabel('Battlefield').selectOption('open')
  await page.getByLabel('Fight style').selectOption('natural')
  await page.getByRole('button', { name: /Who would win/ }).click()

  const result = page.getByTestId('simple-result')
  await expect(result).toBeVisible()
  await expect(result.getByText('Why', { exact: false }).first()).toBeVisible()
  const likelyStory = result.getByTestId('simple-likely-copy')
  await expect(likelyStory).toBeVisible()
  await expect(likelyStory.locator('section')).toHaveCount(3)
  await expect(likelyStory).toHaveAttribute('data-story-issues', '0')
  await expect(result.getByText('Illustrative reconstruction. ' + RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'See the result' })).toHaveAttribute('aria-current', 'step')

  const resultText = await result.innerText()
  expect(visibleWordCount(resultText)).toBeLessThanOrEqual(460)
  expect(resultText).not.toMatch(/\b(?:log power|coordination exponent|frontage|causal|factor ids?|ability ids?)\b/i)
  await expect(result).toContainText(/full evidence is in Deep dive/i)
})

test('keeps every expert feature one explicit switch away', async ({ page }) => {
  await page.getByRole('button', { name: 'Deep dive' }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible()
  await expect(page.getByText('Advanced dossier', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Custom profile tools' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent arguments' })).toBeVisible()
  await expect(page.getByText('How the model works', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Simple' }).click()
  await expect(page.getByRole('heading', { name: 'Build your matchup' })).toBeVisible()
})

test('opens shared scenarios at their concise result and preserves deep-dive access', async ({ page }) => {
  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('button', { name: /Who would win/ }).click()
  await page.getByRole('button', { name: /Copy share link/ }).click()
  await expect(page).toHaveURL(/\?s=/)

  const sharedUrl = page.url()
  await page.goto(sharedUrl)
  await expect(page.getByTestId('simple-result')).toBeVisible()
  await page.getByRole('button', { name: /Open Deep dive/ }).click()
  await expect(page.locator('.results')).toBeVisible()
})

test('presets lead into editable conditions and a story-first payoff without animation', async ({ page }) => {
  await page.getByRole('button', { name: /Pressure in deep water/ }).click()
  await expect(page.getByLabel('Battlefield')).toHaveValue('deep-ocean')
  await page.getByRole('button', { name: /Who would win/ }).click()
  const result = page.getByTestId('simple-result')
  await expect(result.getByRole('heading', { level: 2 })).toContainText(/1 Sperm whale versus 8 × Orca/)
  await expect(result).toContainText('In this model, not a real-world prediction.')
  await expect(result.getByTestId('simple-likely-copy')).toHaveAttribute('data-story-issues', '0')
  expect(await result.locator('.simple-result-grid > section').first().getAttribute('class')).toBe('simple-likely')
  await expect(result.getByRole('heading', { name: /best chance/ })).toBeVisible()
  await result.getByRole('button', { name: 'Open Deep dive' }).click()
  await expect(page.getByRole('tab', { name: 'Tactical reconstruction' })).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('follow-ups branch from the displayed result and preserve both share seeds', async ({ page }) => {
  test.slow()
  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('button', { name: /Who would win/ }).click()
  await page.getByRole('button', { name: /Copy share link/ }).click()
  await expect(page).toHaveURL(/[?&]r=\d+/)
  const originalStorySeed = new URL(page.url()).searchParams.get('r')
  const originalUrl = page.url()
  await page.getByRole('button', { name: 'Double their numbers' }).click()
  await expect(page.getByTestId('simple-result').getByRole('heading', { level: 2 })).toContainText('200 ×')
  await page.getByRole('button', { name: /Copy share link/ }).click()
  await expect(page).not.toHaveURL(originalUrl)
  expect(new URL(page.url()).searchParams.get('r')).toBe(originalStorySeed)
  const doubled = page.url()
  const story = await page.getByTestId('simple-likely-copy').innerText()
  await page.reload()
  await expect(page.getByTestId('simple-likely-copy')).toHaveText(story, { useInnerText: true })
  await page.getByRole('button', { name: 'Change environment' }).click()
  await page.getByLabel('Battlefield').selectOption('river')
  await page.getByRole('button', { name: /Who would win/ }).click()
  await page.getByRole('button', { name: /Copy share link/ }).click()
  await expect(page).not.toHaveURL(doubled)
  expect(new URL(page.url()).searchParams.get('r')).toBe(originalStorySeed)
  await page.getByRole('button', { name: 'Open Deep dive' }).click()
  await expect(page.getByLabel('Quantity')).toHaveValue('200')
  await page.getByText('Export files', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download result JSON', exact: true }).click()
  const download = await downloadPromise
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(exported.scenario.seed).toBe(1)
})

test('a crossover shortcut uses the reported count and extreme counts remain bounded', async ({ page }) => {
  await page.getByTestId('solo-creature-select').selectOption('african-bush-elephant')
  await page.getByTestId('group-creature-select').selectOption('gray-wolf')
  await page.getByLabel('The one size').selectOption('normal')
  await page.getByLabel('The many size').selectOption('normal')
  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('button', { name: /Who would win/ }).click()
  const note = await page.locator('#close-quantity-note').innerText()
  const count = note.match(/^Try ([\d,]+) opponents/)
  expect(count).not.toBeNull()
  await page.getByRole('button', { name: 'Find a close match' }).click()
  await expect(page.getByTestId('simple-result').getByRole('heading', { level: 2 })).toContainText(`${count![1].replaceAll(',', '')} ×`)
  await page.getByRole('button', { name: 'Try another matchup' }).click()
  await page.getByLabel('Quantity').fill('10^100')
  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('button', { name: /Who would win/ }).click()
  await expect(page.getByRole('button', { name: 'Double their numbers' })).toBeDisabled()
  await expect(page.getByTestId('simple-result')).toContainText('beyond the quick-change limit')
})
