import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(appRoot, 'dist')
const indexPath = join(distRoot, 'index.html')
const html = await readFile(indexPath, 'utf8')
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((value) => !value.startsWith('http') && !value.startsWith('#') && !value.startsWith('mailto:'))

if (references.length === 0) throw new Error('No local static references were found in dist/index.html.')
for (const reference of references) {
  if (reference.startsWith('/')) throw new Error(`Root-relative asset breaks subpath hosting: ${reference}`)
  const target = resolve(dirname(indexPath), reference.split(/[?#]/)[0])
  if (!target.startsWith(resolve(distRoot))) throw new Error(`Asset escapes the published tree: ${reference}`)
  await access(target)
}

const mountedUrl = new URL('index.html', 'https://example.test/apps/what-would-win/')
if (mountedUrl.pathname !== '/apps/what-would-win/index.html') throw new Error('Subpath URL resolution failed.')
console.log(`PASS static subpath: ${references.length} local references resolve inside /apps/what-would-win/.`)
