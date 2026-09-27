import { getCard, saveCard, deleteCard } from '../../_lib/cardStore.js'

export default function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    const card = getCard(id)
    if (!card) return res.status(404).json({ error: 'Card not found' })
    return res.status(200).json(card)
  }

  if (req.method === 'PATCH') {
    const existing = getCard(id)
    if (!existing) return res.status(404).json({ error: 'Card not found' })
    const updated = { ...existing, ...req.body, id }
    saveCard(updated)
    return res.status(200).json(updated)
  }

  if (req.method === 'DELETE') {
    const existing = getCard(id)
    if (!existing) return res.status(404).json({ error: 'Card not found' })
    deleteCard(id)
    return res.status(204).end()
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
