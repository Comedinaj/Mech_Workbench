import { useParams } from 'react-router-dom'

export default function Workbench() {
  const { cardId } = useParams()
  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold">CAD Workbench</h1>
      <p className="mt-2 text-gray-400">Screen 3 — card: {cardId} — coming in Stage 7.</p>
    </main>
  )
}
