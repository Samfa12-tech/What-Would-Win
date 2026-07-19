import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

function seriousViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target.map(String)),
    }))
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(seriousViolations(results.violations)).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('initial application and expanded custom editor have no serious axe violations', async ({ page }) => {
  test.slow()
  await expectNoSeriousAxeViolations(page)

  const soloPanel = page.locator('.combatant-panel').filter({
    has: page.getByRole('heading', { name: 'The one', exact: true }),
  })
  await soloPanel.getByRole('button', { name: 'Clone as custom' }).click()
  await expect(page.getByTestId('custom-creature-editor')).toBeVisible()
  await expectNoSeriousAxeViolations(page)
})

test('core simulation controls are reachable and operable with the keyboard', async ({ page }) => {
  const runButton = page.getByRole('button', { name: 'Run simulation' })
  let reachedRunButton = false

  for (let press = 0; press < 120; press += 1) {
    await page.keyboard.press('Tab')
    if (await runButton.evaluate((button) => document.activeElement === button)) {
      reachedRunButton = true
      break
    }
  }

  expect(reachedRunButton).toBe(true)
  await expect(runButton).toBeFocused()
  const focusIndicator = await runButton.evaluate((button) => {
    const style = getComputedStyle(button)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  expect(focusIndicator.outlineStyle).not.toBe('none')
  expect(Number.parseFloat(focusIndicator.outlineWidth)).toBeGreaterThan(0)

  await page.keyboard.press('Enter')
  await expect(page.locator('.results')).toBeVisible()

  const strictMode = page.getByRole('radio', { name: /strict biology/i })
  const functionalMode = page.getByRole('radio', { name: /functional scaling/i })
  await strictMode.focus()
  await page.keyboard.press('ArrowRight')
  await expect(functionalMode).toBeChecked()

  const advancedSummary = page.locator('summary').filter({ hasText: 'Advanced dossier' })
  await advancedSummary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.advanced-dossier')).toHaveAttribute('open', '')
})

test('technical ledger and conceptual results have no serious axe violations', async ({ page }) => {
  test.slow()
  await page.getByLabel('Report detail').selectOption('technical')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.getByRole('heading', { name: 'Applied factor ledger' })).toBeVisible()
  await expectNoSeriousAxeViolations(page)

  await page.getByLabel('Quantity').fill('10^100')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.getByRole('heading', { name: 'Conceptual briefing' })).toBeVisible()
  await expectNoSeriousAxeViolations(page)
})

test('reflow and user text spacing keep controls readable without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.addStyleTag({ content: `
    * { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
    p, li, label, button, input, select, textarea { line-height: 1.5 !important; }
    p { margin-bottom: 2em !important; }
  ` })

  await expect(page.getByRole('button', { name: 'Run simulation' })).toBeVisible()
  await expect(page.getByTestId('solo-creature-select')).toBeVisible()
  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }))
  expect(overflow.pageWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)
  await expectNoSeriousAxeViolations(page)
})

test('forced-colour mode and the accessibility tree retain the core workflow', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  const runButton = page.getByRole('button', { name: 'Run simulation' })
  await expect(runButton).toBeVisible()
  await expect(runButton).toBeEnabled()
  await runButton.focus()
  const focus = await runButton.evaluate((button) => {
    const style = getComputedStyle(button)
    return `${style.outlineStyle} ${style.outlineWidth}`
  })
  expect(focus).not.toMatch(/^none\s+0px$/)

  const aria = await page.locator('main').ariaSnapshot()
  expect(aria).toContain('heading "The one"')
  expect(aria).toContain('heading "The many"')
  expect(aria).toContain('button "Run simulation"')
  await expectNoSeriousAxeViolations(page)
})
