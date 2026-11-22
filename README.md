# Ember Pact

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/MonyetAku/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/MonyetAku/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

A duel of ember cards against Mira, rival binder of the Ashen Hearth. You and the rival
each hold 30 life and a hand of ember cards in four suits — Flame, Leaf, Wave and Stone —
each told apart by colour and by shape. Every turn you gain embers, play one card onto the
shared hearth, and end your turn; the rival answers after a short think. A card deals its
value in damage, plus 2 when it matches the hearth card's suit and plus 3 (and a drawn card)
when it matches its value. First binder to 0 life loses the pact.

## How to play

- Click a card (or press 1–7) to pick it, then Enter, Space or the Play button to play it.
- E ends your turn. Space starts a new pact from the title or the end screen.
- A card's ember cost is shown as gold pips: values 1–3 cost one, 4–6 cost two, 7–9 cost three.
- Watch the hearth: chaining its suit or its value is where the big turns come from.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

`main.ts` hands the game in: it copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library. Outside the grader,
`MAKEFUN_OUTPUT_DIR` stands in for `/output`.

## Files

- `game/index.html` — the page; `game/src/main.js` boots the loop.
- `game/src/config.js` — tuning numbers, suits, palette.
- `game/src/cards.js` — what a card is and what chaining pays.
- `game/src/deck.js` — the shuffled draw pile.
- `game/src/world.js` — the rules: hands, hearth, life, embers, turns.
- `game/src/ai.js` — the rival's choice: most damage now, cheap ties first.
- `game/src/render.js` — the table, the cards, the hearth, the panels.
- `game/src/audio.js` — sounds synthesized in code (Web Audio, no files).
- `game/src/input.js` — keyboard and pointer.
- `game/src/shots.js` — the staged screenshot scenes.
