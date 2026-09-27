import { getAllRootCards, saveCard } from '../_lib/cardStore.js'

export default function handler(req, res) {
  if (req.method === 'GET') {
    const cards = getAllRootCards()
    return res.status(200).json(cards)
  }

  if (req.method === 'POST') {
    const card = req.body
    if (!card || !card.id) {
      return res.status(400).json({ error: 'Card body with id is required' })
    }
    saveCard(card)
    return res.status(201).json(card)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
