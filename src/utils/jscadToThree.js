import * as THREE from 'three'

/**
 * Convert a JSCAD geometry object into a Three.js BufferGeometry.
 *
 * JSCAD geom3 objects expose a `polygons` array. Each polygon has a `vertices`
 * array of [x, y, z] coordinate arrays. Polygons are fan-triangulated so that
 * any convex n-gon becomes (n-2) triangles.
 *
 * @param {object} geom - A JSCAD geom3 geometry object.
 * @returns {THREE.BufferGeometry}
 * @throws {Error} - If the geometry has no polygons or is not a geom3.
 */
export function jscadGeomToBufferGeometry(geom) {
  if (!geom || !Array.isArray(geom.polygons)) {
    throw new Error('Invalid JSCAD geometry: expected a geom3 with a polygons array')
  }

  const positions = []

  for (const polygon of geom.polygons) {
    const verts = polygon.vertices
    if (!verts || verts.length < 3) continue

    // Fan triangulation: anchor = verts[0], pairs = (verts[i], verts[i+1])
    const anchor = verts[0]
    for (let i = 1; i < verts.length - 1; i++) {
      const v1 = verts[i]
      const v2 = verts[i + 1]
      positions.push(anchor[0], anchor[1], anchor[2])
      positions.push(v1[0], v1[1], v1[2])
      positions.push(v2[0], v2[1], v2[2])
    }
  }

  if (positions.length === 0) {
    throw new Error('JSCAD geometry produced no triangles')
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  )
  geometry.computeVertexNormals()

  return geometry
}
