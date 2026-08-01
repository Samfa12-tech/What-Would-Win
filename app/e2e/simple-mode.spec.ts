import { expect, test, type Page } from '@playwright/test'

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
  expect(visibleWordCount(visibleText)).toBeLessThanOrEqual(150)
  expect(visibleControls).toBeLessThanOrEqual(20)
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
  await expect(result.getByText(RECONSTRUCTION_NOTICE, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'See the result' })).toHaveAttribute('aria-current', 'step')

  const resultText = await result.innerText()
  expect(visibleWordCount(resultText)).toBeLessThanOrEqual(260)
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
