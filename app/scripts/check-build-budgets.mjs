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
  lazyJavascript: 15_000,
  javascript: 480_000,
  creatureRoster: 125_000,
  css: 25_000,
  total: 715_000,
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
const entryFiles = new Set(
  Object.values(manifest)
    .filter((item) => item.isEntry)
    .map((item) => item.file),
)
const entryJavascript = sizes
  .filter((file) => entryFiles.has(relative(distRoot, file.path).replaceAll('\\', '/')))
  .reduce((sum, file) => sum + file.bytes, 0)
const lazyJavascript = javascript - entryJavascript
const rosterFiles = sizes.filter((file) => /dist[\\/]assets[\\/]creatures-[^\\/]+\.json$/.test(relative(appRoot, file.path)))
const creatureRoster = rosterFiles.reduce((sum, file) => sum + file.bytes, 0)
const css = sizes.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0)
// Social previews are fetched by link crawlers, not by visitors loading the app.
// Keep them independently bounded without weakening the runtime payload ceiling.
const socialImages = sizes.filter((file) => relative(appRoot, file.path).replaceAll('\\', '/').startsWith('dist/social/'))
const socialImage = socialImages.reduce((sum, file) => sum + file.bytes, 0)
const total = sizes.filter((file) => !socialImages.includes(file)).reduce((sum, file) => sum + file.bytes, 0)

if (rosterFiles.length !== 1) throw new Error(`Expected one emitted creature roster, found ${rosterFiles.length}.`)
const roster = JSON.parse(await readFile(rosterFiles[0].path, 'utf8'))
if (!Array.isArray(roster) || roster.length !== 134) throw new Error(`Expected 134 emitted creature profiles, found ${Array.isArray(roster) ? roster.length : 'a non-array value'}.`)

const entrySources = await Promise.all(sizes.filter((file) => entryFiles.has(relative(distRoot, file.path).replaceAll('\\', '/'))).map((file) => readFile(file.path, 'utf8')))
if (entrySources.some((source) => source.includes('African bush elephant'))) {
  throw new Error('The built-in creature payload was found inside the entry JavaScript bundle.')
}

const measurements = { entryJavascript, lazyJavascript, javascript, creatureRoster, css, total, socialImage }
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
