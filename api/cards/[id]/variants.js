import { getVariants } from '../../../_lib/cardStore.js'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const { id } = req.query
  const variants = getVariants(id)
  return res.status(200).json(variants)
}
