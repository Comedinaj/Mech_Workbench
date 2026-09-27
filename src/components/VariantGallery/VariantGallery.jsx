import { useEffect, useRef, useState } from 'react'
import CadCard from '../CadCard/CadCard.jsx'

export default function VariantGallery({ cardId, onClose }) {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    fetch(`/api/cards/${cardId}/variants`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data) => setVariants(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [cardId])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 z-50 mb-2 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Variants</p>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none focus:outline-none"
          aria-label="Close variants"
        >
          ×
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      )}

      {error && (
        <p className="text-xs text-red-400 py-2">{error}</p>
      )}

      {!loading && !error && variants.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No variants found.</p>
      )}

      {!loading && !error && variants.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {variants.map((v) => (
            <CadCard key={v.id} card={v} mini />
          ))}
        </div>
      )}
    </div>
  )
}
