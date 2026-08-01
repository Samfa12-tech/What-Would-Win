import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function openDeepDive(page: Page) {
  await page.getByRole('button', { name: 'Deep dive' }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible()
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const serious = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target.map(String)),
    }))
  expect(serious).toEqual([])
}

async function runDefaultSimulation(page: Page) {
  await page.goto('/')
  await openDeepDive(page)
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results')).toBeVisible()
}

async function runOneVersusOne(page: Page, soloId: string, groupId: string) {
  await page.goto('/')
  await openDeepDive(page)
  await page.getByTestId('solo-creature-select').selectOption(soloId)
  await page.getByTestId('group-creature-select').selectOption(groupId)
  await page.locator('.combatant-panel').nth(0).getByLabel('Size method').selectOption('normal')
  await page.locator('.combatant-panel').nth(1).getByLabel('Size method').selectOption('normal')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await expect(page.locator('.results')).toBeVisible()
}
async function selectResultView(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true })
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  }).toPass({ timeout: 30_000 })
}

async function openLikelyBattle(page: Page) {
  await selectResultView(page, 'Likely battle')
  await expect(page.getByTestId('likely-battle-panel')).toBeVisible({ timeout: 30_000 })
}

async function openTactical(page: Page) {
  await selectResultView(page, 'Tactical reconstruction')
  await expect(page.getByTestId('tactical-reconstruction-panel')).toBeVisible({ timeout: 30_000 })
}

async function noWebGlPage(browser: Browser) {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
      return contextId === 'webgl2' ? null : (original as Function).apply(this, [contextId, ...args])
    }
  })
  return { context, page: await context.newPage() }
}

test('verdict exposes probability context, quantity stages, and keyboard-operable result tabs', async ({ page }) => {
  await runDefaultSimulation(page)

  const verdictTab = page.getByRole('tab', { name: 'Verdict', exact: true })
  const likelyTab = page.getByRole('tab', { name: 'Likely battle', exact: true })
  await expect(verdictTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('verdict-view')).toBeVisible()
  for (const panelId of ['verdict', 'likely-battle', 'tactical-reconstruction', 'technical-record']) {
    await expect(page.locator(`#result-panel-${panelId}`)).toHaveCount(1)
  }
  await expect(page.locator('#result-panel-likely-battle')).toHaveAttribute('hidden', '')
  await expect(page.locator('#result-panel-tactical-reconstruction')).toHaveAttribute('hidden', '')
  await expect(page.locator('#result-panel-technical-record')).toHaveAttribute('hidden', '')
  await expect(page.locator('.probability-midpoint')).toBeVisible()
  await expect(page.locator('.probability-band')).toBeVisible()

  const pipeline = page.locator('.quantity-pipeline')
  await expect(pipeline).toContainText('Declared')
  await expect(pipeline).toContainText('Arena usable')
  await expect(pipeline).toContainText('Active frontage')
  await expect(pipeline).toContainText('Effective pressure')

  await verdictTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(likelyTab).toBeFocused()
  await expect(likelyTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#result-panel-verdict')).toHaveAttribute('hidden', '')
  await expect(page.locator('#result-panel-likely-battle')).not.toHaveAttribute('hidden', '')
  await expect(page.getByTestId('likely-battle-panel')).toBeVisible({ timeout: 30_000 })
})
test('a modelled draw never mounts decisive story or tactical reconstruction builders', async ({ page }) => {
  await page.goto('/')
  await openDeepDive(page)
  await page.getByTestId('solo-creature-select').selectOption('vampire')
  await page.getByTestId('group-creature-select').selectOption('charybdis')
  await page.getByLabel('Quantity').fill('1')
  await page.getByLabel('Starting distance (m)').fill('50')
  await page.getByLabel('Terrain').selectOption('open')
  await page.getByRole('button', { name: 'Run simulation' }).click()

  await expect(page.locator('.results-header h2')).toHaveText('Draw')
  await expect(page.locator('.outcome-reason')).toContainText(/Neither side/i)
  await expect(page.getByTestId('verdict-view')).toContainText('Draw')
  await selectResultView(page, 'Likely battle')
  await expect(page.getByTestId('draw-presentation')).toBeVisible()
  await expect(page.getByTestId('likely-battle-panel')).toHaveCount(0)
  await selectResultView(page, 'Tactical reconstruction')
  await expect(page.getByTestId('draw-presentation')).toBeVisible()
  await expect(page.getByTestId('tactical-reconstruction-panel')).toHaveCount(0)

  await page.getByText('Export files', { exact: true }).click()
  const storyboardExport = page.getByRole('button', { name: 'Download storyboard JSON' })
  const exportNote = page.locator('#draw-storyboard-export-note')
  await expect(exportNote).toBeVisible()
  await expect(storyboardExport).toBeDisabled()
  await expect(storyboardExport).toHaveAttribute('aria-describedby', 'draw-storyboard-export-note')
  await expect(page.locator('.history-card').first()).toContainText('Result: Draw / non-engagement')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download result JSON' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const exported = JSON.parse(await readFile(path!, 'utf8'))
  expect(exported).toMatchObject({
    storyboard: null,
    battleNarrative: null,
    readerNarrative: null,
    presentationNotice: 'No winner storyboard or battle narrative is generated for a modelled draw.',
    result: { outcome: 'draw', winner: null },
  })
})
test('Story is the readable default and Analyst remains a complete evidence view', async ({ page }) => {
  await runDefaultSimulation(page)
  await openLikelyBattle(page)

  const panel = page.getByTestId('likely-battle-panel')
  const storyButton = panel.getByRole('button', { name: 'Story', exact: true })
  const analystButton = panel.getByRole('button', { name: 'Analyst', exact: true })
  await expect(storyButton).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByTestId('story-account')).toBeVisible()
  await expect(panel.getByTestId('analyst-account')).toBeHidden()
  const story = panel.getByTestId('story-account')
  expect((await story.innerText()).trim().length).toBeGreaterThan(300)
  await expect(story.locator('.layman-story-stage')).toHaveCount(3)
  await expect(story.locator('.layman-story-turning-point')).toHaveCount(1)
  const reasonCount = await story.getByRole('list', { name: 'Clear reasons for the result' }).getByRole('listitem').count()
  expect(reasonCount).toBeGreaterThanOrEqual(1)
  expect(reasonCount).toBeLessThanOrEqual(3)
  await expect(story.locator('.what-could-flip')).toContainText("The other side's best chance")
  await expect(story.getByLabel('Readable likely battle account')).toHaveAttribute('data-story-issues', '0')
  const visibleStoryText = await panel.getByLabel('Readable likely battle account').evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.evidence-tooltip').forEach((tooltip) => tooltip.remove())
    return copy.textContent ?? ''
  })
  expect(visibleStoryText).not.toMatch(/\b(?:log10|log power|coordination exponent|deterministic margin|group encirclement|authoritative resolution|frontage|causal|factor ids?|ability ids?)\b/i)

  await analystButton.click()
  await expect(analystButton).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByTestId('analyst-account')).toBeVisible()
  await expect(panel.getByTestId('story-account')).toBeHidden()
  await expect(panel.getByTestId('analyst-account')).toContainText(/factor|ability|range|outcome/i)

  await storyButton.click()
  await expect(panel.getByTestId('story-account')).toBeVisible()
})

test('ordinary and mythical one-versus-one stories use singular grammar without group boilerplate', async ({ page }) => {
  for (const scenario of [
    { solo: 'bengal-tiger', group: 'african-lion', identities: /one Bengal tiger.*one African lion/i },
    { solo: 'giant-spider', group: 'white-rhinoceros', identities: /one Giant Spider.*one white rhinoceros/i },
  ]) {
    await runOneVersusOne(page, scenario.solo, scenario.group)
    await openLikelyBattle(page)
    const panel = page.getByTestId('likely-battle-panel')
    const story = panel.getByTestId('story-account')
    const text = await story.innerText()
    expect(text).toMatch(scenario.identities)
    expect(text).not.toMatch(/\bone [^.]{0,60}\bare declared\b/i)
    expect(text).not.toMatch(/reserve-backed|whole opposing group|How the group applies pressure/i)
    await expect(panel.getByLabel('Quantity representation disclosure')).toHaveCount(0)
  }
})

test('Charybdis remains a fixed ocean hazard while the orca approaches through water', async ({ page }) => {
  await page.goto('/')
  await openDeepDive(page)
  await page.getByTestId('solo-creature-select').selectOption('charybdis')
  await page.getByTestId('group-creature-select').selectOption('orca')
  await page.getByLabel('Quantity').fill('1')
  await page.getByLabel('Terrain').selectOption('ocean')
  await page.getByLabel('Starting distance (m)').fill('40')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await openLikelyBattle(page)
  const text = await page.getByTestId('story-account').innerText()
  expect(text).toMatch(/Charybdis.*stays in place/i)
  expect(text).toMatch(/orca.*approaches through the water/i)
  expect(text).not.toMatch(/ocean ground|Charybdis (?:pursues|surrounds|closes (?:distance|in))/i)
})
test('Analyst mode remains selected after another reconstruction in the result session', async ({ page }) => {
  await runDefaultSimulation(page)
  await openLikelyBattle(page)

  const panel = page.getByTestId('likely-battle-panel')
  const analystButton = panel.getByRole('button', { name: 'Analyst', exact: true })
  const seed = panel.getByText(/Story seed \d+ changes presentation only\./).locator('strong')
  await analystButton.click()
  await expect(analystButton).toHaveAttribute('aria-pressed', 'true')
  const originalSeed = await seed.innerText()

  await panel.getByRole('button', { name: 'Another reconstruction' }).click()
  await expect(seed).not.toHaveText(originalSeed)
  await expect(analystButton).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByTestId('analyst-account')).toBeVisible()
  await expect(panel.getByTestId('story-account')).toBeHidden()
})

test('evidence markers work by hover, focus, pin, outside dismissal, and Escape', async ({ page }, testInfo) => {
  await runDefaultSimulation(page)
  await openLikelyBattle(page)

  const story = page.getByTestId('story-account')
  const trigger = story.locator('button.evidence-tooltip-trigger').first()
  const secondTrigger = story.locator('button.evidence-tooltip-trigger').nth(1)
  await expect(trigger).toBeVisible()
  expect(await trigger.evaluate((element) => element.tagName)).toBe('BUTTON')

  await trigger.hover()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(1)
  const tooltipText = await page.locator('[role="tooltip"]:visible').innerText()
  expect(tooltipText).toMatch(/Full technical details remain available in Analyst mode\./)
  expect(tooltipText.length).toBeGreaterThan(70)
  expect(tooltipText).not.toMatch(/factor:|ability-resolution:|log10|coefficient/i)
  await expect(trigger).toHaveAttribute('aria-describedby', /.+/)
  await page.mouse.move(0, 0)

  await trigger.focus()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(0)

  if (testInfo.project.name === 'mobile-chromium') await trigger.tap(); else await trigger.click()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(1)
  if (testInfo.project.name === 'mobile-chromium') await secondTrigger.tap(); else await secondTrigger.click()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(1)
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(secondTrigger).toHaveAttribute('aria-expanded', 'true')
  const tooltipBox = await page.locator('[role="tooltip"]:visible').boundingBox()
  const viewport = page.viewportSize()!
  expect(tooltipBox).not.toBeNull()
  expect(tooltipBox!.x).toBeGreaterThanOrEqual(0)
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(0)
  expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(viewport.width)
  expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(viewport.height)
  if (testInfo.project.name === 'mobile-chromium') await story.locator('.story-intro').tap(); else await story.locator('.story-intro').click()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(0)
  await expect(trigger).toHaveAccessibleName(/^Evidence:/)
  await expect(story.locator('.story-beat p').first()).not.toHaveClass(/evidence-tooltip-trigger/)
  expect((await story.innerText()).trim().length).toBeGreaterThan(300)
})

test('beat navigation and camera modes keep the active action explicit', async ({ page }) => {
  test.slow()
  await runDefaultSimulation(page)
  await openTactical(page)

  const panel = page.getByTestId('tactical-reconstruction-panel')
  const callout = panel.getByTestId('tactical-callout')
  const previous = panel.getByRole('button', { name: 'Previous beat', exact: true })
  const next = panel.getByRole('button', { name: 'Next beat', exact: true })
  await expect(panel.getByTestId('tactical-timeline')).toBeVisible()
  await expect(callout).toBeVisible()
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()

  const hud = panel.getByTestId('tactical-hud')
  await expect(hud).toBeVisible()
  for (const label of ['Phase', 'Actor', 'Target', 'Outcome', 'Result', 'Model outcome', 'Modelled phase', 'Playback']) {
    await expect(hud).toContainText(label)
  }
  const legend = panel.getByRole('list', { name: 'Tactical map legend' })
  await expect(legend.getByRole('listitem')).toHaveCount(7)
  await expect(legend).toContainText('Reserve')
  await expect(legend).toContainText('Blocked / countered')
  await expect(panel.locator('.tactical-scale-disclosure')).toBeVisible()
  await expect(panel.locator('.tactical-state-strips').getByRole('listitem')).toHaveCount(5)
  await expect(panel.locator('.tactical-state')).toContainText(/Attack access|Reserve pressure|Cohesion|Resources|Retreat state/)
  await expect(panel.locator('.tactical-count-chips')).toContainText(/declared.*arena usable.*active frontage.*effective pressure/i)
  await expect(callout).not.toHaveAttribute('aria-live')
  await expect(panel.locator('p.sr-only[role="status"][aria-live="polite"]')).toContainText(/Phase \d/)

  const firstCallout = await callout.innerText()
  await next.click()
  await expect.poll(() => callout.innerText()).not.toBe(firstCallout)
  await expect(previous).toBeEnabled()

  for (const mode of ['Story camera', 'Tactical map', 'Free look']) {
    await expect(panel.getByRole('button', { name: mode, exact: true })).toBeVisible()
  }
  await panel.getByRole('button', { name: 'Tactical map', exact: true }).click()
  await expect(panel.getByTestId('tactical-map')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Tactical map', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const beforeKeyboard = await callout.innerText()
  await panel.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => callout.innerText()).not.toBe(beforeKeyboard)

  const play = panel.getByRole('button', { name: 'Play reconstruction', exact: true })
  if (await play.isEnabled()) {
    await play.click()
    await expect(panel.getByRole('button', { name: 'Pause reconstruction', exact: true })).toBeVisible()
  }
})

test('the tactical map remains useful when WebGL is unavailable', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One deterministic Chromium context owns forced no-WebGL coverage.')
  const fallback = await noWebGlPage(browser)
  try {
    await runDefaultSimulation(fallback.page)
    await openTactical(fallback.page)
    const panel = fallback.page.getByTestId('tactical-reconstruction-panel')
    await expect(panel.getByTestId('no-webgl-fallback')).toBeVisible()
    await expect(panel.getByTestId('tactical-map')).toBeVisible()
    await expect(panel.getByTestId('tactical-callout')).toBeVisible()
    await expect(panel.getByTestId('tactical-timeline')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Story camera', exact: true })).toBeDisabled()
    await expect(panel.getByRole('button', { name: 'Free look', exact: true })).toBeDisabled()
  } finally {
    await fallback.context.close()
  }
})

test('reduced motion prevents automatic beat playback', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Existing matrix coverage owns cross-browser reduced-motion details.')
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await runDefaultSimulation(page)
    await openTactical(page)
    const panel = page.getByTestId('tactical-reconstruction-panel')
    await panel.getByText('Display and capture', { exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Reduced motion' })).toHaveAttribute('aria-pressed', 'true')
    await expect(panel.getByRole('button', { name: 'Play reconstruction', exact: true })).toBeDisabled()
    const callout = await panel.getByTestId('tactical-callout').innerText()
    await page.waitForTimeout(750)
    expect(await panel.getByTestId('tactical-callout').innerText()).toBe(callout)
  } finally {
    await context.close()
  }
})

test('mobile puts the battlefield after its notice and before secondary controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'The dedicated mobile project owns the 360 px reading-order contract.')
  await runDefaultSimulation(page)
  await openTactical(page)

  const panel = page.getByTestId('tactical-reconstruction-panel')
  const notice = await panel.locator('.reconstruction-notice').boundingBox()
  const battlefield = await panel.locator('.tactical-viewport').boundingBox()
  const callout = await panel.getByTestId('tactical-callout').boundingBox()
  const viewSwitch = await panel.locator('.tactical-view-switch').boundingBox()
  const advanced = await panel.locator('.tactical-advanced-controls').boundingBox()
  const calloutHeader = panel.locator('.tactical-callout header')
  expect(notice).not.toBeNull()
  expect(battlefield).not.toBeNull()
  expect(callout).not.toBeNull()
  expect(viewSwitch).not.toBeNull()
  expect(advanced).not.toBeNull()
  expect(notice!.y).toBeLessThan(battlefield!.y)
  expect(battlefield!.y).toBeLessThan(callout!.y)
  expect(viewSwitch!.y).toBeLessThan(advanced!.y)
  await expect(calloutHeader.locator('.visually-hidden')).toContainText(/Phase \d of 7 · Beat \d of \d/)
  await expect(calloutHeader.locator('[aria-hidden="true"]')).toHaveText(/P\d\/7 · B\d\/\d/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('mobile Free look accepts orbit and pinch gestures', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'The touch-enabled Chromium project owns multi-touch camera input.')
  await runDefaultSimulation(page)
  await openTactical(page)
  const panel = page.getByTestId('tactical-reconstruction-panel')
  await panel.getByRole('button', { name: 'Free look', exact: true }).click()
  const canvas = panel.getByTestId('tactical-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const before = await canvas.screenshot()
  const session = await context.newCDPSession(page)
  const first = { x: box!.x + box!.width * 0.35, y: box!.y + box!.height * 0.5, id: 1, radiusX: 5, radiusY: 5, force: 1 }
  const second = { x: box!.x + box!.width * 0.65, y: box!.y + box!.height * 0.5, id: 2, radiusX: 5, radiusY: 5, force: 1 }
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: first.x - 35, y: first.y + 12 }, { ...second, x: second.x + 35, y: second.y + 12 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(panel.getByRole('button', { name: 'Reset view' })).toBeVisible()
  expect((await canvas.screenshot()).equals(before)).toBe(false)
})

test('412px touch layout preserves evidence under text spacing and forced colours', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One Chromium context owns the explicit 412px stress check.')
  test.slow()
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  try {
    await page.emulateMedia({ forcedColors: 'active' })
    await runDefaultSimulation(page)
    await openLikelyBattle(page)
    await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' })
    await expectNoSeriousAxeViolations(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await openTactical(page)
    const panel = page.getByTestId('tactical-reconstruction-panel')
    await panel.getByRole('button', { name: 'Tactical map', exact: true }).click()
    const callout = panel.getByTestId('tactical-callout')
    for (const label of ['Who', 'What', 'Target', 'Result', 'Why']) {
      await expect(callout).toContainText(label)
    }
    await expect(panel.getByRole('list', { name: 'Tactical map legend' })).toBeVisible()
    await expect(panel.locator('.tactical-state-strips').getByRole('listitem')).toHaveCount(5)
    await expectNoSeriousAxeViolations(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  } finally {
    await context.close()
  }
})

test('Story, Analyst, expanded evidence, and tactical map have no serious axe violations', async ({ page }, testInfo) => {
  test.skip(!['desktop-chromium', 'mobile-chromium'].includes(testInfo.project.name), 'Chromium desktop and touch layouts own the expanded-state axe pass.')
  test.slow()
  await runDefaultSimulation(page)
  await openLikelyBattle(page)
  const likely = page.getByTestId('likely-battle-panel')
  await expectNoSeriousAxeViolations(page)

  const trigger = likely.locator('button.evidence-tooltip-trigger').first()
  await trigger.click()
  await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(1)
  await expectNoSeriousAxeViolations(page)
  await page.keyboard.press('Escape')

  await likely.getByRole('button', { name: 'Analyst', exact: true }).click()
  await expectNoSeriousAxeViolations(page)

  await openTactical(page)
  const tactical = page.getByTestId('tactical-reconstruction-panel')
  await tactical.getByRole('button', { name: 'Tactical map', exact: true }).click()
  await expect(tactical.getByTestId('tactical-map')).toBeVisible()
  await expectNoSeriousAxeViolations(page)
})
