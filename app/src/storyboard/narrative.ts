import {
  RECONSTRUCTION_NOTICE,
  type BattleAlternateOutcome,
  type BattleBriefSection,
  type BattleNarrativeAccount,
  type BattleStoryBeat,
  type BattleStoryboard,
  type NarrativeSentence,
  type StoryboardPhaseId,
} from './contracts'
import { stableStringify } from './hash'

const PHASE_TITLES: Record<StoryboardPhaseId, string> = {
  briefing: 'Briefing',
  deployment: 'Deployment',
  approach: 'Approach',
  contact: 'Contact',
  pressure: 'Pressure',
  'turning-point': 'Turning point',
  resolution: 'Resolution',
}

export function narrativeSentenceText(sentence: NarrativeSentence): string {
  return sentence.fragments.map((fragment) => fragment.text).join('')
}

export function battleStoryBeatText(beat: BattleStoryBeat): string {
  return beat.sentences.map(narrativeSentenceText).join(' ')
}

export function narrativePassageIssues(storyboard: BattleStoryboard): Array<{ code: string; path: string }> {
  const issues: Array<{ code: string; path: string }> = []
  const add = (code: string, path: string) => issues.push({ code, path })
  const known = new Set(storyboard.evidence.map((item) => item.id))
  const expected = ['opening', 'decisive-interactions', 'resolution'] as const
  if (!Array.isArray(storyboard.briefAccount) || storyboard.briefAccount.length !== 3) add('brief-account-shape', 'briefAccount')
  const passages = [
    ...expected.map((id, index) => [storyboard.briefAccount?.[index], id, `briefAccount[${index}]`] as const),
    [storyboard.alternateOutcome, 'alternate-outcome', 'alternateOutcome'] as const,
  ]
  for (const [item, id, path] of passages) {
    if (!item || item.id !== id || !item.title?.trim()) { add('narrative-passage-shape', path); continue }
    if (!item.evidenceIds?.length || !item.sentences?.length) { add('narrative-passage-empty', path); continue }
    const scope = new Set(item.evidenceIds)
    for (const evidenceId of scope) if (!known.has(evidenceId)) add('narrative-passage-evidence-reference', path)
    for (const sentence of item.sentences) {
      if (!sentence.fragments?.length) { add('narrative-passage-fragments', path); continue }
      let claims = 0
      for (const fragment of sentence.fragments) {
        if (fragment.kind === 'evidence') {
          claims += 1
          if (!fragment.evidenceId || !known.has(fragment.evidenceId)) add('narrative-passage-evidence-reference', path)
          if (!fragment.evidenceId || !scope.has(fragment.evidenceId)) add('narrative-passage-evidence-scope', path)
        } else if (fragment.kind !== 'text' || fragment.evidenceId) add('narrative-fragment-type', path)
      }
      if (!claims) add('narrative-passage-claim-evidence', path)
    }
  }
  if (storyboard.alternateOutcome?.text !== storyboard.alternateOutcomeNote) add('alternate-outcome-compatibility', 'alternateOutcomeNote')
  return issues
}

export function buildBattleNarrative(storyboard: BattleStoryboard): BattleNarrativeAccount {
  const passageIssues = narrativePassageIssues(storyboard)
  if (passageIssues.length) throw new Error(`Cannot construct battle narrative: ${passageIssues.map((issue) => issue.code).join(', ')}`)
  const brief = storyboard.briefAccount as BattleBriefSection[]
  const alternateOutcome = storyboard.alternateOutcome as BattleAlternateOutcome
  const storyChapters = storyboard.phases.map((phase) => ({
    id: phase.id,
    title: PHASE_TITLES[phase.id],
    advantage: phase.advantage,
    text: phase.storyBeats.map(battleStoryBeatText).join(' '),
    beatIds: phase.storyBeats.map((beat) => beat.id),
    evidenceIds: [...new Set(phase.storyBeats.flatMap((beat) => beat.evidenceIds))],
  }))
  const analystPhases = storyboard.phases.map((phase) => ({
    id: phase.id,
    title: PHASE_TITLES[phase.id],
    advantage: phase.advantage,
    summary: phase.narration,
    eventIds: phase.events.map((event) => event.id),
    factorIds: phase.supportingFactorIds,
    evidenceIds: [...new Set(phase.storyBeats.flatMap((beat) => beat.evidenceIds))],
  }))
  return {
    notice: RECONSTRUCTION_NOTICE,
    brief,
    storyChapters,
    analystPhases,
    phases: storyboard.phases,
    alternateOutcome,
    alternateOutcomeNote: alternateOutcome.text,
  }
}

export function exportStoryboardJson(storyboard: BattleStoryboard): string {
  return stableStringify(storyboard, 2)
}
