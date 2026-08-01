import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = 'http://127.0.0.1:4174'
const outputDir = resolve('../output/narrative-audit')
const baselinePath = resolve(outputDir, '02-current-simple-result.png')

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
const errors = []

function watch(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`))
}

async function reachSimpleResult(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Build your matchup' }).waitFor()
  await page.getByRole('button', { name: /Set battle conditions/ }).click()
  await page.getByRole('button', { name: /Who would win/ }).click()
  await page.getByTestId('simple-result').waitFor()
}

async function captureSimple(viewport, filename, label) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  watch(page, label)
  await reachSimpleResult(page)
  const result = page.getByTestId('simple-result')
  await result.screenshot({ path: resolve(outputDir, filename) })
  const metrics = await result.evaluate((element) => ({
    words: (element.textContent ?? '').trim().split(/\s+/).filter(Boolean).length,
    stages: element.querySelectorAll('.simple-story-flow > section').length,
    reasons: element.querySelectorAll('.simple-why li').length,
    storyIssues: Number(element.querySelector('[data-story-issues]')?.getAttribute('data-story-issues') ?? -1),
    width: element.getBoundingClientRect().width,
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
  await page.close()
  return metrics
}

const desktop = await captureSimple({ width: 1440, height: 1050 }, '04-rewritten-simple-result.png', 'desktop-simple')
const mobile = await captureSimple({ width: 360, height: 800 }, '05-rewritten-mobile-result.png', 'mobile-simple')

const deepPage = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
watch(deepPage, 'desktop-deep-story')
await reachSimpleResult(deepPage)
await deepPage.getByRole('button', { name: 'Open Deep dive' }).click()
await deepPage.getByRole('tab', { name: 'Likely battle', exact: true }).click()
const deepStory = deepPage.getByTestId('likely-battle-panel')
await deepStory.waitFor()
await deepStory.screenshot({ path: resolve(outputDir, '06-rewritten-deep-story.png') })
const deep = await deepStory.evaluate((element) => ({
  words: Number(element.querySelector('[data-word-count]')?.getAttribute('data-word-count') ?? -1),
  stages: element.querySelectorAll('.layman-story-stage').length,
  reasons: element.querySelectorAll('.layman-reasons li').length,
  storyIssues: Number(element.querySelector('[data-story-issues]')?.getAttribute('data-story-issues') ?? -1),
  pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}))
await deepPage.close()

const mobileDeepPage = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 })
watch(mobileDeepPage, 'mobile-deep-story')
await reachSimpleResult(mobileDeepPage)
await mobileDeepPage.getByRole('button', { name: 'Open Deep dive' }).click()
await mobileDeepPage.getByRole('tab', { name: 'Likely battle', exact: true }).click()
const mobileDeepStory = mobileDeepPage.getByTestId('likely-battle-panel')
await mobileDeepStory.waitFor()
await mobileDeepStory.screenshot({ path: resolve(outputDir, '07-rewritten-mobile-story.png') })
await mobileDeepPage.close()

const beforeData = (await readFile(baselinePath)).toString('base64')
const afterData = (await readFile(resolve(outputDir, '04-rewritten-simple-result.png'))).toString('base64')
const comparison = await browser.newPage({ viewport: { width: 1760, height: 1100 }, deviceScaleFactor: 1 })
await comparison.setContent(`
  <style>
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#080d17;color:#fff;font:600 16px system-ui}
    h1{margin:0 0 20px;font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    figure{margin:0;padding:12px;background:#111a27;border:1px solid #3b4655;border-radius:10px}
    figcaption{margin:0 0 10px;color:#f0d39c}img{display:block;width:100%;height:960px;object-fit:contain;object-position:top;background:#080d17}
  </style>
  <h1>Likely battle narrative — before and after</h1>
  <div class="grid">
    <figure><figcaption>Before · model language shown to casual users</figcaption><img src="data:image/png;base64,${beforeData}"></figure>
    <figure><figcaption>After · three-part story and plain reasons</figcaption><img src="data:image/png;base64,${afterData}"></figure>
  </div>
`)
await comparison.screenshot({ path: resolve(outputDir, '08-before-after-comparison.png'), fullPage: true })
await comparison.close()

await browser.close()
console.log(JSON.stringify({ desktop, mobile, deep, errors }, null, 2))
