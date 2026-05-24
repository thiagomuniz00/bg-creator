# Board Game Creator

A small Vuetify-based tool for creating and playtesting board game prototypes.

The first goal is to make quick games to try with a 6-year-old child, while keeping the project open enough for other people to contribute templates and tools.

## Current prototype

Everything is intentionally inside `src/App.vue` for fast iteration.

Features included:

- Vite + Vue + Vuetify setup
- Local storage autosave
- Manual save button
- Export game as JSON
- Import JSON save file
- Board preview
- Square-loop and circle board layouts
- Editable board size, tile size, tile amount, center text, and victory condition
- Editable spaces with type, icon, cost, reward, danger, and effect
- Quick-add board spaces
- Templates:
  - Blank Board
  - RPG Monopoly Style
  - Simple Quest Path

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Next cleanup step

Later we should split `src/App.vue` into components and composables, probably:

- `BoardPreview.vue`
- `ProjectPanel.vue`
- `SpaceEditor.vue`
- `RuleEditor.vue`
- `templates.js`
- `storage.js`
