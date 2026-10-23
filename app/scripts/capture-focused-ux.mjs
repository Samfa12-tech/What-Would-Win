import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4189'
const phase = process.argv[3] ?? 'after'
const directory = new URL(`../../output/playwright/ux-${phase}/`, import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const evidence = []
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 360, 800], ['mobile-wide', 412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: name !== 'desktop', hasTouch: name !== 'desktop', reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(baseUrl)
    await page.getByRole('heading', { name: 'Build your matchup' }).waitFor()
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-matchup.png`, directory)), fullPage: true })
    await page.getByRole('button', { name: /Set battle conditions/ }).click()
    await page.getByRole('button', { name: /Who would win/ }).click()
    await page.getByTestId('simple-likely-copy').waitFor()
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-result.png`, directory)), fullPage: true })
    await writeFile(new URL(`${name}-result.txt`, directory), await page.getByTestId('simple-result').innerText())
    const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, focused: document.activeElement?.id }))
    evidence.push({ name, width, height, touch: name !== 'desktop', layout, errors })
    await context.close()
  }
} finally { await browser.close() }
await writeFile(new URL('capture-evidence.json', directory), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
