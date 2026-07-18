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
