import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditCreatureSemantics, summarizeSemanticAudit } from './lib/semantic_creature_linter.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argumentValue = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
const inputPath = path.resolve(repositoryRoot, argumentValue('--input') ?? 'data/creatures.json')
const vocabularyPath = path.resolve(repositoryRoot, argumentValue('--vocabulary') ?? 'data/mechanics-vocabulary.json')
const jsonMode = process.argv.includes('--json')

const creatures = JSON.parse(await readFile(inputPath, 'utf8'))
const vocabulary = JSON.parse(await readFile(vocabularyPath, 'utf8'))
const issues = auditCreatureSemantics(creatures, vocabulary)
const summary = summarizeSemanticAudit(creatures, vocabulary, issues)

if (jsonMode) {
  console.log(JSON.stringify({ summary, issues }, null, 2))
} else {
  for (const item of issues) {
    const value = item.value === undefined ? '' : ` (${item.value})`
    console.log(`${item.severity.toUpperCase()} ${item.code} ${item.creatureId}.${item.field}${value}: ${item.message}`)
  }
  console.log(`Semantic creature audit: ${summary.profiles} profiles; ${summary.vocabulary.habitats} habitats, ${summary.vocabulary.attack_modes} attack modes, ${summary.vocabulary.traits} traits; ${summary.errors} errors, ${summary.warnings} warnings.`)
  if (summary.errors === 0) console.log('PASS canonical creature semantics')
}

if (summary.errors > 0) process.exitCode = 1
