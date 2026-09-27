import { useEffect, useMemo, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { evalJscadSource } from '../../utils/jscadEval.js'
import { jscadGeomToBufferGeometry } from '../../utils/jscadToThree.js'

// ---------------------------------------------------------------------------
// ThumbnailCapture — lives inside Canvas, fires onThumbnail once geometry ready
// ---------------------------------------------------------------------------
function ThumbnailCapture({ onThumbnail }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    if (!onThumbnail) return
    const raf = requestAnimationFrame(() => {
      gl.render(scene, camera)
      const dataURL = gl.domElement.toDataURL('image/png')
      onThumbnail(dataURL)
    })
    return () => cancelAnimationFrame(raf)
  }, [gl, scene, camera, onThumbnail])

  return null
}

// ---------------------------------------------------------------------------
// Scene — geometry eval, lights, controls, mesh, and thumbnail capture
// ---------------------------------------------------------------------------
function Scene({ jscadSource, onThumbnail, onError }) {
  const { geometry, error } = useMemo(() => {
    try {
      const geom = evalJscadSource(jscadSource)
      return { geometry: jscadGeomToBufferGeometry(geom), error: null }
    } catch (err) {
      return { geometry: null, error: err.message }
    }
  }, [jscadSource])

  // Propagate error state up to the React tree outside the Canvas
  useEffect(() => {
    onError(error)
  }, [error, onError])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} />
      <OrbitControls enablePan enableZoom enableRotate />
      {geometry && (
        <>
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#4a90d9" />
          </mesh>
          <ThumbnailCapture onThumbnail={onThumbnail} />
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// JscadViewer — public component
// ---------------------------------------------------------------------------

/**
 * Renders a JSCAD source string as an interactive 3-D model.
 *
 * Props:
 *   jscadSource  {string}                     – Raw JSCAD JS source string.
 *   onThumbnail  {(dataURL: string) => void}  – Called once after first render.
 *   className    {string}                     – Extra CSS classes for the wrapper div.
 *   style        {object}                     – Inline styles for the wrapper div.
 */
export default function JscadViewer({ jscadSource, onThumbnail, className = '', style }) {
  const [error, setError] = useState(null)

  // Stable callback so the Scene useEffect dep-array doesn't retrigger every render
  const handleError = useCallback((msg) => setError(msg), [])

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={style}
    >
      <Canvas
        camera={{ position: [20, 20, 20], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          jscadSource={jscadSource}
          onThumbnail={onThumbnail}
          onError={handleError}
        />
      </Canvas>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="bg-red-900/90 text-red-200 text-sm rounded-lg px-4 py-3 max-w-xs text-center shadow-lg">
            <p className="font-semibold mb-1">JSCAD Error</p>
            <p className="font-mono break-all">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
