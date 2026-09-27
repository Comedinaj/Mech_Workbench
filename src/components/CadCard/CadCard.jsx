import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Activity, Wrench, GitBranch } from 'lucide-react'
import VariantGallery from '../VariantGallery/VariantGallery.jsx'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="%231f2937"/%3E%3Ctext x="160" y="95" text-anchor="middle" fill="%234b5563" font-size="14" font-family="sans-serif"%3ENo thumbnail%3C/text%3E%3C/svg%3E'

function StatusIcon({ Icon, active, label }) {
  return (
    <span title={label} className={active ? 'text-blue-400' : 'text-gray-600'}>
      <Icon size={18} strokeWidth={1.8} />
    </span>
  )
}

export default function CadCard({ card, mini = false }) {
  const navigate = useNavigate()
  const [variantOpen, setVariantOpen] = useState(false)

  const {
    id, title, author, description, thumbnail,
    manufacturingProcesses = [], flags = {}, variantCount = 0,
  } = card

  const hasVariants = variantCount > 0

  if (mini) {
    return (
      <div className="w-48 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => navigate(`/workbench/${id}`)}>
        <img src={thumbnail || PLACEHOLDER} alt={title}
          className="w-full aspect-video object-cover" />
        <div className="p-2">
          <p className="text-xs font-semibold text-white truncate">{title}</p>
          <p className="text-xs text-gray-400 truncate">{author}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col hover:border-gray-500 transition-colors">
      {/* Thumbnail */}
      <img
        src={thumbnail || PLACEHOLDER}
        alt={title}
        className="w-full aspect-video object-cover bg-gray-900"
      />

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h2 className="font-bold text-white text-base leading-tight truncate">{title}</h2>
        <p className="text-xs text-gray-400">{author}</p>
        <p className="text-sm text-gray-300 line-clamp-2 flex-1">{description}</p>

        {/* Manufacturing process pills */}
        {manufacturingProcesses.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {manufacturingProcesses.map((p) => (
              <span key={p}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300 border border-gray-600">
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Status icons + actions row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <StatusIcon Icon={FileText} active={flags.has2DDrawing} label="2D Drawing" />
            <StatusIcon Icon={Activity} active={flags.hasFEM} label="FEM Simulation" />
            <StatusIcon Icon={Wrench} active={flags.hasManufacturingInstructions} label="Manufacturing Instructions" />
            <button
              disabled={!hasVariants}
              onClick={() => hasVariants && setVariantOpen((v) => !v)}
              className={`focus:outline-none transition-colors ${hasVariants ? 'text-blue-400 hover:text-blue-300 cursor-pointer' : 'text-gray-600 cursor-default'}`}
              title="Variants"
              aria-label="Show variants"
            >
              <GitBranch size={18} strokeWidth={1.8} />
            </button>
          </div>

          <button
            onClick={() => navigate(`/workbench/${id}`)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Open in CAD Workbench
          </button>
        </div>
      </div>

      {/* Variant sub-gallery */}
      {variantOpen && (
        <VariantGallery cardId={id} onClose={() => setVariantOpen(false)} />
      )}
    </div>
  )
}
