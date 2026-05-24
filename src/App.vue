<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Board Game Creator</v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" @click="saveAll">Save</v-btn>
      <v-btn variant="text" @click="exportJson">Export JSON</v-btn>
      <v-btn variant="text" @click="$refs.importInput.click()">Import</v-btn>
      <input ref="importInput" type="file" accept="application/json" hidden @change="importJson" />
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4">
        <v-tabs v-model="tab" color="primary" class="mb-4">
          <v-tab value="create">Create</v-tab>
          <v-tab value="play">Play</v-tab>
          <v-tab value="characters">Characters</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <v-window-item value="create">
            <v-row>
              <v-col cols="12" lg="3">
                <v-card rounded="xl" class="mb-4">
                  <v-card-title>Project</v-card-title>
                  <v-card-text>
                    <v-text-field v-model="game.name" label="Game name" />
                    <v-textarea v-model="game.description" label="Description" rows="3" />
                    <v-select v-model="templateId" :items="templates" item-title="name" item-value="id" label="Template" @update:model-value="loadTemplate" />
                    <v-btn block color="secondary" @click="resetGame">New blank game</v-btn>
                  </v-card-text>
                </v-card>

                <v-card rounded="xl" class="mb-4">
                  <v-card-title>Board Tools</v-card-title>
                  <v-card-text>
                    <v-slider v-model="game.board.size" label="Board size" min="420" max="900" step="20" thumb-label />
                    <v-slider v-model="game.board.tileSize" label="Tile size" min="44" max="110" step="2" thumb-label />
                    <v-slider v-model="game.board.pathCount" label="Tile amount" min="12" max="52" step="4" thumb-label @end="rebuildBoard" />
                    <v-select v-model="game.board.shape" :items="['square-loop', 'circle']" label="Shape" />
                    <v-text-field v-model="game.board.centerText" label="Center text" />
                    <v-btn block color="primary" @click="rebuildBoard">Rebuild spaces</v-btn>
                  </v-card-text>
                </v-card>

                <v-card rounded="xl">
                  <v-card-title>Victory</v-card-title>
                  <v-card-text>
                    <v-select v-model="game.rules.victory.type" :items="victoryTypes" label="Condition" />
                    <v-text-field v-model.number="game.rules.victory.target" type="number" label="Target" />
                    <v-textarea v-model="game.rules.victory.notes" label="Notes" rows="3" />
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="6">
                <board-preview :game="game" :spaces="positionedSpaces" :selected-id="selectedSpaceId" :session="activeSession" mode="create" @select="selectedSpaceId = $event" />
              </v-col>

              <v-col cols="12" lg="3">
                <v-card rounded="xl" class="mb-4">
                  <v-card-title>Selected Space</v-card-title>
                  <v-card-text v-if="selectedSpace">
                    <v-text-field v-model="selectedSpace.name" label="Name" />
                    <v-select v-model="selectedSpace.type" :items="spaceTypes" label="Type" />
                    <v-text-field v-model="selectedSpace.icon" label="Icon" />
                    <v-textarea v-model="selectedSpace.effect" label="Effect" rows="3" />
                    <v-text-field v-model.number="selectedSpace.cost" type="number" label="Cost" />
                    <v-text-field v-model.number="selectedSpace.reward" type="number" label="Reward" />
                    <v-text-field v-model.number="selectedSpace.danger" type="number" label="Danger" />
                    <v-btn block color="error" variant="tonal" @click="deleteSpace">Delete space</v-btn>
                  </v-card-text>
                  <v-card-text v-else>Select a space.</v-card-text>
                </v-card>

                <v-card rounded="xl" class="mb-4">
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
                    <v-textarea v-model="game.playtest.nextChanges" label="Change next" rows="4" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="play">
            <v-row>
              <v-col cols="12" lg="3">
                <v-card rounded="xl" class="mb-4">
                  <v-card-title>Game Sessions</v-card-title>
                  <v-card-text>
                    <v-text-field v-model="newSessionName" label="New session name" />
                    <v-select v-model="selectedCharacterIds" :items="characters" item-title="name" item-value="id" label="Characters" multiple chips />
                    <v-btn block color="primary" class="mb-3" @click="createSession">Start session</v-btn>
                    <v-select v-model="activeSessionId" :items="sessions" item-title="name" item-value="id" label="Saved session" />
                    <v-btn block color="error" variant="tonal" :disabled="!activeSession" @click="deleteSession">Delete session</v-btn>
                  </v-card-text>
                </v-card>

                <v-card v-if="activeSession" rounded="xl">
                  <v-card-title>Turn {{ activeSession.turn }}</v-card-title>
                  <v-card-text>
                    <v-select v-model="activeSession.activePlayerId" :items="activeSession.players" item-title="characterName" item-value="characterId" label="Active character" />
                    <v-text-field v-model.number="moveAmount" type="number" min="1" label="Move spaces" />
                    <v-btn block color="secondary" class="mb-2" @click="moveActivePlayer">Move</v-btn>
                    <v-btn block variant="tonal" class="mb-2" @click="rollAndMove">Roll d6 + move</v-btn>
                    <v-btn block variant="tonal" @click="nextTurn">Next turn</v-btn>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="6">
                <board-preview :game="game" :spaces="positionedSpaces" :selected-id="selectedSpaceId" :session="activeSession" mode="play" @select="selectedSpaceId = $event" />
              </v-col>

              <v-col cols="12" lg="3">
                <v-card rounded="xl" class="mb-4">
                  <v-card-title>Current Space</v-card-title>
                  <v-card-text v-if="currentSpace">
                    <h3>{{ currentSpace.icon }} {{ currentSpace.name }}</h3>
                    <p class="text-medium-emphasis">{{ currentSpace.type }}</p>
                    <p>{{ currentSpace.effect }}</p>
                    <v-btn block color="green" class="mb-2" @click="applyReward">Apply reward</v-btn>
                    <v-btn block color="orange" class="mb-2" @click="applyCost">Pay cost</v-btn>
                    <v-btn block color="red" @click="applyDanger">Apply danger</v-btn>
                  </v-card-text>
                  <v-card-text v-else>Create or load a session.</v-card-text>
                </v-card>

                <v-card v-if="activeSession" rounded="xl">
                  <v-card-title>Players</v-card-title>
                  <v-card-text>
                    <v-list density="compact">
                      <v-list-item v-for="player in activeSession.players" :key="player.characterId">
                        <v-list-item-title>{{ player.icon }} {{ player.characterName }}</v-list-item-title>
                        <v-list-item-subtitle>Space {{ player.position + 1 }} · Gold {{ player.gold }} · Rep {{ player.reputation }} · HP {{ player.health }}</v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                    <v-textarea v-model="activeSession.notes" label="Session notes" rows="4" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="characters">
            <v-row>
              <v-col cols="12" lg="4">
                <v-card rounded="xl">
                  <v-card-title>Character Editor</v-card-title>
                  <v-card-text>
                    <v-text-field v-model="characterDraft.name" label="Name" />
                    <v-text-field v-model="characterDraft.icon" label="Icon" />
                    <v-select v-model="characterDraft.role" :items="characterRoles" label="Role" />
                    <v-text-field v-model.number="characterDraft.gold" type="number" label="Gold" />
                    <v-text-field v-model.number="characterDraft.reputation" type="number" label="Reputation" />
                    <v-text-field v-model.number="characterDraft.health" type="number" label="Health" />
                    <v-textarea v-model="characterDraft.notes" label="Legacy notes" rows="4" />
                    <v-btn block color="primary" @click="saveCharacter">Save character</v-btn>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" lg="8">
                <v-card rounded="xl">
                  <v-card-title>Legacy Characters</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col v-for="character in characters" :key="character.id" cols="12" md="6">
                        <v-card variant="tonal" rounded="lg">
                          <v-card-title>{{ character.icon }} {{ character.name }}</v-card-title>
                          <v-card-subtitle>{{ character.role }} · {{ character.gamesPlayed }} games</v-card-subtitle>
                          <v-card-text>Gold {{ character.gold }} · Rep {{ character.reputation }} · HP {{ character.health }}<p>{{ character.notes }}</p></v-card-text>
                          <v-card-actions>
                            <v-btn @click="editCharacter(character)">Edit</v-btn>
                            <v-btn color="error" @click="deleteCharacter(character.id)">Delete</v-btn>
                          </v-card-actions>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-container>
      <v-snackbar v-model="snackbar.show" timeout="2200">{{ snackbar.text }}</v-snackbar>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'

const STORAGE_KEY = 'bg-creator-save-v2'
const tab = ref('create')
const templateId = ref(null)
const selectedSpaceId = ref(null)
const selectedCharacterIds = ref([])
const activeSessionId = ref(null)
const newSessionName = ref('Family Playtest')
const moveAmount = ref(1)
const snackbar = reactive({ show: false, text: '' })
const spaceTypes = ['start', 'quest', 'market', 'monster', 'treasure', 'trap', 'rest', 'event', 'boss']
const victoryTypes = ['Collect gold', 'Defeat boss', 'Complete quests', 'Reach reputation', 'Survive rounds', 'Custom']
const characterRoles = ['Hero', 'Knight', 'Mage', 'Rogue', 'Bard', 'Explorer', 'Custom']

const BoardPreview = defineComponent({
  props: ['game', 'spaces', 'selectedId', 'session', 'mode'],
  emits: ['select'],
  setup(props, { emit }) {
    const pawns = computed(() => {
      const map = new Map()
      props.session?.players?.forEach(player => {
        const list = map.get(player.position) || []
        list.push(player.icon || '🙂')
        map.set(player.position, list)
      })
      return map
    })
    return () => h('v-card', { rounded: 'xl' }, {
      default: () => [
        h('v-card-title', props.mode === 'play' ? 'Play Board' : 'Board Preview'),
        h('v-card-text', [
          h('div', { class: 'board-wrap' }, [
            h('div', { class: 'board', style: { width: `${props.game.board.size}px`, height: `${props.game.board.size}px` } }, [
              h('div', { class: 'board-center' }, [h('strong', props.game.board.centerText), h('small', `${props.game.rules.victory.type}: ${props.game.rules.victory.target}`)]),
              props.spaces.map(space => h('button', { key: space.id, class: ['space', { selected: props.selectedId === space.id }], style: space.style, onClick: () => emit('select', space.id) }, [
                h('span', { class: 'space-icon' }, space.icon),
                h('span', { class: 'space-name' }, space.name),
                h('span', { class: 'space-kind' }, space.type),
                props.mode === 'play' && pawns.value.has(space.index) ? h('span', { class: 'pawns' }, pawns.value.get(space.index).join('')) : null
              ]))
            ])
          ])
        ])
      ]
    })
  }
})

const templates = [
  { id: 'blank', name: 'Blank Board', create: () => createBlankGame() },
  { id: 'rpg-monopoly', name: 'RPG Monopoly Style', create: () => createRpgMonopolyGame() },
  { id: 'simple-quest-path', name: 'Simple Quest Path', create: () => createSimpleQuestPathGame() }
]

const game = reactive(createRpgMonopolyGame())
const characters = reactive([createCharacter({ name: 'Levi', icon: '🧒', role: 'Hero' })])
const sessions = reactive([])
const characterDraft = reactive(blankCharacterDraft())

const selectedSpace = computed(() => game.board.spaces.find(space => space.id === selectedSpaceId.value))
const activeSession = computed(() => sessions.find(session => session.id === activeSessionId.value))
const activePlayer = computed(() => activeSession.value?.players.find(player => player.characterId === activeSession.value.activePlayerId))
const currentSpace = computed(() => activePlayer.value ? game.board.spaces[activePlayer.value.position] : null)
const positionedSpaces = computed(() => game.board.shape === 'circle' ? circlePositions() : squareLoopPositions())

function blankCharacterDraft() { return { id: null, name: '', icon: '🧒', role: 'Hero', gold: 5, reputation: 0, health: 5, gamesPlayed: 0, notes: '' } }
function createCharacter(overrides = {}) { return { id: crypto.randomUUID(), name: 'New Hero', icon: '🧒', role: 'Hero', gold: 5, reputation: 0, health: 5, gamesPlayed: 0, notes: '', ...overrides } }
function createBlankGame() { return makeGame('My Board Game', 'A small board game prototype.', 'Your Game', 'square-loop', 24, 'blank', 'Custom', 10) }
function createRpgMonopolyGame() { return makeGame('Dungeon Town Tycoon', 'A Monopoly-style loop with heroes, shops, monsters, quests, and reputation.', 'Dungeon Town', 'square-loop', 32, 'rpg', 'Reach reputation', 20) }
function createSimpleQuestPathGame() { return makeGame('Little Hero Path', 'A short path game for fast playtests with children.', 'Hero Path', 'circle', 20, 'kid', 'Complete quests', 5) }
function makeGame(name, description, centerText, shape, count, flavor, victoryType, target) {
  return { name, description, rules: { players: { min: 1, max: 4 }, turn: 'Roll, move, resolve the space.', victory: { type: victoryType, target, notes: 'Adjust this for your prototype.' } }, board: { shape, size: 680, tileSize: 76, pathCount: count, centerText, spaces: buildSpaces(count, flavor) }, components: { dice: 1, pawns: 4, resources: ['Gold', 'Reputation', 'Health'], cards: [] }, playtest: { notes: '', nextChanges: '' } }
}
function buildSpaces(count, flavor) {
  const rpg = [['Guild Hall','start','🏰'],['Old Bridge','event','🌉'],['Goblin Camp','monster','👹'],['Potion Shop','market','🧪'],['Crystal Cave','treasure','💎'],['Dark Woods','trap','🌲'],['Village Inn','rest','🛏️'],['Lost Shrine','quest','⛩️'],['Dragon Tax','event','🐉'],['Blacksmith','market','⚒️'],['Slime Pit','monster','🟢'],['Royal Road','quest','🛡️']]
  const kid = [['Home','start','🏠'],['Apple Tree','treasure','🍎'],['Tiny Goblin','monster','👾'],['Magic Door','event','🚪'],['Campfire','rest','🔥'],['Bridge','quest','🌉'],['Star Hill','treasure','⭐'],['Mud Trap','trap','🕳️']]
  const blank = [['Start','start','▶️'],['Space','event','⬜']]
  const source = flavor === 'rpg' ? rpg : flavor === 'kid' ? kid : blank
  return Array.from({ length: count }, (_, index) => {
    const base = source[index % source.length]
    return { id: crypto.randomUUID(), index, name: index === 0 ? base[0] : `${base[0]} ${Math.floor(index / source.length) + 1}`, type: index === 0 ? 'start' : base[1], icon: base[2], effect: defaultEffect(base[1]), cost: base[1] === 'market' ? 2 : 0, reward: ['quest','treasure','monster'].includes(base[1]) ? 2 : 0, danger: ['monster','trap'].includes(base[1]) ? 1 : 0 }
  })
}
function defaultEffect(type) { return { start: 'Collect 2 gold when passing here.', quest: 'Gain 1 reputation after a small challenge.', market: 'Buy an item, helper, or upgrade.', monster: 'Fight, pay, or run away.', treasure: 'Gain gold or draw treasure.', trap: 'Lose 1 health.', rest: 'Recover 1 health.', event: 'Draw an event.', boss: 'Try to defeat the final enemy.' }[type] || 'Custom effect.' }
function tileStyle(left, top) { return { width: `${game.board.tileSize}px`, height: `${game.board.tileSize}px`, left: `${left}px`, top: `${top}px` } }
function squareLoopPositions() {
  const side = Math.ceil(game.board.spaces.length / 4), board = game.board.size, tile = game.board.tileSize, margin = 8, max = board - tile - margin
  return game.board.spaces.map((space, i) => { const sideIndex = Math.floor(i / side), t = (i % side) / Math.max(side - 1, 1); let left = margin, top = margin; if (sideIndex === 0) left = margin + t * (max - margin); if (sideIndex === 1) { left = max; top = margin + t * (max - margin) } if (sideIndex === 2) { left = max - t * (max - margin); top = max } if (sideIndex === 3) top = max - t * (max - margin); return { ...space, style: tileStyle(left, top) } })
}
function circlePositions() {
  const board = game.board.size, tile = game.board.tileSize, radius = board / 2 - tile - 12, center = board / 2 - tile / 2
  return game.board.spaces.map((space, i) => { const a = Math.PI * 2 * i / game.board.spaces.length - Math.PI / 2; return { ...space, style: tileStyle(center + Math.cos(a) * radius, center + Math.sin(a) * radius) } })
}
function loadTemplate(id) { const t = templates.find(item => item.id === id); if (t) { replaceGame(t.create()); selectedSpaceId.value = game.board.spaces[0]?.id; toast(`Loaded ${t.name}`) } }
function replaceGame(next) { Object.keys(game).forEach(key => delete game[key]); Object.assign(game, next) }
function resetGame() { templateId.value = 'blank'; replaceGame(createBlankGame()); selectedSpaceId.value = game.board.spaces[0]?.id; toast('Blank game created') }
function rebuildBoard() { const old = game.board.spaces; const next = buildSpaces(game.board.pathCount, game.name.toLowerCase().includes('dungeon') ? 'rpg' : 'blank'); next.forEach((space, i) => old[i] && Object.assign(space, old[i], { index: i })); game.board.spaces = next; selectedSpaceId.value = game.board.spaces[0]?.id }
function addSpace(type) { const space = { id: crypto.randomUUID(), index: game.board.spaces.length, name: `${type} ${game.board.spaces.length + 1}`, type, icon: iconForType(type), effect: defaultEffect(type), cost: type === 'market' ? 2 : 0, reward: ['quest','treasure','monster'].includes(type) ? 2 : 0, danger: ['monster','trap'].includes(type) ? 1 : 0 }; game.board.spaces.push(space); game.board.pathCount = game.board.spaces.length; selectedSpaceId.value = space.id }
function deleteSpace() { game.board.spaces = game.board.spaces.filter(space => space.id !== selectedSpaceId.value); game.board.spaces.forEach((space, i) => space.index = i); game.board.pathCount = game.board.spaces.length; selectedSpaceId.value = game.board.spaces[0]?.id }
function createSession() { const ids = selectedCharacterIds.value.length ? selectedCharacterIds.value : characters.map(c => c.id); const players = ids.map(id => { const c = characters.find(x => x.id === id); return { characterId: id, characterName: c?.name || 'Unknown', icon: c?.icon || '🙂', position: 0, gold: c?.gold ?? 0, reputation: c?.reputation ?? 0, health: c?.health ?? 5 } }); if (!players.length) return toast('Create at least one character first'); const session = { id: crypto.randomUUID(), name: newSessionName.value || `${game.name} Session`, gameName: game.name, turn: 1, activePlayerId: players[0].characterId, players, notes: '', log: [] }; sessions.push(session); activeSessionId.value = session.id; players.forEach(p => { const c = characters.find(x => x.id === p.characterId); if (c) c.gamesPlayed++ }); tab.value = 'play'; toast('Game session started') }
function deleteSession() { const i = sessions.findIndex(s => s.id === activeSessionId.value); if (i >= 0) sessions.splice(i, 1); activeSessionId.value = sessions[0]?.id ?? null }
function moveActivePlayer() { if (!activePlayer.value) return; activePlayer.value.position = (activePlayer.value.position + Number(moveAmount.value || 0)) % game.board.spaces.length }
function rollAndMove() { moveAmount.value = Math.floor(Math.random() * 6) + 1; moveActivePlayer() }
function nextTurn() { const players = activeSession.value?.players || []; const i = players.findIndex(p => p.characterId === activeSession.value.activePlayerId); const next = (i + 1) % players.length; activeSession.value.activePlayerId = players[next].characterId; if (next === 0) activeSession.value.turn++ }
function applyReward() { if (!activePlayer.value || !currentSpace.value) return; activePlayer.value.gold += Number(currentSpace.value.reward) || 0; if (currentSpace.value.type === 'quest') activePlayer.value.reputation++; syncLegacy(activePlayer.value) }
function applyCost() { if (!activePlayer.value || !currentSpace.value) return; activePlayer.value.gold = Math.max(0, activePlayer.value.gold - (Number(currentSpace.value.cost) || 0)); syncLegacy(activePlayer.value) }
function applyDanger() { if (!activePlayer.value || !currentSpace.value) return; activePlayer.value.health = Math.max(0, activePlayer.value.health - (Number(currentSpace.value.danger) || 0)); syncLegacy(activePlayer.value) }
function syncLegacy(player) { const c = characters.find(x => x.id === player.characterId); if (c) Object.assign(c, { gold: player.gold, reputation: player.reputation, health: player.health }) }
function saveCharacter() { if (!characterDraft.name.trim()) return toast('Character needs a name'); if (characterDraft.id) Object.assign(characters.find(c => c.id === characterDraft.id), characterDraft); else characters.push(createCharacter({ ...characterDraft })); Object.assign(characterDraft, blankCharacterDraft()); toast('Character saved') }
function editCharacter(c) { Object.assign(characterDraft, c) }
function deleteCharacter(id) { const i = characters.findIndex(c => c.id === id); if (i >= 0) characters.splice(i, 1); selectedCharacterIds.value = selectedCharacterIds.value.filter(x => x !== id) }
function iconForType(type) { return { quest: '📜', market: '🛒', monster: '👹', treasure: '💰', trap: '🕳️', rest: '🔥', event: '🎲', boss: '🐉' }[type] || '⬜' }
function saveAll() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, characters, sessions })); toast('Saved locally') }
function loadAll() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!saved) return false; replaceGame(saved.game || createRpgMonopolyGame()); characters.splice(0, characters.length, ...(saved.characters || [])); sessions.splice(0, sessions.length, ...(saved.sessions || [])); selectedSpaceId.value = game.board.spaces[0]?.id; activeSessionId.value = sessions[0]?.id ?? null; return true } catch { return false } }
function exportJson() { const blob = new Blob([JSON.stringify({ game, characters, sessions }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${game.name.toLowerCase().replaceAll(' ', '-')}-save.json`; a.click(); URL.revokeObjectURL(url) }
async function importJson(e) { const file = e.target.files?.[0]; if (!file) return; try { const saved = JSON.parse(await file.text()); replaceGame(saved.game || saved); characters.splice(0, characters.length, ...(saved.characters || characters)); sessions.splice(0, sessions.length, ...(saved.sessions || [])); activeSessionId.value = sessions[0]?.id ?? null; saveAll(); toast('Imported') } catch { toast('Invalid JSON') } finally { e.target.value = '' } }
function toast(text) { snackbar.text = text; snackbar.show = true }
watch([game, characters, sessions], saveAll, { deep: true })
onMounted(() => { if (!loadAll()) selectedSpaceId.value = game.board.spaces[0]?.id })
</script>

<style>
body{margin:0;background:#f8f3ea}.board-wrap{overflow:auto;display:grid;place-items:center;min-height:74vh}.board{position:relative;border-radius:28px;background:radial-gradient(circle at center,rgba(255,255,255,.86),rgba(234,218,190,.72)),linear-gradient(135deg,#c9a66b,#7d5a35);border:10px solid #5d4037;box-shadow:0 20px 50px rgba(70,45,25,.28)}.board-center{position:absolute;inset:25%;display:grid;place-items:center;align-content:center;gap:8px;text-align:center;border:3px dashed rgba(93,64,55,.45);border-radius:24px;color:#4e342e;background:rgba(255,253,248,.55)}.board-center strong{font-size:clamp(24px,4vw,48px)}.space{position:absolute;border:2px solid rgba(78,52,46,.55);border-radius:14px;background:#fff8e1;color:#3e2723;display:grid;grid-template-rows:1fr auto auto;place-items:center;padding:5px;cursor:pointer;box-shadow:0 5px 12px rgba(50,30,20,.2);transition:.15s}.space:hover,.space.selected{transform:translateY(-3px) scale(1.03);box-shadow:0 10px 18px rgba(50,30,20,.32);outline:4px solid rgba(255,179,0,.65)}.space-icon{font-size:24px}.space-name{font-size:11px;font-weight:700;line-height:1.05}.space-kind{font-size:9px;opacity:.7;text-transform:uppercase}.pawns{position:absolute;bottom:-13px;right:-8px;font-size:18px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
</style>
