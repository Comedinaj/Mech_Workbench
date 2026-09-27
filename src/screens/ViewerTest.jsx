import { useState } from 'react'
import JscadViewer from '../components/JscadViewer/JscadViewer.jsx'

// The fixture source from data/cards.json (cube 10×10×10 mm)
const CUBE_SOURCE = `
const { primitives } = require('@jscad/modeling');
const { cuboid } = primitives;
exports.main = () => cuboid({ size: [10, 10, 10] });
`

export default function ViewerTest() {
  const [thumbnail, setThumbnail] = useState(null)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">JscadViewer — Smoke Test</h1>

      <div className="w-[480px] h-[480px] rounded-lg overflow-hidden border border-gray-700">
        <JscadViewer jscadSource={CUBE_SOURCE} onThumbnail={setThumbnail} />
      </div>

      {thumbnail && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400">Captured thumbnail:</p>
          <img
            src={thumbnail}
            alt="JSCAD thumbnail"
            className="w-32 h-32 rounded border border-gray-600"
          />
        </div>
      )}
    </div>
  )
}
