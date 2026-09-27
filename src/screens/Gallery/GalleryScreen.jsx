import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import CadCard from '../../components/CadCard/CadCard.jsx'

export default function GalleryScreen() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/cards')
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data) => setCards(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 relative">
      <h1 className="text-3xl font-bold mb-6">CAD Gallery</h1>

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-400">
          Loading cards…
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-48 text-red-400">
          Failed to load cards: {error}
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="flex items-center justify-center h-48 text-gray-500">
          No cards yet. Click <span className="mx-1 font-bold text-blue-400">+</span> to generate one.
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card) => (
            <CadCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Floating "+" button */}
      <button
        onClick={() => navigate('/generate')}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-950"
        aria-label="New CAD model"
      >
        <Plus size={28} strokeWidth={2} />
      </button>
    </main>
  )
}
