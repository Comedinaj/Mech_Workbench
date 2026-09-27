import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const DATA_PATH = resolve(process.cwd(), 'data/cards.json')

export function readCards() {
  const raw = readFileSync(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
}

export function writeCards(cards) {
  writeFileSync(DATA_PATH, JSON.stringify(cards, null, 2), 'utf-8')
}

export function getAllRootCards() {
  const cards = readCards()
  const rootCards = cards.filter((c) => c.parentId === null)
  return rootCards.map((card) => ({
    ...card,
    variantCount: cards.filter((c) => c.parentId === card.id).length,
  }))
}

export function getCard(id) {
  const cards = readCards()
  return cards.find((c) => c.id === id) ?? null
}

export function getVariants(parentId) {
  const cards = readCards()
  return cards.filter((c) => c.parentId === parentId)
}

export function saveCard(card) {
  const cards = readCards()
  const idx = cards.findIndex((c) => c.id === card.id)
  if (idx === -1) {
    cards.push(card)
  } else {
    cards[idx] = card
  }
  writeCards(cards)
}

export function deleteCard(id) {
  const cards = readCards()
  writeCards(cards.filter((c) => c.id !== id))
}
