import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = 'http://127.0.0.1:4174'
const outputDir = resolve('../output/design-qa')
const sourcePath = 'C:/Users/sam_s/.codex/generated_images/019fb825-04da-7890-a9b1-b032ebf3b096/exec-ebf18cd2-ac0d-42f1-89b9-ba4fddc9b9ef.png'

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
const consoleErrors = []

async function renderedMetrics(page) {
  return page.locator('body').evaluate((body) => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
    const values = []
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement
      if (!parent || parent.closest('select, option, [hidden], .visually-hidden')) continue
      const style = getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const value = walker.currentNode.textContent?.trim()
      if (value) values.push(value)
    }
    for (const select of body.querySelectorAll('select')) values.push(select.selectedOptions[0]?.textContent?.trim() ?? '')
    return {
      words: values.join(' ').split(/\s+/).filter(Boolean).length,
      controls: body.querySelectorAll('button, input, select, a').length,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
    }
  })
}

async function capture(viewport, label) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`)
  })
  page.on('pageerror', (error) => consoleErrors.push(`${label}: ${error.message}`))
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Build your matchup' }).waitFor()
  const matchupMetrics = await renderedMetrics(page)
  await page.screenshot({ path: resolve(outputDir, `${label}-matchup.png`) })
  if (label === 'desktop') await page.locator('.simple-matchup-stage').screenshot({ path: resolve(outputDir, 'desktop-matchup-focused.png') })

  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('heading', { name: 'Set the scene' }).waitFor()
  await page.screenshot({ path: resolve(outputDir, `${label}-conditions.png`) })

  await page.getByRole('button', { name: /Who would win/ }).click()
  await page.getByTestId('simple-result').waitFor()
  const resultMetrics = await renderedMetrics(page)
  await page.screenshot({ path: resolve(outputDir, `${label}-result.png`), fullPage: true })
  await page.close()
  return { matchupMetrics, resultMetrics }
}

const desktop = await capture({ width: 1487, height: 1058 }, 'desktop')
const mobile = await capture({ width: 360, height: 800 }, 'mobile')

const sourceData = (await readFile(sourcePath)).toString('base64')
const implementationData = (await readFile(resolve(outputDir, 'desktop-matchup.png'))).toString('base64')
const comparison = await browser.newPage({ viewport: { width: 1600, height: 1220 }, deviceScaleFactor: 1 })
await comparison.setContent(`
  <style>
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#080d17;color:#fff;font:600 16px system-ui}
    h1{margin:0 0 22px;font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    figure{margin:0;padding:12px;background:#111a27;border:1px solid #3b4655;border-radius:12px}
    figcaption{margin:0 0 10px;color:#f0d39c}img{display:block;width:100%;height:1080px;object-fit:contain;object-position:top;background:#080d17}
  </style>
  <h1>What Would Win — source and implementation comparison</h1>
  <div class="grid">
    <figure><figcaption>Source visual truth · 1487 × 1058</figcaption><img src="data:image/png;base64,${sourceData}"></figure>
    <figure><figcaption>Browser implementation · 1487 × 1058 CSS px · DPR 1</figcaption><img src="data:image/png;base64,${implementationData}"></figure>
  </div>
`)
await comparison.screenshot({ path: resolve(outputDir, 'desktop-source-implementation-comparison.png'), fullPage: true })
await comparison.close()

await browser.close()
console.log(JSON.stringify({ desktop, mobile, consoleErrors }, null, 2))
