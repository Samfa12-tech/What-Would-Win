export type ProfileTagField = 'habitats' | 'attack_modes' | 'traits'
export type MechanicsStatus = 'mechanical' | 'descriptive'

export interface ProfileTagStatus {
  status: MechanicsStatus
  explanation: string
}

const familyLabels: Record<string, string> = {
  'terrain-affinity': 'terrain affinity',
  'dry-land-evidence': 'dry-land access',
  'aquatic-inference': 'aquatic capability inference',
  'contact-piercing': 'contact piercing',
  'ranged-unambiguous': 'ranged delivery',
  'ranged-when-declared': 'conditional ranged delivery',
  'venom-delivery': 'venom delivery',
  'stopping-bypass': 'stopping bypass',
  'area-control': 'area control',
  'capability-source': 'capability source',
  environment: 'environment response',
  'group-aggregation': 'group aggregation',
  'special-factor': 'special capability factor',
  'ability-requirement': 'structured ability requirement',
}

const mechanicalFamilies: Record<'attack_modes' | 'traits', Record<string, string[]>> = {
  attack_modes: {
    'contact-piercing': ['claw', 'horn', 'saber-bite', 'spear', 'spur', 'sting', 'tail-spike', 'tail-sting', 'talon', 'tusk', 'venomous-bite'],
    'ranged-unambiguous': ['bow', 'electric-shock', 'fire-breath', 'fire-burst', 'gaze', 'throw', 'web'],
    'ranged-when-declared': ['song', 'tail-spike', 'whirlpool'],
    'venom-delivery': ['venom', 'venomous-bite'],
    'stopping-bypass': ['electric-shock', 'whirlpool'],
    'area-control': ['tail-club', 'tail-spike'],
  },
  traits: {
    'capability-source': ['aquatic', 'construct', 'flight', 'ranged', 'regeneration', 'undead', 'venom'],
    environment: ['ambush', 'amphibious', 'climber', 'cold-adapted', 'echolocation', 'fire', 'formation', 'heat-adapted', 'land-capable', 'night-vision', 'runner', 'semi-aquatic', 'sprinter', 'thick-fur'],
    'group-aggregation': ['eusocial', 'formation', 'pack-hunter', 'swarm'],
    'special-factor': ['armored', 'electric', 'fire', 'heavy-armor', 'many-heads', 'many-limbs', 'petrification'],
    'ability-requirement': ['healing', 'hypnosis', 'limited-ammunition', 'magic'],
    'stopping-bypass': ['cavitation-strike', 'electric', 'petrification'],
  },
}

const habitatEvidenceFamilies: Record<string, string[]> = {
  'dry-land-evidence': ['cave', 'desert', 'farm', 'forest', 'fortification', 'mountain', 'open', 'rocky', 'ruin', 'savanna', 'scrub', 'snow'],
  'aquatic-inference': ['coast', 'deep-ocean', 'ocean', 'prehistoric-ocean', 'reef', 'river', 'swamp'],
}

export function profileTagStatus(field: ProfileTagField, token: string): ProfileTagStatus {
  if (field === 'habitats') {
    const evidence = Object.entries(habitatEvidenceFamilies)
      .filter(([, values]) => values.includes(token))
      .map(([family]) => familyLabels[family])
    return { status: 'mechanical', explanation: ['terrain affinity', ...evidence].join(', ') }
  }

  const families = Object.entries(mechanicalFamilies[field])
    .filter(([, values]) => values.includes(token))
    .map(([family]) => familyLabels[family] ?? family.replaceAll('-', ' '))

  if (families.length > 0) {
    return { status: 'mechanical', explanation: families.join(', ') }
  }

  return {
    status: 'descriptive',
    explanation: 'dossier context; no current model rule',
  }
}
