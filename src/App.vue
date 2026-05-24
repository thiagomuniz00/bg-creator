<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title>Board Game Creator</v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-content-save" @click="saveToLocalStorage">Save</v-btn>
      <v-btn variant="text" prepend-icon="mdi-download" @click="exportJson">Export JSON</v-btn>
      <v-btn variant="text" prepend-icon="mdi-upload" @click="$refs.importInput.click()">Import</v-btn>
      <input ref="importInput" type="file" accept="application/json" hidden @change="importJson" />
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4">
        <v-row>
          <v-col cols="12" lg="3">
            <v-card class="mb-4" rounded="xl">
              <v-card-title>Project</v-card-title>
              <v-card-text>
                <v-text-field v-model="game.name" label="Game name" />
                <v-textarea v-model="game.description" label="Game description" rows="3" />
                <v-select
                  v-model="selectedTemplateId"
                  :items="templates"
                  item-title="name"
                  item-value="id"
                  label="Load template"
                  @update:model-value="loadTemplate"
                />
                <v-btn block color="secondary" class="mt-2" @click="resetGame">New blank game</v-btn>
              </v-card-text>
            </v-card>

            <v-card class="mb-4" rounded="xl">
              <v-card-title>Board Tools</v-card-title>
              <v-card-text>
                <v-slider v-model="game.board.size" label="Board size" min="420" max="900" step="20" thumb-label />
                <v-slider v-model="game.board.tileSize" label="Tile size" min="44" max="110" step="2" thumb-label />
                <v-slider v-model="game.board.cornerSize" label="Corner size" min="70" max="150" step="5" thumb-label />
                <v-slider v-model="game.board.pathCount" label="Tile amount" min="12" max="52" step="4" thumb-label @end="rebuildBoard" />
                <v-select v-model="game.board.shape" :items="['square-loop', 'circle']" label="Board shape" />
                <v-text-field v-model="game.board.centerText" label="Center text" />
                <v-btn block color="primary" @click="rebuildBoard">Rebuild board spaces</v-btn>
              </v-card-text>
            </v-card>

            <v-card rounded="xl">
              <v-card-title>Victory</v-card-title>
              <v-card-text>
                <v-select v-model="game.rules.victory.type" :items="victoryTypes" label="Victory condition" />
                <v-text-field v-model.number="game.rules.victory.target" type="number" label="Target value" />
                <v-textarea v-model="game.rules.victory.notes" label="Victory notes" rows="3" />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="6">
            <v-card rounded="xl">
              <v-card-title class="d-flex align-center">
                Board Preview
                <v-chip class="ml-3" size="small">{{ game.board.spaces.length }} spaces</v-chip>
                <v-spacer />
                <v-chip size="small" color="green">Autosaves locally</v-chip>
              </v-card-title>
              <v-card-text>
                <div class="board-wrap">
                  <div
                    class="board"
                    :style="boardStyle"
                  >
                    <div class="board-center">
                      <strong>{{ game.board.centerText }}</strong>
                      <small>{{ game.rules.victory.type }}: {{ game.rules.victory.target }}</small>
                    </div>

                    <button
                      v-for="space in positionedSpaces"
                      :key="space.id"
                      class="space"
                      :class="{ selected: selectedSpaceId === space.id }"
                      :style="space.style"
                      @click="selectedSpaceId = space.id"
                    >
                      <span class="space-icon">{{ space.icon }}</span>
                      <span class="space-name">{{ space.name }}</span>
                      <span class="space-kind">{{ space.type }}</span>
                    </button>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="3">
            <v-card class="mb-4" rounded="xl">
              <v-card-title>Selected Space</v-card-title>
              <v-card-text v-if="selectedSpace">
                <v-text-field v-model="selectedSpace.name" label="Name" />
                <v-select v-model="selectedSpace.type" :items="spaceTypes" label="Type" />
                <v-text-field v-model="selectedSpace.icon" label="Icon / emoji" />
                <v-textarea v-model="selectedSpace.effect" label="Effect" rows="3" />
                <v-text-field v-model.number="selectedSpace.cost" type="number" label="Cost" />
                <v-text-field v-model.number="selectedSpace.reward" type="number" label="Reward" />
                <v-text-field v-model.number="selectedSpace.danger" type="number" label="Danger" />
                <v-btn block color="error" variant="tonal" @click="deleteSelectedSpace">Delete space</v-btn>
              </v-card-text>
              <v-card-text v-else>
                Select a board space to edit it.
              </v-card-text>
            </v-card>

            <v-card class="mb-4" rounded="xl">
              <v-card-title>Quick Add</v-card-title>
              <v-card-text>
                <v-btn block class="mb-2" @click="addSpace('quest')">Add Quest</v-btn>
                <v-btn block class="mb-2" @click="addSpace('market')">Add Market</v-btn>
                <v-btn block class="mb-2" @click="addSpace('monster')">Add Monster</v-btn>
                <v-btn block @click="addSpace('treasure')">Add Treasure</v-btn>
              </v-card-text>
            </v-card>

            <v-card rounded="xl">
              <v-card-title>Playtest Notes</v-card-title>
              <v-card-text>
                <v-textarea v-model="game.playtest.notes" label="What worked?" rows="4" />
                <v-textarea v-model="game.playtest.nextChanges" label="Change next time" rows="4" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <v-snackbar v-model="snackbar.show" timeout="2200">{{ snackbar.text }}</v-snackbar>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const STORAGE_KEY = 'bg-creator-save-v1'

const spaceTypes = ['start', 'quest', 'market', 'monster', 'treasure', 'trap', 'rest', 'event', 'boss']
const victoryTypes = ['Collect gold', 'Defeat boss', 'Complete quests', 'Reach reputation', 'Survive rounds', 'Custom']
const selectedTemplateId = ref(null)
const selectedSpaceId = ref(null)
const snackbar = reactive({ show: false, text: '' })

const templates = [
  {
    id: 'blank',
    name: 'Blank Board',
    create: () => createBlankGame()
  },
  {
    id: 'rpg-monopoly',
    name: 'RPG Monopoly Style',
    create: () => createRpgMonopolyGame()
  },
  {
    id: 'simple-quest-path',
    name: 'Simple Quest Path',
    create: () => createSimpleQuestPathGame()
  }
]

const game = reactive(createRpgMonopolyGame())

const selectedSpace = computed(() => game.board.spaces.find(space => space.id === selectedSpaceId.value))

const boardStyle = computed(() => ({
  width: `${game.board.size}px`,
  height: `${game.board.size}px`
}))

const positionedSpaces = computed(() => {
  if (game.board.shape === 'circle') return circlePositions()
  return squareLoopPositions()
})

function createBlankGame() {
  return {
    name: 'My Board Game',
    description: 'A small board game prototype.',
    rules: {
      players: { min: 2, max: 4 },
      turn: 'Roll, move, resolve the space.',
      victory: { type: 'Custom', target: 10, notes: 'Define your own win condition.' }
    },
    board: {
      shape: 'square-loop',
      size: 640,
      tileSize: 72,
      cornerSize: 100,
      pathCount: 24,
      centerText: 'Your Game',
      spaces: buildSpaces(24, 'blank')
    },
    components: { dice: 1, pawns: 4, cards: [], resources: ['Gold'] },
    playtest: { notes: '', nextChanges: '' }
  }
}

function createRpgMonopolyGame() {
  const spaces = buildSpaces(32, 'rpg')
  return {
    name: 'Dungeon Town Tycoon',
    description: 'A Monopoly-style loop where heroes buy locations, face monsters, complete quests, and race toward legendary fame.',
    rules: {
      players: { min: 2, max: 4 },
      turn: 'Roll a die, move around town, resolve the space. Owned places charge fees unless the visitor completes a quest there.',
      victory: { type: 'Reach reputation', target: 20, notes: 'First player to reach the target reputation and return to the Guild Hall wins.' }
    },
    board: {
      shape: 'square-loop',
      size: 700,
      tileSize: 78,
      cornerSize: 115,
      pathCount: 32,
      centerText: 'Dungeon Town',
      spaces
    },
    components: {
      dice: 1,
      pawns: 4,
      resources: ['Gold', 'Reputation', 'Health'],
      cards: ['Quest cards', 'Dungeon cards', 'Treasure cards', 'Market cards']
    },
    playtest: { notes: 'Try with simple math for a 6-year-old: +1, +2, lose 1, gain 1.', nextChanges: '' }
  }
}

function createSimpleQuestPathGame() {
  return {
    name: 'Little Hero Path',
    description: 'A short path game for fast playtests with children.',
    rules: {
      players: { min: 1, max: 4 },
      turn: 'Roll, move, collect stars, and tell what your hero does.',
      victory: { type: 'Complete quests', target: 5, notes: 'Complete five quests before the dragon wakes up.' }
    },
    board: {
      shape: 'circle',
      size: 640,
      tileSize: 76,
      cornerSize: 100,
      pathCount: 20,
      centerText: 'Hero Path',
      spaces: buildSpaces(20, 'kid')
    },
    components: { dice: 1, pawns: 4, resources: ['Stars', 'Hearts'], cards: ['Small quests', 'Funny events'] },
    playtest: { notes: '', nextChanges: '' }
  }
}

function buildSpaces(count, flavor) {
  const rpgNames = [
    ['Guild Hall', 'start', '🏰'], ['Old Bridge', 'event', '🌉'], ['Goblin Camp', 'monster', '👹'], ['Potion Shop', 'market', '🧪'],
    ['Crystal Cave', 'treasure', '💎'], ['Dark Woods', 'trap', '🌲'], ['Village Inn', 'rest', '🛏️'], ['Lost Shrine', 'quest', '⛩️'],
    ['Dragon Tax', 'event', '🐉'], ['Blacksmith', 'market', '⚒️'], ['Slime Pit', 'monster', '🟢'], ['Royal Road', 'quest', '🛡️']
  ]
  const kidNames = [
    ['Home', 'start', '🏠'], ['Apple Tree', 'treasure', '🍎'], ['Tiny Goblin', 'monster', '👾'], ['Magic Door', 'event', '🚪'],
    ['Campfire', 'rest', '🔥'], ['Bridge', 'quest', '🌉'], ['Star Hill', 'treasure', '⭐'], ['Mud Trap', 'trap', '🕳️']
  ]
  const blankNames = [['Start', 'start', '▶️'], ['Space', 'event', '⬜']]
  const source = flavor === 'rpg' ? rpgNames : flavor === 'kid' ? kidNames : blankNames

  return Array.from({ length: count }, (_, index) => {
    const base = source[index % source.length]
    return {
      id: crypto.randomUUID(),
      index,
      name: index === 0 ? base[0] : `${base[0]} ${Math.floor(index / source.length) + 1}`,
      type: index === 0 ? 'start' : base[1],
      icon: base[2],
      effect: defaultEffect(base[1]),
      cost: base[1] === 'market' ? 2 : 0,
      reward: ['quest', 'treasure', 'monster'].includes(base[1]) ? 2 : 0,
      danger: ['monster', 'trap'].includes(base[1]) ? 1 : 0
    }
  })
}

function defaultEffect(type) {
  return {
    start: 'Collect 2 gold when passing here.',
    quest: 'Draw a quest or gain 1 reputation after a small challenge.',
    market: 'Buy an item, helper, or upgrade.',
    monster: 'Fight, pay, or run away.',
    treasure: 'Gain gold or draw a treasure card.',
    trap: 'Lose 1 health or skip a reward.',
    rest: 'Recover 1 health.',
    event: 'Draw an event card.',
    boss: 'Try to defeat the final enemy.'
  }[type] || 'Custom effect.'
}

function squareLoopPositions() {
  const count = game.board.spaces.length
  const side = Math.ceil(count / 4)
  const board = game.board.size
  const tile = game.board.tileSize
  const margin = 8
  const max = board - tile - margin

  return game.board.spaces.map((space, i) => {
    const sideIndex = Math.floor(i / side)
    const offset = i % side
    const denominator = Math.max(side - 1, 1)
    const t = offset / denominator
    let left = margin
    let top = margin

    if (sideIndex === 0) { left = margin + t * (max - margin); top = margin }
    if (sideIndex === 1) { left = max; top = margin + t * (max - margin) }
    if (sideIndex === 2) { left = max - t * (max - margin); top = max }
    if (sideIndex === 3) { left = margin; top = max - t * (max - margin) }

    return { ...space, style: tileStyle(left, top) }
  })
}

function circlePositions() {
  const board = game.board.size
  const tile = game.board.tileSize
  const radius = board / 2 - tile - 12
  const center = board / 2 - tile / 2

  return game.board.spaces.map((space, i) => {
    const angle = (Math.PI * 2 * i) / game.board.spaces.length - Math.PI / 2
    const left = center + Math.cos(angle) * radius
    const top = center + Math.sin(angle) * radius
    return { ...space, style: tileStyle(left, top) }
  })
}

function tileStyle(left, top) {
  return {
    width: `${game.board.tileSize}px`,
    height: `${game.board.tileSize}px`,
    left: `${left}px`,
    top: `${top}px`
  }
}

function loadTemplate(id) {
  const template = templates.find(item => item.id === id)
  if (!template) return
  replaceGame(template.create())
  selectedSpaceId.value = game.board.spaces[0]?.id ?? null
  toast(`Loaded ${template.name}`)
}

function replaceGame(nextGame) {
  Object.keys(game).forEach(key => delete game[key])
  Object.assign(game, nextGame)
}

function resetGame() {
  selectedTemplateId.value = 'blank'
  replaceGame(createBlankGame())
  selectedSpaceId.value = game.board.spaces[0]?.id ?? null
  toast('Blank game created')
}

function rebuildBoard() {
  const oldSpaces = game.board.spaces
  const nextSpaces = buildSpaces(game.board.pathCount, game.name.toLowerCase().includes('dungeon') ? 'rpg' : 'blank')
  nextSpaces.forEach((space, index) => {
    if (oldSpaces[index]) Object.assign(space, oldSpaces[index], { index })
  })
  game.board.spaces = nextSpaces
  selectedSpaceId.value = game.board.spaces[0]?.id ?? null
}

function addSpace(type) {
  const space = {
    id: crypto.randomUUID(),
    index: game.board.spaces.length,
    name: `${capitalize(type)} ${game.board.spaces.length + 1}`,
    type,
    icon: iconForType(type),
    effect: defaultEffect(type),
    cost: type === 'market' ? 2 : 0,
    reward: ['quest', 'treasure', 'monster'].includes(type) ? 2 : 0,
    danger: ['monster', 'trap'].includes(type) ? 1 : 0
  }
  game.board.spaces.push(space)
  game.board.pathCount = game.board.spaces.length
  selectedSpaceId.value = space.id
}

function deleteSelectedSpace() {
  if (!selectedSpace.value) return
  game.board.spaces = game.board.spaces.filter(space => space.id !== selectedSpaceId.value)
  game.board.spaces.forEach((space, index) => { space.index = index })
  game.board.pathCount = game.board.spaces.length
  selectedSpaceId.value = game.board.spaces[0]?.id ?? null
}

function iconForType(type) {
  return { quest: '📜', market: '🛒', monster: '👹', treasure: '💰', trap: '🕳️', rest: '🔥', event: '🎲', boss: '🐉' }[type] || '⬜'
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  toast('Saved locally')
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  try {
    replaceGame(JSON.parse(raw))
    selectedSpaceId.value = game.board.spaces[0]?.id ?? null
    return true
  } catch {
    return false
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${game.name.toLowerCase().replaceAll(' ', '-') || 'board-game'}.json`
  link.click()
  URL.revokeObjectURL(url)
  toast('JSON exported')
}

async function importJson(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const imported = JSON.parse(text)
    replaceGame(imported)
    selectedSpaceId.value = game.board.spaces[0]?.id ?? null
    saveToLocalStorage()
    toast('JSON imported')
  } catch {
    toast('Invalid JSON file')
  } finally {
    event.target.value = ''
  }
}

function toast(text) {
  snackbar.text = text
  snackbar.show = true
}

watch(game, saveToLocalStorage, { deep: true })

onMounted(() => {
  if (!loadFromLocalStorage()) selectedSpaceId.value = game.board.spaces[0]?.id ?? null
})
</script>

<style>
body {
  margin: 0;
  background: #f8f3ea;
}

.board-wrap {
  overflow: auto;
  display: grid;
  place-items: center;
  min-height: 74vh;
}

.board {
  position: relative;
  border-radius: 28px;
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.86), rgba(234, 218, 190, 0.72)),
    linear-gradient(135deg, #c9a66b, #7d5a35);
  border: 10px solid #5d4037;
  box-shadow: 0 20px 50px rgba(70, 45, 25, 0.28);
}

.board-center {
  position: absolute;
  inset: 25%;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  border: 3px dashed rgba(93, 64, 55, 0.45);
  border-radius: 24px;
  color: #4e342e;
  background: rgba(255, 253, 248, 0.55);
}

.board-center strong {
  font-size: clamp(24px, 4vw, 48px);
}

.space {
  position: absolute;
  border: 2px solid rgba(78, 52, 46, 0.55);
  border-radius: 14px;
  background: #fff8e1;
  color: #3e2723;
  display: grid;
  grid-template-rows: 1fr auto auto;
  place-items: center;
  padding: 5px;
  cursor: pointer;
  box-shadow: 0 5px 12px rgba(50, 30, 20, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.space:hover,
.space.selected {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 10px 18px rgba(50, 30, 20, 0.32);
  outline: 4px solid rgba(255, 179, 0, 0.65);
}

.space-icon {
  font-size: 24px;
}

.space-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.05;
}

.space-kind {
  font-size: 9px;
  opacity: 0.7;
  text-transform: uppercase;
}
</style>
