from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
VOCABULARY = json.loads((ROOT / 'data' / 'mechanics-vocabulary.json').read_text(encoding='utf-8'))
RANGED_UNAMBIGUOUS = set(VOCABULARY['attack_modes']['mechanical']['ranged-unambiguous'])
RANGED_WHEN_DECLARED = set(VOCABULARY['attack_modes']['mechanical']['ranged-when-declared'])
VENOM_DELIVERY = set(VOCABULARY['attack_modes']['mechanical']['venom-delivery'])
AQUATIC_INFERENCE = set(VOCABULARY['habitats']['mechanical']['aquatic-inference'])


def slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def wiki(title: str) -> str:
    return f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"

entries: list[dict] = []

def add(
    name: str,
    kind: str,
    category: str,
    mass: float,
    length: float,
    height: float,
    speed: float,
    reach: float,
    attack: int,
    defense: int,
    durability: int,
    agility: int,
    stamina: int,
    intelligence: int,
    aggression: int,
    coordination: int,
    morale: int,
    armor: int,
    multi_target: int,
    habitats: list[str],
    attack_modes: list[str],
    traits: list[str],
    source_title: str,
    confidence: str = 'medium',
    notes: str = '',
    icon: str = '◆',
):
    entries.append({
        'id': slug(name),
        'name': name,
        'kind': kind,
        'category': category,
        'icon': icon,
        'representative_peak_mass_kg': mass,
        'body_length_m': length,
        'shoulder_or_body_height_m': height,
        'burst_speed_kph': speed,
        'effective_reach_m': reach,
        'attack': attack,
        'defense': defense,
        'durability': durability,
        'agility': agility,
        'stamina': stamina,
        'intelligence': intelligence,
        'aggression': aggression,
        'coordination': coordination,
        'morale': morale,
        'armor': armor,
        'multi_target': multi_target,
        'habitats': habitats,
        'attack_modes': attack_modes,
        'traits': traits,
        'data_confidence': confidence,
        'source_label': 'Orientation reference; production values require expert review',
        'source_url': wiki(source_title),
        'model_notes': notes or 'Representative high-end adult profile; normalized combat scores are model inputs, not direct zoological measurements.',
    })

# Living animals: large herbivores and familiar domestic animals
add('African bush elephant','animal','megafauna',6500,7.5,3.8,40,3.0,91,94,96,35,82,60,65,68,88,78,72,['savanna','open'],['tusk','trample','charge'],['thick-hide','herd'], 'African bush elephant','high',icon='🐘')
add('Asian elephant','animal','megafauna',5400,6.4,3.2,40,2.7,88,92,94,38,82,62,62,70,88,76,70,['forest','savanna'],['tusk','trample','charge'],['thick-hide','herd'], 'Asian elephant','high',icon='🐘')
add('White rhinoceros','animal','megafauna',2300,4.2,1.85,50,2.2,90,92,92,47,70,35,78,38,90,88,62,['savanna','open'],['horn','charge','trample'],['thick-hide'], 'White rhinoceros','high',icon='🦏')
add('Hippopotamus','animal','megafauna',3200,4.9,1.6,30,1.7,94,92,95,42,72,45,92,42,91,76,65,['river','swamp','savanna'],['bite','charge','crush'],['amphibious','thick-hide'], 'Hippopotamus','high',icon='🦛')
add('Giraffe','animal','megafauna',1200,5.5,5.3,60,2.8,79,66,74,55,68,45,55,42,76,34,58,['savanna','open'],['kick','stomp','neck-swing'],['height'], 'Giraffe','high',icon='🦒')
add('Cape buffalo','animal','large-herbivore',900,3.4,1.7,57,1.5,84,82,84,52,78,42,84,65,90,66,58,['savanna','open'],['horn','charge','trample'],['herd'], 'African buffalo','high',icon='🐃')
add('Moose','animal','large-herbivore',700,3.1,2.1,56,1.8,77,70,76,54,72,40,65,35,78,45,55,['forest','snow','swamp'],['antler','kick','charge'],['cold-adapted','swimmer'], 'Moose','high',icon='🫎')
add('Elk','animal','large-herbivore',480,2.7,1.55,64,1.5,70,61,68,61,74,40,58,48,73,32,52,['forest','open'],['antler','kick','charge'],['herd'], 'Elk','high',icon='🦌')
add('Horse','animal','domestic',600,2.5,1.7,70,1.4,71,58,68,67,80,48,45,62,68,24,47,['open','farm'],['kick','bite','trample'],['herd','domestic'], 'Horse','high',icon='🐎')
add('Breeding bull','animal','domestic',1100,2.6,1.75,40,1.5,80,78,82,43,70,40,75,42,82,58,56,['farm','open'],['horn','charge','trample'],['domestic'], 'Bull','medium',icon='🐂')
add('Wild boar','animal','large-herbivore',250,1.9,1.0,40,0.8,70,68,72,56,75,44,78,40,83,55,48,['forest','scrub'],['tusk','bite','charge'],['thick-hide'], 'Wild boar','high',icon='🐗')
add('Dromedary camel','animal','large-herbivore',690,3.0,2.1,65,1.5,64,58,72,52,88,48,55,45,76,28,45,['desert','open'],['kick','bite','stomp'],['heat-adapted'], 'Dromedary','high',icon='🐪')
add('Red kangaroo','animal','large-herbivore',92,1.8,1.8,70,1.2,66,48,55,78,72,48,62,50,70,18,42,['open','desert'],['kick','claw','grapple'],['tail-balance'], 'Red kangaroo','high',icon='🦘')
add('Mountain goat','animal','large-herbivore',140,1.6,1.0,30,0.8,53,55,62,75,78,38,58,42,72,38,35,['mountain','rocky','snow'],['horn','charge','kick'],['climber','cold-adapted'], 'Mountain goat','high',icon='🐐')
add('North American porcupine','animal','small-mammal',18,0.9,0.45,5,0.4,36,73,58,28,55,32,35,24,60,82,25,['forest'],['bite','quill-contact'],['quills'], 'North American porcupine','high',icon='🦔')

# Predators and primates
add('Polar bear','animal','apex-predator',700,2.8,1.6,40,1.4,89,82,88,53,82,55,78,28,88,58,48,['snow','ice','coast'],['bite','claw','grapple'],['cold-adapted','swimmer'], 'Polar bear','high',icon='🐻‍❄️')
add('Grizzly bear','animal','apex-predator',500,2.5,1.5,56,1.3,86,80,86,58,78,52,80,32,86,55,50,['forest','mountain','river'],['bite','claw','grapple'],['thick-fur'], 'Grizzly bear','high',icon='🐻')
add('African lion','animal','apex-predator',250,2.5,1.2,80,1.0,82,62,72,78,65,58,78,68,82,28,46,['savanna','open'],['bite','claw','pounce'],['pack-hunter'], 'Lion','high',icon='🦁')
add('Bengal tiger','animal','apex-predator',260,3.1,1.1,65,1.1,86,65,74,82,66,60,80,38,83,30,50,['forest','swamp'],['bite','claw','pounce'],['ambush'], 'Bengal tiger','high',icon='🐅')
add('Jaguar','animal','apex-predator',120,2.0,0.8,80,0.8,80,58,66,82,64,58,82,35,82,26,45,['forest','river','swamp'],['bite','claw','pounce'],['ambush','swimmer'], 'Jaguar','high',icon='🐆')
add('Leopard','animal','apex-predator',90,2.0,0.75,58,0.75,73,54,61,85,66,59,75,34,79,22,43,['forest','savanna','mountain'],['bite','claw','pounce'],['ambush','climber'], 'Leopard','high',icon='🐆')
add('Cheetah','animal','apex-predator',72,1.5,0.9,105,0.65,58,42,47,96,42,48,60,45,55,12,30,['savanna','open'],['bite','claw','pounce'],['sprinter'], 'Cheetah','high',icon='🐆')
add('Gray wolf','animal','pack-predator',65,1.6,0.85,60,0.65,61,50,60,78,84,62,72,91,85,18,34,['forest','snow','open'],['bite','grapple'],['pack-hunter','cold-adapted'], 'Wolf','high',icon='🐺')
add('Spotted hyena','animal','pack-predator',86,1.7,0.9,60,0.65,70,59,70,70,85,64,84,88,88,25,38,['savanna','open'],['bite','grapple'],['pack-hunter'], 'Spotted hyena','high',icon='🐕')
add('African wild dog','animal','pack-predator',36,1.1,0.75,66,0.5,54,42,50,82,92,62,72,95,82,12,32,['savanna','open'],['bite'],['pack-hunter','endurance'], 'African wild dog','high',icon='🐕')
add('Wolverine','animal','small-predator',32,1.1,0.45,48,0.45,61,57,66,64,82,48,92,22,95,28,30,['forest','snow','mountain'],['bite','claw','grapple'],['cold-adapted'], 'Wolverine','high',icon='🦡')
add('Honey badger','animal','small-predator',16,0.9,0.3,30,0.35,54,64,62,62,76,52,96,20,98,52,28,['savanna','scrub'],['bite','claw'],['thick-hide','fearless'], 'Honey badger','high',icon='🦡')
add('Silverback gorilla','animal','primate',220,1.8,1.7,40,1.0,78,67,78,62,64,78,72,48,86,25,42,['forest'],['bite','grapple','strike'],['hands'], 'Gorilla','high',icon='🦍')
add('Chimpanzee','animal','primate',70,1.2,1.4,40,0.75,62,46,56,78,68,86,78,78,84,12,38,['forest'],['bite','grapple','strike'],['hands','tool-use'], 'Chimpanzee','high',icon='🐒')
add('Olive baboon','animal','primate',50,1.1,0.75,45,0.55,55,45,52,72,70,68,82,82,80,10,30,['savanna','forest'],['bite','grapple'],['troop'], 'Olive baboon','high',icon='🐒')
add('Giant panda','animal','large-mammal',160,1.9,0.9,32,0.7,58,61,68,48,55,48,42,20,68,34,30,['forest','mountain'],['bite','claw','grapple'],['thick-fur'], 'Giant panda','high',icon='🐼')
add('Mastiff-type dog','animal','domestic-predator',90,1.3,0.8,45,0.55,58,46,57,64,68,58,72,70,80,12,28,['farm','urban','open'],['bite','grapple'],['domestic','pack-compatible'], 'English Mastiff','medium',icon='🐕')
add('House cat','animal','small-predator',7,0.75,0.3,48,0.3,32,24,30,90,58,57,70,28,72,6,18,['urban','farm','forest'],['bite','claw','pounce'],['ambush','climber'], 'Cat','high',icon='🐈')
add('Brown rat','animal','small-mammal',0.65,0.5,0.12,13,0.1,20,18,24,70,78,52,68,86,72,4,12,['urban','sewer','farm'],['bite'],['swarm','burrower'], 'Brown rat','high',icon='🐀')
add('House mouse','animal','small-mammal',0.04,0.18,0.06,13,0.04,10,8,12,78,72,42,58,82,58,2,8,['urban','farm'],['bite'],['swarm','burrower'], 'House mouse','high',icon='🐁')

# Reptiles and birds
add('Saltwater crocodile','animal','reptile',1200,6.3,0.7,29,1.3,93,90,92,38,72,45,88,22,92,88,48,['river','swamp','coast'],['bite','death-roll','tail-strike'],['armored','amphibious','ambush'], 'Saltwater crocodile','high',icon='🐊')
add('American alligator','animal','reptile',450,4.5,0.55,32,1.0,82,83,86,42,68,42,80,20,88,82,42,['river','swamp'],['bite','death-roll','tail-strike'],['armored','amphibious','ambush'], 'American alligator','high',icon='🐊')
add('Komodo dragon','animal','reptile',90,3.0,0.6,20,0.8,68,57,66,50,74,45,82,18,86,48,32,['island','scrub','forest'],['bite','claw','tail-strike'],['venom','ambush'], 'Komodo dragon','high',icon='🦎')
add('Green anaconda','animal','reptile',230,7.0,0.35,10,1.3,74,58,72,48,82,40,72,14,85,30,40,['river','swamp','forest'],['bite','constrict'],['amphibious','ambush'], 'Green anaconda','high',icon='🐍')
add('Reticulated python','animal','reptile',160,7.0,0.3,8,1.2,70,52,66,50,76,38,70,12,82,25,38,['forest','swamp'],['bite','constrict'],['ambush'], 'Reticulated python','high',icon='🐍')
add('King cobra','animal','reptile',9,5.5,0.2,20,0.8,58,30,38,72,58,45,74,15,78,12,24,['forest','scrub'],['venomous-bite'],['venom'], 'King cobra','high',icon='🐍')
add('Inland taipan','animal','reptile',2.0,2.5,0.12,16,0.45,55,22,28,78,46,38,68,10,72,5,18,['desert','scrub'],['venomous-bite'],['venom'], 'Inland taipan','high',icon='🐍')
add('Common snapping turtle','animal','reptile',35,0.8,0.35,5,0.35,48,72,65,22,64,30,72,12,82,86,18,['river','swamp'],['bite'],['armored','aquatic','semi-aquatic'], 'Common snapping turtle','high',icon='🐢')
add('Ostrich','animal','bird',150,2.1,2.7,70,1.25,67,45,58,76,74,38,60,48,72,12,36,['savanna','open'],['kick','peck','stomp'],['runner'], 'Common ostrich','high',icon='🦤')
add('Southern cassowary','animal','bird',80,1.7,1.8,50,0.9,68,48,55,72,64,42,85,26,88,18,34,['forest'],['kick','claw','peck'],['runner'], 'Southern cassowary','high',icon='🐦')
add('Golden eagle','animal','bird-of-prey',6.7,1.0,0.75,160,0.8,55,32,38,92,60,58,74,28,76,8,26,['mountain','open'],['talon','beak','dive'],['flight','ambush'], 'Golden eagle','high',icon='🦅')
add('Peregrine falcon','animal','bird-of-prey',1.5,0.5,0.45,320,0.45,44,23,27,98,45,54,70,22,68,4,18,['cliff','urban','open'],['talon','beak','dive'],['flight','extreme-speed'], 'Peregrine falcon','high',icon='🦅')
add('Great horned owl','animal','bird-of-prey',2.5,0.65,0.55,65,0.5,43,27,31,88,55,57,72,24,74,5,20,['forest','open','urban'],['talon','beak','dive'],['flight','night-vision','silent-flight'], 'Great horned owl','high',icon='🦉')
add('Domestic goose','animal','bird',9,0.9,0.8,55,0.45,30,25,34,61,68,42,88,72,82,5,20,['farm','river','open'],['bite','wing-strike'],['flight','aquatic','flock'], 'Domestic goose','medium',icon='🪿')
add('Mallard duck','animal','bird',1.5,0.6,0.35,80,0.3,15,13,18,74,64,39,55,70,62,2,12,['river','swamp','farm'],['bite','wing-strike'],['flight','aquatic','flock'], 'Mallard','high',icon='🦆')
add('Rooster','animal','bird',4.5,0.7,0.6,14,0.35,28,21,28,70,60,40,86,45,78,4,18,['farm','open'],['spur','peck','wing-strike'],['flock'], 'Chicken','medium',icon='🐓')

# Marine and invertebrates
add('Great white shark','animal','marine-predator',2200,6.4,1.2,56,1.1,92,78,86,62,75,48,80,18,88,42,44,['ocean'],['bite','ram'],['aquatic','electroreception'], 'Great white shark','high',icon='🦈')
add('Orca','animal','marine-predator',6000,8.0,2.0,56,2.0,96,88,94,73,87,88,74,96,92,40,72,['ocean','coast'],['bite','ram','tail-strike'],['aquatic','pack-hunter','echolocation'], 'Orca','high',icon='🐋')
add('Bottlenose dolphin','animal','marine-predator',650,4.0,1.0,35,1.1,66,55,64,82,82,86,58,94,82,18,40,['ocean','coast'],['ram','bite','tail-strike'],['aquatic','pack-hunter','echolocation'], 'Bottlenose dolphin','high',icon='🐬')
add('Walrus','animal','marine-mammal',1700,3.6,1.5,35,1.5,80,84,90,42,82,52,70,58,88,62,52,['ocean','ice','coast'],['tusk','bite','crush'],['aquatic','land-capable','thick-hide','cold-adapted'], 'Walrus','high',icon='🦭')
add('Giant Pacific octopus','animal','cephalopod',70,5.0,0.7,25,2.0,62,48,58,84,66,84,58,30,76,20,62,['ocean','reef'],['beak','grapple','suction'],['aquatic','camouflage','many-limbs'], 'Giant Pacific octopus','high',icon='🐙')
add('Giant squid','animal','cephalopod',275,12.0,1.0,30,5.0,73,52,66,68,75,66,66,24,80,12,76,['deep-ocean'],['beak','tentacle','grapple'],['aquatic','many-limbs'], 'Giant squid','medium',icon='🦑')
add('Electric eel','animal','fish',20,2.5,0.25,8,1.0,62,35,45,52,58,48,66,8,68,8,46,['river','swamp'],['electric-shock','bite'],['aquatic','electric'], 'Electric eel','high',icon='⚡')
add('Peacock mantis shrimp','animal','crustacean',0.12,0.18,0.08,30,0.08,38,28,32,88,54,38,82,18,72,42,22,['reef','ocean'],['club-strike'],['aquatic','armored','cavitation-strike'], 'Odontodactylus scyllarus','medium',icon='🦐')
add('Western honey bee','animal','insect',0.00012,0.015,0.006,24,0.005,10,8,8,68,56,28,72,96,74,3,10,['forest','farm','urban'],['sting'],['flight','venom','swarm'], 'Western honey bee','high',icon='🐝')
add('Army ant soldier','animal','insect',0.00008,0.018,0.006,1,0.006,9,7,9,58,92,18,92,99,94,6,8,['forest','jungle'],['bite','grapple'],['swarm','eusocial'], 'Army ant','medium',icon='🐜')
add('Yellowjacket wasp','animal','insect',0.00015,0.018,0.007,30,0.006,12,7,9,76,62,26,94,90,90,2,10,['forest','urban','farm'],['sting','bite'],['flight','venom','swarm'], 'Yellowjacket','medium',icon='🐝')
add('Emperor scorpion','animal','arachnid',0.06,0.2,0.08,2,0.08,22,38,35,45,62,24,70,18,78,54,16,['desert','forest'],['claw','sting'],['venom','armored'], 'Emperor scorpion','high',icon='🦂')
add('Goliath birdeater','animal','arachnid',0.175,0.3,0.08,2,0.12,22,24,28,52,54,30,66,16,72,18,18,['forest','jungle'],['bite','hair-defense'],['venom','ambush'], 'Goliath birdeater','high',icon='🕷️')

# Extinct animals
add('Tyrannosaurus rex','extinct','dinosaur',8500,12.3,4.0,27,2.5,98,86,94,48,74,55,82,18,92,56,58,['prehistoric-open','forest'],['bite','ram','stomp'],['extinct','apex-predator'], 'Tyrannosaurus','medium','Body mass and speed estimates are uncertain; values represent a large adult reconstruction.',icon='🦖')
add('Velociraptor','extinct','dinosaur',20,2.0,0.5,40,0.55,52,38,45,84,72,58,76,68,82,12,30,['prehistoric-open','desert'],['claw','bite','pounce'],['extinct','feathered','pack-possible'], 'Velociraptor','medium','Uses the real animal rather than the much larger popular-film interpretation.',icon='🦖')
add('Triceratops','extinct','dinosaur',9000,9.0,3.0,25,2.6,94,94,96,34,76,38,74,38,92,90,64,['prehistoric-open'],['horn','charge','trample'],['extinct','armored-skull'], 'Triceratops','medium',icon='🦕')
add('Ankylosaurus','extinct','dinosaur',8000,8.0,1.7,10,2.0,84,99,98,22,82,34,68,24,94,100,70,['prehistoric-open'],['tail-club','ram'],['extinct','heavy-armor'], 'Ankylosaurus','medium',icon='🦕')
add('Stegosaurus','extinct','dinosaur',5000,9.0,4.0,15,2.2,82,90,90,27,78,30,64,28,90,88,64,['prehistoric-open'],['tail-spike','stomp'],['extinct','plates'], 'Stegosaurus','medium',icon='🦕')
add('Woolly mammoth','extinct','megafauna',7000,6.0,3.5,35,3.0,92,94,96,32,84,58,66,65,90,80,72,['snow','steppe'],['tusk','trample','charge'],['extinct','cold-adapted','thick-fur'], 'Woolly mammoth','medium',icon='🐘')
add('Smilodon','extinct','apex-predator',280,2.1,1.1,50,1.0,84,64,75,68,58,52,80,25,84,30,46,['prehistoric-open','forest'],['saber-bite','claw','grapple'],['extinct','ambush'], 'Smilodon','medium',icon='🐅')
add('Megalodon','extinct','marine-predator',60000,18.0,3.5,35,3.0,100,94,100,45,86,42,84,12,96,52,72,['prehistoric-ocean'],['bite','ram'],['extinct','aquatic','apex-predator'], 'Megalodon','low','Size and performance estimates vary substantially; this is a cinematic but biologically bounded reconstruction.',icon='🦈')

# Generic humans
add('Unarmed peak adult human','human','human',100,1.9,1.9,32,0.8,42,37,46,66,66,88,62,72,72,8,28,['urban','open','forest'],['strike','kick','grapple'],['hands','tool-potential'], 'Human','high','Assumes a large, healthy peak adult with no equipment and no specialised combat training.',icon='🧍')
add('Trained unarmed fighter','human','human',95,1.88,1.88,30,0.9,56,45,54,78,76,90,74,84,86,10,38,['urban','open'],['strike','kick','grapple'],['hands','trained'], 'Combat sport','low','Generic composite profile; not a specific person or combat sport.',icon='🥋')
add('Armoured spear carrier','human','human',115,1.9,1.9,22,2.5,70,72,62,52,72,88,70,92,90,72,44,['open','fortification','urban'],['spear','shield','grapple'],['equipment','formation'], 'Spear','low','Generic pre-modern equipment abstraction, included to exercise reach, armour and formation mechanics.',icon='🛡️')
add('Prepared archer','human','human',90,1.85,1.85,25,80,68,38,45,64,70,90,60,88,78,12,58,['open','forest','fortification'],['bow','knife'],['equipment','ranged','limited-ammunition'], 'Archery','low','Generic ranged profile with finite ammunition; not tied to a named culture or historical unit.',icon='🏹')

# Fantasy and public-domain mythology
add('Western dragon','fantasy','mythic-beast',18000,18,6,70,35,100,96,100,72,92,90,92,54,98,96,100,['mountain','open','sky'],['bite','claw','tail','fire-breath'],['flight','fire','armored','ranged'], 'Dragon','modelled',icon='🐉')
add('Wyvern','fantasy','mythic-beast',4500,11,3.5,95,18,91,78,86,84,82,68,90,42,92,72,82,['mountain','open','sky'],['bite','talon','tail-sting'],['flight','venom'], 'Wyvern','modelled',icon='🐲')
add('Griffin','fantasy','mythic-beast',650,5.0,2.2,120,2.0,82,64,72,90,78,72,82,58,90,35,58,['mountain','open','sky'],['talon','beak','claw','pounce'],['flight'], 'Griffin','modelled',icon='🦅')
add('Hydra','fantasy','mythic-beast',9000,14,4,25,7.0,96,90,98,42,90,58,96,30,99,78,100,['swamp','river'],['many-bites','tail','crush'],['regeneration','many-heads','venom','amphibious'], 'Lernaean Hydra','modelled',icon='🐍')
add('Kraken','fantasy','mythic-beast',150000,60,8,30,25,100,94,100,58,98,76,88,28,98,50,100,['ocean','deep-ocean'],['tentacle','crush','drag','beak'],['aquatic','many-limbs','colossal'], 'Kraken','modelled',icon='🐙')
add('Roc','fantasy','mythic-beast',12000,25,10,180,12,98,82,92,84,86,60,84,34,94,44,82,['mountain','sky','open'],['talon','beak','drop'],['flight','colossal'], 'Roc (mythology)','modelled',icon='🦅')
add('Phoenix','fantasy','mythic-beast',180,4,2,160,2.0,85,70,88,94,95,82,80,38,100,34,72,['sky','desert','mountain'],['talon','beak','fire-burst'],['flight','fire','regeneration'], 'Phoenix (mythology)','modelled',icon='🔥')
add('Minotaur','fantasy','humanoid',700,3.0,3.0,38,1.8,85,74,86,58,82,64,88,46,94,42,52,['labyrinth','urban','open'],['horn','axe','charge','grapple'],['hands'], 'Minotaur','modelled',icon='🐂')
add('Cyclops','fantasy','humanoid',3500,6.0,6.0,25,4.0,92,80,92,38,84,58,86,28,94,36,70,['mountain','cave','open'],['club','throw','stomp','grapple'],['hands','giant'], 'Cyclopes','modelled',icon='👁️')
add('Centaur','fantasy','humanoid',700,2.8,2.4,70,2.5,75,62,72,72,84,76,66,82,84,28,46,['open','forest'],['spear','kick','bow'],['hands','ranged','formation'], 'Centaur','modelled',icon='🏹')
add('Hill giant','fantasy','humanoid',6000,7.0,7.0,28,5.0,94,82,94,35,84,52,76,34,92,42,82,['mountain','open','forest'],['club','throw','stomp','grapple'],['hands','giant'], 'Giant','modelled',icon='🗿')
add('Troll','fantasy','humanoid',1200,3.5,3.5,32,2.0,83,80,94,48,88,42,90,28,97,46,58,['forest','cave','bridge'],['claw','bite','club','grapple'],['regeneration'], 'Troll','modelled',icon='👹')
add('Ogre','fantasy','humanoid',900,3.2,3.2,30,1.8,82,70,84,44,78,38,88,24,92,34,52,['forest','cave','open'],['club','grapple','bite'],['hands'], 'Ogre','modelled',icon='👺')
add('Goblin skirmisher','fantasy','humanoid',45,1.3,1.3,34,1.2,46,34,42,76,72,66,82,94,82,18,36,['cave','forest','urban'],['spear','knife','bow'],['hands','swarm','ranged'], 'Goblin','modelled',icon='👺')
add('Werewolf','fantasy','humanoid',180,2.2,2.2,65,1.0,84,68,84,88,86,68,98,42,98,24,46,['forest','urban','night'],['bite','claw','pounce'],['regeneration','night-vision'], 'Werewolf','modelled',icon='🐺')
add('Vampire','fantasy','undead',95,1.9,1.9,80,1.2,78,66,82,94,96,92,82,38,98,20,54,['urban','castle','night'],['bite','claw','grapple'],['undead','regeneration','hypnosis'], 'Vampire','modelled',icon='🧛')
add('Zombie','fantasy','undead',85,1.8,1.8,7,0.7,34,48,72,18,100,18,100,82,100,6,24,['urban','open'],['bite','grapple'],['undead','swarm','fearless'], 'Zombie','modelled',icon='🧟')
add('Stone golem','fantasy','construct',3000,3.5,3.5,15,2.2,88,98,100,18,100,35,100,18,100,100,66,['cave','urban','fortification'],['fist','stomp','grapple'],['construct','armored','fearless'], 'Golem','modelled',icon='🗿')
add('Unicorn','fantasy','mythic-beast',650,2.6,1.8,85,1.8,78,68,78,76,88,74,68,52,94,34,50,['forest','open'],['horn','kick','charge'],['magic','healing'], 'Unicorn','modelled',icon='🦄')
add('Basilisk','fantasy','mythic-beast',400,5.0,1.1,25,8.0,88,76,82,55,74,66,92,20,96,62,66,['desert','cave','ruin'],['bite','gaze','venom'],['venom','ranged','petrification'], 'Basilisk','modelled',icon='🐍')
add('Cerberus','fantasy','mythic-beast',900,4.0,2.4,60,1.6,88,74,86,70,88,70,96,52,98,38,82,['underworld','cave','open'],['many-bites','claw','pounce'],['many-heads','fearless'], 'Cerberus','modelled',icon='🐕')
add('Chimera','fantasy','mythic-beast',850,4.5,2.2,58,12.0,90,70,82,72,82,62,94,34,96,42,82,['mountain','open'],['bite','claw','horn','fire-breath'],['fire','ranged','many-heads'], 'Chimera (mythology)','modelled',icon='🦁')
add('Manticore','fantasy','mythic-beast',600,4.0,1.8,65,35.0,86,66,76,78,76,74,88,32,92,32,78,['desert','open','mountain'],['bite','claw','tail-spike'],['ranged','venom'], 'Manticore','modelled',icon='🦁')
add('Giant spider','fantasy','mythic-beast',500,4.0,1.5,45,15.0,82,68,76,84,78,60,94,24,96,58,74,['forest','cave','ruin'],['bite','web','grapple'],['venom','ranged','climber'], 'Spider in mythology','modelled',icon='🕷️')

# Reddit-informed coverage expansion: living marine/land gaps.
add('Sperm whale','animal','marine-mammal',50000,18,3.5,37,5.0,96,88,98,48,90,84,50,70,94,58,60,['ocean','deep-ocean'],['bite','ram','tail-strike'],['aquatic','echolocation','deep-diver'], 'Sperm whale','medium',icon='🐋')
add('Blue whale','animal','marine-mammal',150000,28,4.5,33,6.0,75,90,100,38,92,72,18,55,88,52,55,['ocean','deep-ocean'],['tail-strike','ram'],['aquatic','colossal'], 'Blue whale','medium',icon='🐋')
add('Colossal squid','animal','cephalopod',500,10,1.2,20,5.0,78,54,70,64,70,60,72,18,82,15,80,['deep-ocean'],['beak','tentacle','grapple'],['aquatic','many-limbs','hooks'], 'Colossal squid','low',icon='🦑')
add('Tiger shark','animal','marine-predator',900,5.5,1.0,32,1.0,87,70,80,68,78,48,78,12,87,35,38,['ocean','coast'],['bite','ram'],['aquatic','electroreception'], 'Tiger shark','medium',icon='🦈')
add('Bull shark','animal','marine-predator',320,3.4,0.7,40,0.8,80,66,74,72,78,47,84,12,88,32,35,['ocean','coast','river'],['bite','ram'],['aquatic','electroreception'], 'Bull shark','medium',icon='🦈')
add('Southern elephant seal','animal','marine-mammal',4000,6.0,2.0,24,1.5,83,86,92,36,84,48,82,25,92,67,52,['ocean','coast','ice'],['bite','crush','body-slam'],['aquatic','land-capable','thick-hide','cold-adapted'], 'Southern elephant seal','medium',icon='🦭')
add('American bison','animal','large-herbivore',1000,3.5,1.9,56,1.7,84,82,86,52,80,42,78,58,88,64,58,['open','snow'],['horn','charge','trample'],['herd','cold-adapted'], 'American bison','high',icon='🦬')
add('Cougar','animal','apex-predator',100,2.4,0.8,72,0.8,76,56,64,88,68,60,76,28,80,24,44,['mountain','forest','open'],['bite','claw','pounce'],['ambush','climber'], 'Cougar','high',icon='🐆')
add('Nile crocodile','animal','reptile',1000,5.5,0.7,30,1.2,91,88,90,40,72,44,90,24,92,86,48,['river','swamp'],['bite','death-roll','tail-strike'],['armored','amphibious','ambush'], 'Nile crocodile','high',icon='🐊')

# Prehistoric ladder: major theropods, crocodilians and megafauna.
add('Spinosaurus','extinct','dinosaur',7500,14.5,4.5,24,2.7,94,82,90,43,72,48,78,16,90,48,62,['river','swamp','coast'],['bite','claw','ram'],['extinct','aquatic','semi-aquatic'], 'Spinosaurus','low','Large adult semi-aquatic reconstruction; body mass, gait and performance remain disputed.',icon='🦖')
add('Allosaurus','extinct','dinosaur',2200,9,3,32,2.0,89,70,82,60,72,48,84,22,88,32,52,['prehistoric-open','forest'],['bite','claw','ram'],['extinct','apex-predator'], 'Allosaurus','medium',icon='🦖')
add('Deinosuchus','extinct','prehistoric-crocodilian',8000,10,1.2,20,2.0,98,96,98,28,82,38,86,12,95,96,60,['river','swamp'],['bite','death-roll','ram'],['extinct','aquatic','amphibious','armored','ambush'], 'Deinosuchus','low','Large adult reconstruction; mass and performance estimates vary substantially.',icon='🐊')
add('Sarcosuchus','extinct','prehistoric-crocodilian',4000,10,1.0,20,1.8,93,91,94,30,80,38,82,10,92,90,55,['river','swamp'],['bite','death-roll','ram'],['extinct','aquatic','amphibious','armored','ambush'], 'Sarcosuchus','low','Large adult reconstruction; mass and performance estimates vary substantially.',icon='🐊')
add('Argentinosaurus','extinct','sauropod',70000,32,7,15,7.0,98,98,100,15,90,36,55,45,95,82,88,['prehistoric-open'],['tail-strike','stomp','trample'],['extinct','colossal'], 'Argentinosaurus','low','Colossal adult reconstruction with high uncertainty in mass and movement.',icon='🦕')
add('Titanoboa','extinct','prehistoric-reptile',1100,13,0.6,10,2.0,88,68,85,42,80,38,74,10,90,38,52,['river','swamp','forest'],['bite','constrict'],['extinct','aquatic','ambush'], 'Titanoboa','medium',icon='🐍')
add('Megatherium','extinct','prehistoric-mammal',4000,6,3.5,15,2.2,86,80,90,35,78,44,70,18,88,58,60,['prehistoric-open','forest'],['claw','grapple','strike'],['extinct','thick-hide'], 'Megatherium','medium',icon='🦥')
add('Cave bear','extinct','prehistoric-mammal',1000,3.2,1.6,40,1.5,88,82,90,48,80,45,72,15,88,58,48,['forest','cave'],['bite','claw','grapple'],['extinct','thick-fur'], 'Cave bear','medium',icon='🐻')
add('Giant short-faced bear','extinct','prehistoric-mammal',900,3,1.8,50,1.5,89,78,88,56,78,48,80,20,89,52,50,['prehistoric-open','forest'],['bite','claw','grapple'],['extinct'], 'Arctodus simus','low','Large adult reconstruction; running ability and ecology are uncertain.',icon='🐻')
add('Therizinosaurus','extinct','dinosaur',5000,10,5,25,3.5,92,78,88,46,76,42,76,20,90,46,74,['prehistoric-open','forest'],['claw','stomp','strike'],['extinct'], 'Therizinosaurus','low','Large adult reconstruction; claw use and defensive behaviour are model assumptions.',icon='🦕')
add('Giganotosaurus','extinct','dinosaur',8000,13,4,32,2.6,97,83,92,52,76,50,84,16,92,46,58,['prehistoric-open'],['bite','ram'],['extinct','apex-predator'], 'Giganotosaurus','medium',icon='🦖')
add('Mapusaurus','extinct','dinosaur',5000,11.5,3.5,32,2.3,94,78,88,56,78,48,86,35,90,42,55,['prehistoric-open'],['bite','ram'],['extinct','apex-predator','pack-possible'], 'Mapusaurus','low','Pack behaviour is possible but not established; the group score is a transparent model assumption.',icon='🦖')

# Fixed cryptozoological interpretations. These are app-defined composites, not claims
# about authentic living traditions or variable popular versions.
add('Bigfoot','fantasy','cryptid',350,2.5,2.5,40,1.4,76,65,80,62,78,72,68,25,84,35,45,['forest','mountain'],['bite','grapple','strike'],['hands','climber'], 'Bigfoot','modelled','Fixed app interpretation: a 350 kg forest-dwelling biped with no supernatural abilities.',icon='👣')
add('Yeti','fantasy','cryptid',380,2.5,2.5,35,1.4,78,70,84,55,84,68,72,20,88,45,46,['mountain','snow'],['bite','grapple','strike'],['hands','climber','cold-adapted','thick-fur'], 'Yeti','modelled','Fixed app interpretation: a 380 kg cold-adapted biped with no supernatural abilities.',icon='👣')
add('Loch Ness Monster','fantasy','cryptid',12000,12,2,30,3,88,80,92,46,84,54,68,22,90,50,62,['river','deep-ocean'],['bite','ram','tail-strike'],['aquatic','deep-diver'], 'Loch Ness Monster','modelled','Fixed app interpretation: a 12-tonne long-necked aquatic cryptid, not an unspecified legendary version.',icon='🐉')
add('Mothman','fantasy','cryptid',90,2,2,100,1,60,52,58,92,74,70,60,18,78,12,50,['forest','urban','night'],['claw','grapple','dive'],['flight','night-vision'], 'Mothman','modelled','Fixed app interpretation: a flying nocturnal humanoid with no precognition or supernatural attack.',icon='🦋')
add('Chupacabra','fantasy','cryptid',45,1.4,0.8,55,0.6,60,45,52,82,72,55,90,25,84,15,36,['scrub','farm','night'],['bite','claw','pounce'],['ambush','night-vision'], 'Chupacabra','modelled','Fixed app interpretation: a 45 kg nocturnal ambush predator with no supernatural abilities.',icon='🐾')
add('Jersey Devil','fantasy','cryptid',180,2.2,2,85,1.2,72,58,68,86,78,65,88,22,90,28,54,['forest','swamp','night'],['bite','claw','hoof-strike'],['flight','night-vision'], 'Jersey Devil','modelled','Fixed app interpretation: a 180 kg flying cryptid with physical attacks only.',icon='🪽')
add('Thunderbird (cryptid interpretation)','fantasy','cryptid',8000,20,8,180,10,96,82,92,82,86,62,84,30,94,48,82,['mountain','open','sky'],['talon','beak','drop'],['flight','colossal'], 'Thunderbird (mythology)','modelled','Fictional cryptozoological composite for this app; not an authentic representation of any Indigenous tradition and has no lightning magic.',icon='🦅')
add('Bunyip (fixed model)','fantasy','cryptid',700,4,1.5,35,1.5,80,70,78,60,76,55,86,18,90,40,48,['river','swamp'],['bite','claw','ram'],['aquatic','amphibious','ambush','night-vision'], 'Bunyip','modelled','Fictional cryptozoological composite for this app; not an authentic representation of any Aboriginal tradition.',icon='🐾')

# Public-domain classical mythology interpretations.
add('Medusa','fantasy','mythic-humanoid',90,1.8,1.8,25,30,72,58,64,68,78,90,84,20,98,18,80,['ruin','cave','open'],['gaze','venomous-bite','grapple'],['petrification','ranged','venom'], 'Medusa','modelled','Classical mortal Gorgon interpretation with line-of-sight petrification.',icon='🐍')
add('Nemean lion','fantasy','mythic-beast',350,3,1.3,65,1.1,88,94,96,78,80,52,86,15,98,100,52,['forest','open'],['bite','claw','pounce'],['impenetrable-hide','armored'], 'Nemean lion','modelled','Classical interpretation with hide resistant to ordinary weapons.',icon='🦁')
add('Scylla','fantasy','mythic-beast',20000,20,10,30,10,100,92,98,50,94,64,98,35,100,72,100,['ocean','coast'],['many-bites','tentacle','crush'],['aquatic','many-heads','many-limbs','colossal'], 'Scylla','modelled','Classical multi-headed sea-monster interpretation.',icon='🐙')
add('Charybdis','fantasy','mythic-hazard',500000,80,20,0,40,100,95,100,5,100,30,100,0,100,85,100,['ocean','coast'],['whirlpool','drag','devour'],['aquatic','colossal','ranged'], 'Charybdis','modelled','Stationary personified whirlpool treated as a combatant-shaped environmental hazard; results are especially abstract.',icon='🌀')
add('Siren','fantasy','mythic-humanoid',70,1.8,1.8,60,50,58,45,50,82,74,82,72,80,84,8,88,['coast','sky'],['song','claw','grapple'],['flight','ranged','hypnosis'], 'Siren (mythology)','modelled','Classical bird-bodied singer interpretation rather than the later mermaid form.',icon='🎶')

assert len(entries) == 134, len(entries)

# Derived boolean capability fields used by the engine and convenient for CSV users.
for e in entries:
    traits = set(e['traits'])
    habitats = set(e['habitats'])
    modes = set(e['attack_modes'])
    e['can_fly'] = 'flight' in traits
    e['aquatic'] = 'aquatic' in traits or (bool(habitats) and habitats <= AQUATIC_INFERENCE)
    e['venomous'] = 'venom' in traits or bool(modes & VENOM_DELIVERY)
    e['ranged'] = bool(modes & RANGED_UNAMBIGUOUS) or ('ranged' in traits and bool(modes & RANGED_WHEN_DECLARED))
    e['regenerates'] = 'regeneration' in traits
    e['undead_or_construct'] = bool({'undead','construct'} & traits)

json_path = ROOT / 'data' / 'creatures.json'
json_path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(ROOT / 'app' / 'src' / 'data' / 'creatures.json').write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

columns = [
    'id','name','kind','category','icon','representative_peak_mass_kg','body_length_m','shoulder_or_body_height_m',
    'burst_speed_kph','effective_reach_m','attack','defense','durability','agility','stamina','intelligence',
    'aggression','coordination','morale','armor','multi_target','habitats','attack_modes','traits','can_fly','aquatic',
    'venomous','ranged','regenerates','undead_or_construct','data_confidence','source_label','source_url','model_notes'
]
with (ROOT / 'data' / 'creatures.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=columns)
    writer.writeheader()
    for e in entries:
        row = e.copy()
        for k in ('habitats','attack_modes','traits'):
            row[k] = '; '.join(row[k])
        writer.writerow(row)

# Test cases are behavioural acceptance bands, not declarations of objective truth.
tests = [
    {
        'id':'duck-horse-classic-functional',
        'title':'100 duck-sized horses vs one horse-sized duck',
        'solo_id':'mallard-duck','group_id':'horse','group_quantity':'100',
        'solo_size':{'method':'named','value':'horse'},'group_size':{'method':'named','value':'duck'},
        'scaling_mode':'functional','terrain':'open','weather':'clear','starting_distance_m':25,
        'expected_solo_win_probability_min':0.90,'expected_solo_win_probability_max':0.99,
        'purpose':'Canonical viral scenario; verifies size presets, quantity scaling and textual explanation.'
    },
    {
        'id':'elephant-wolves',
        'title':'One African elephant vs 20 gray wolves',
        'solo_id':'african-bush-elephant','group_id':'gray-wolf','group_quantity':'20',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'open','weather':'clear','starting_distance_m':30,
        'expected_solo_win_probability_min':0.90,'expected_solo_win_probability_max':0.99,
        'purpose':'Checks megafauna durability, pack coordination and open-terrain contact limits.'
    },
    {
        'id':'gorilla-ducks',
        'title':'One silverback gorilla vs 50 mallard ducks',
        'solo_id':'silverback-gorilla','group_id':'mallard-duck','group_quantity':'50',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'forest','weather':'clear','starting_distance_m':10,
        'expected_solo_win_probability_min':0.88,'expected_solo_win_probability_max':0.99,
        'purpose':'Checks multi-target limits without allowing harmless mass to dominate automatically.'
    },
    {
        'id':'dragon-archers',
        'title':'One western dragon vs 200 prepared archers',
        'solo_id':'western-dragon','group_id':'prepared-archer','group_quantity':'200',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'magical','terrain':'open','weather':'clear','starting_distance_m':150,
        'expected_solo_win_probability_min':0.75,'expected_solo_win_probability_max':0.96,
        'purpose':'Checks flight, range, ammunition, area effects and fantasy scaling.'
    },
    {
        'id':'trex-chickens',
        'title':'One Tyrannosaurus rex vs 1,000 roosters',
        'solo_id':'tyrannosaurus-rex','group_id':'rooster','group_quantity':'1000',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'open','weather':'clear','starting_distance_m':40,
        'expected_solo_win_probability_min':0.85,'expected_solo_win_probability_max':0.99,
        'purpose':'Stress-tests large quantities, contact saturation and attrition reporting.'
    },
    {
        'id':'kraken-orcas-water',
        'title':'One kraken vs 20 orcas in deep ocean',
        'solo_id':'kraken','group_id':'orca','group_quantity':'20',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'magical','terrain':'deep-ocean','weather':'storm','starting_distance_m':80,
        'expected_solo_win_probability_min':0.62,'expected_solo_win_probability_max':0.88,
        'purpose':'Checks aquatic suitability, high coordination and many-limb area control.'
    },
    {
        'id':'extreme-quantity',
        'title':'One stone golem vs 10^100 house mice',
        'solo_id':'stone-golem','group_id':'house-mouse','group_quantity':'1e100',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'magical','terrain':'open','weather':'clear','starting_distance_m':20,'arena_boundary':'open',
        'expected_solo_win_probability_min':0.0,'expected_solo_win_probability_max':0.10,
        'purpose':'Verifies arbitrary scientific notation, logarithmic force modelling and conceptual-result warnings.'
    },
    {
        'id':'sperm-whale-orca-pod',
        'title':'One sperm whale vs eight orcas in deep ocean',
        'solo_id':'sperm-whale','group_id':'orca','group_quantity':'8',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'deep-ocean','weather':'clear','starting_distance_m':100,
        'expected_solo_win_probability_min':0.12,'expected_solo_win_probability_max':0.35,
        'purpose':'Calibrates modern marine heavyweight mass against pod coordination.'
    },
    {
        'id':'spinosaurus-nile-crocodiles',
        'title':'One Spinosaurus vs three Nile crocodiles in a river',
        'solo_id':'spinosaurus','group_id':'nile-crocodile','group_quantity':'3',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'river','weather':'clear','starting_distance_m':20,
        'expected_solo_win_probability_min':0.70,'expected_solo_win_probability_max':0.90,
        'purpose':'Calibrates a reconstructed semi-aquatic theropod against real crocodilian group pressure.'
    },
    {
        'id':'bigfoot-humans-fixed',
        'title':'One fixed-model Bigfoot vs ten unarmed adults',
        'solo_id':'bigfoot','group_id':'unarmed-peak-adult-human','group_quantity':'10',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'forest','weather':'clear','starting_distance_m':15,
        'expected_solo_win_probability_min':0.48,'expected_solo_win_probability_max':0.78,
        'purpose':'Checks that a declared cryptid interpretation remains speculative but reproducible.'
    },
    {
        'id':'medusa-spear-group',
        'title':'Medusa vs twenty armoured spear carriers',
        'solo_id':'medusa','group_id':'armoured-spear-carrier','group_quantity':'20',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'magical','terrain':'ruin','weather':'clear','starting_distance_m':30,
        'expected_solo_win_probability_min':0.02,'expected_solo_win_probability_max':0.16,
        'purpose':'Exercises line-of-sight petrification, range and disciplined group pressure.'
    },
    {
        'id':'charybdis-orcas-hazard',
        'title':'Charybdis environmental abstraction vs twenty orcas',
        'solo_id':'charybdis','group_id':'orca','group_quantity':'20',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'magical','terrain':'ocean','weather':'storm','starting_distance_m':80,
        'expected_solo_win_probability_min':0.72,'expected_solo_win_probability_max':0.93,
        'purpose':'Keeps the stationary mythic-hazard abstraction visible and regression-tested.'
    },
    {
        'id':'dog-mouse-mouse-kangaroos-functional',
        'title':'One dog-sized house mouse vs 100 mouse-sized red kangaroos',
        'solo_id':'house-mouse','group_id':'red-kangaroo','group_quantity':'100',
        'solo_size':{'method':'named','value':'dog'},'group_size':{'method':'named','value':'mouse'},
        'scaling_mode':'functional','terrain':'open','weather':'clear','starting_distance_m':25,
        'expected_solo_win_probability_min':0.75,'expected_solo_win_probability_max':0.97,
        'purpose':'Locks the audited cross-scaling case: individual stopping power, frontage and moderated reserve pressure must all remain visible.'
    },
    {
        'id':'rhinoceros-mouse-swarm',
        'title':'One white rhinoceros vs 500 house mice',
        'solo_id':'white-rhinoceros','group_id':'house-mouse','group_quantity':'500',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'open','weather':'clear','starting_distance_m':25,
        'expected_solo_win_probability_min':0.90,'expected_solo_win_probability_max':0.99,
        'purpose':'Prevents thin surface protection from erasing the body-mass stopping barrier for tiny attackers.'
    },
    {
        'id':'eagle-million-mice-access',
        'title':'One golden eagle vs 1,000,000 house mice',
        'solo_id':'golden-eagle','group_id':'house-mouse','group_quantity':'1000000',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'open','weather':'clear','starting_distance_m':25,
        'expected_solo_win_probability_min':0.90,'expected_solo_win_probability_max':0.99,
        'purpose':'Ensures additional ground bodies cannot remove an uncontested flight-access mismatch by themselves.'
    },
    {
        'id':'orca-wolves-dry-land',
        'title':'One orca vs ten gray wolves on dry open land',
        'solo_id':'orca','group_id':'gray-wolf','group_quantity':'10',
        'solo_size':{'method':'normal','value':'normal'},'group_size':{'method':'normal','value':'normal'},
        'scaling_mode':'strict','terrain':'open','weather':'clear','starting_distance_m':25,
        'expected_solo_win_probability_min':0.01,'expected_solo_win_probability_max':0.15,
        'purpose':'Ensures an obligate aquatic profile cannot overwhelm a dry-land feasibility mismatch with raw mass and authored combat scores.'
    },
]
for test in tests:
    test.setdefault('arena_boundary', 'bounded')
(ROOT / 'data' / 'test_scenarios.json').write_text(json.dumps(tests, indent=2) + '\n', encoding='utf-8')
(ROOT / 'app' / 'src' / 'data' / 'test_scenarios.json').write_text(json.dumps(tests, indent=2) + '\n', encoding='utf-8')
with (ROOT / 'data' / 'test_scenarios.csv').open('w', newline='', encoding='utf-8-sig') as f:
    flat_fields = ['id','title','solo_id','group_id','group_quantity','solo_size','group_size','scaling_mode','terrain','weather','starting_distance_m','arena_boundary','expected_solo_win_probability_min','expected_solo_win_probability_max','purpose']
    w = csv.DictWriter(f, fieldnames=flat_fields)
    w.writeheader()
    for t in tests:
        row = t.copy()
        row['solo_size'] = json.dumps(row['solo_size'], separators=(',',':'))
        row['group_size'] = json.dumps(row['group_size'], separators=(',',':'))
        w.writerow(row)

print(f'Wrote {len(entries)} creatures and {len(tests)} test scenarios.')
