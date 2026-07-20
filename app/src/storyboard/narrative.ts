import { RECONSTRUCTION_NOTICE, type BattleNarrativeAccount, type BattleStoryboard } from './contracts'
import { stableStringify } from './hash'

function combine(storyboard: BattleStoryboard, indexes: number[]): string {
  return indexes.map((index) => storyboard.phases[index]?.narration).filter(Boolean).join(' ')
}

export function buildBattleNarrative(storyboard: BattleStoryboard): BattleNarrativeAccount {
  return {
    notice: RECONSTRUCTION_NOTICE,
    brief: [
      { id: 'opening', title: 'Setup and opening', text: combine(storyboard, [0, 1, 2]) },
      { id: 'decisive-interactions', title: 'Decisive interactions', text: combine(storyboard, [3, 4, 5]) },
      { id: 'resolution', title: 'Resolution and uncertainty', text: `${storyboard.phases[6]?.narration ?? storyboard.summary} ${storyboard.alternateOutcomeNote}` },
    ],
    phases: storyboard.phases,
    alternateOutcomeNote: storyboard.alternateOutcomeNote,
  }
}

export function exportStoryboardJson(storyboard: BattleStoryboard): string {
  return stableStringify(storyboard, 2)
}
