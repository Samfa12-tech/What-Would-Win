import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(appRoot, 'dist')

const budgets = {
  // Keep startup code, optional code and authored data visible as separate costs.
  // A split must reduce the eager path; moving bytes between chunks cannot conceal
  // growth in total JavaScript or in the complete published artifact.
  entryJavascript: 455_000,
  optionalUiJavascript: 21_000,
  // Storyboard builder + validator + both complete HTML presentation views.
  // This is additive and must not consume either original core budget below.
  presentationJavascript: 45_000,
  tacticalRuntimeJavascript: 950_000,
  // Procedural 0.5 scenes ship no external media. These gates reserve explicit
  // per-file limits for later selected-only archetype, environment and audio assets.
  archetypeAssetMax: 350_000,
  environmentAssetMax: 500_000,
  audioAssetMax: 250_000,
  selectedTacticalAssets: 1_200_000,
  model04RuntimeJavascript: 100_000,
  coreJavascript: 575_000,
  javascript: 1_550_000,
  creatureRoster: 125_000,
  coreCss: 26_000,
  reconstructionCss: 4_000,
  css: 31_000,
  total: 1_850_000,
  coreDeployable: 835_000,
  socialImage: 300_000,
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const files = await filesUnder(distRoot)
const sizes = await Promise.all(files.map(async (path) => ({
  path,
  bytes: (await stat(path)).size,
})))

const javascript = sizes.filter((file) => file.path.endsWith('.js')).reduce((sum, file) => sum + file.bytes, 0)
const manifest = JSON.parse(await readFile(join(distRoot, '.vite', 'manifest.json'), 'utf8'))
const entryFiles = new Set()
function collectEagerFiles(manifestKey) {
  const item = manifest[manifestKey]
  if (!item || entryFiles.has(item.file)) return
  entryFiles.add(item.file)
  for (const importedKey of item.imports ?? []) collectEagerFiles(importedKey)
}
for (const [key, item] of Object.entries(manifest)) {
  if (item.isEntry) collectEagerFiles(key)
}
const entryJavascript = sizes
  .filter((file) => entryFiles.has(relative(distRoot, file.path).replaceAll('\\', '/')))
  .reduce((sum, file) => sum + file.bytes, 0)
const lazyJavascript = javascript - entryJavascript
const model04RuntimeFiles = sizes.filter((file) => /dist[\\/]assets[\\/]runtime-[^\\/]+\.js$/.test(relative(appRoot, file.path)))
if (model04RuntimeFiles.length !== 1) throw new Error(`Expected one lazy model 0.4 runtime chunk, found ${model04RuntimeFiles.length}.`)
const model04RuntimeJavascript = model04RuntimeFiles.reduce((sum, file) => sum + file.bytes, 0)
const tacticalRuntimeFiles = sizes.filter((file) => /^dist\/assets\/TacticalScene-[^/]+\.js$/.test(relative(appRoot, file.path).replaceAll('\\', '/')))
if (tacticalRuntimeFiles.length !== 1) throw new Error(`Expected one lazy tactical runtime chunk, found ${tacticalRuntimeFiles.length}.`)
const tacticalRuntimeJavascript = tacticalRuntimeFiles.reduce((sum, file) => sum + file.bytes, 0)
const presentationFiles = sizes.filter((file) => /^dist\/assets\/(?:LikelyBattlePanel|TacticalReconstructionPanel|storyboard)-[^/]+\.js$/.test(relative(appRoot, file.path).replaceAll('\\', '/')))
if (presentationFiles.length !== 3) throw new Error(`Expected three lazy presentation chunks, found ${presentationFiles.length}.`)
const presentationJavascript = presentationFiles.reduce((sum, file) => sum + file.bytes, 0)
const optionalUiJavascript = lazyJavascript - model04RuntimeJavascript - tacticalRuntimeJavascript - presentationJavascript
const rosterFiles = sizes.filter((file) => /dist[\\/]assets[\\/]creatures-[^\\/]+\.json$/.test(relative(appRoot, file.path)))
const creatureRoster = rosterFiles.reduce((sum, file) => sum + file.bytes, 0)
const cssFiles = sizes.filter((file) => file.path.endsWith('.css'))
const css = cssFiles.reduce((sum, file) => sum + file.bytes, 0)
const reconstructionCss = cssFiles.filter((file) => /^dist\/assets\/reconstruction-[^/]+\.css$/.test(relative(appRoot, file.path).replaceAll('\\', '/'))).reduce((sum, file) => sum + file.bytes, 0)
const coreCss = css - reconstructionCss
// Social previews are fetched by link crawlers, not by visitors loading the app.
// Keep them independently bounded without weakening the runtime payload ceiling.
const socialImages = sizes.filter((file) => relative(appRoot, file.path).replaceAll('\\', '/').startsWith('dist/social/'))
const socialImage = socialImages.reduce((sum, file) => sum + file.bytes, 0)
const relativePath = (file) => relative(distRoot, file.path).replaceAll('\\', '/')
const archetypeAssets = sizes.filter((file) => relativePath(file).startsWith('tactical/archetypes/'))
const environmentAssets = sizes.filter((file) => relativePath(file).startsWith('tactical/environments/'))
const audioAssets = sizes.filter((file) => relativePath(file).startsWith('tactical/audio/'))
const maxBytes = (assets) => assets.reduce((maximum, file) => Math.max(maximum, file.bytes), 0)
const archetypeAssetMax = maxBytes(archetypeAssets)
const environmentAssetMax = maxBytes(environmentAssets)
const audioAssetMax = maxBytes(audioAssets)
const selectedTacticalAssets = [...archetypeAssets, ...environmentAssets, ...audioAssets].reduce((sum, file) => sum + file.bytes, 0)
const total = sizes.filter((file) => !socialImages.includes(file)).reduce((sum, file) => sum + file.bytes, 0)
const coreJavascript = javascript - presentationJavascript - tacticalRuntimeJavascript
const coreDeployable = total - presentationJavascript - tacticalRuntimeJavascript - reconstructionCss

if (rosterFiles.length !== 1) throw new Error(`Expected one emitted creature roster, found ${rosterFiles.length}.`)
const roster = JSON.parse(await readFile(rosterFiles[0].path, 'utf8'))
if (!Array.isArray(roster) || roster.length !== 134) throw new Error(`Expected 134 emitted creature profiles, found ${Array.isArray(roster) ? roster.length : 'a non-array value'}.`)

const entrySources = await Promise.all(sizes.filter((file) => entryFiles.has(relative(distRoot, file.path).replaceAll('\\', '/'))).map((file) => readFile(file.path, 'utf8')))
if (entrySources.some((source) => source.includes('African bush elephant'))) {
  throw new Error('The built-in creature payload was found inside the entry JavaScript bundle.')
}
const tacticalManifest = manifest['src/components/tactical/TacticalScene.tsx']
if (!tacticalManifest?.isDynamicEntry || entryFiles.has(tacticalManifest.file)) {
  throw new Error('The tactical 3D runtime must remain a dynamic entry outside the eager verdict graph.')
}

const measurements = { entryJavascript, optionalUiJavascript, presentationJavascript, tacticalRuntimeJavascript, archetypeAssetMax, environmentAssetMax, audioAssetMax, selectedTacticalAssets, model04RuntimeJavascript, coreJavascript, javascript, creatureRoster, coreCss, reconstructionCss, css, coreDeployable, total, socialImage }
let failed = false
for (const [name, bytes] of Object.entries(measurements)) {
  const limit = budgets[name]
  const status = bytes <= limit ? 'PASS' : 'FAIL'
  console.log(`${status} ${name}: ${bytes.toLocaleString()} / ${limit.toLocaleString()} bytes`)
  failed ||= bytes > limit
}

for (const file of sizes.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`  ${relative(appRoot, file.path)}: ${file.bytes.toLocaleString()} bytes`)
}

if (failed) process.exitCode = 1
