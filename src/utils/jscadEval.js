import * as jscadModeling from '@jscad/modeling'

/**
 * Evaluate a JSCAD source string and return the resulting geometry.
 *
 * The source is expected to export a `main` function either via:
 *   - CommonJS-style:  exports.main = () => geometry
 *   - return value:    return { main: () => geometry }
 *
 * The `jscad` argument injected into the function is the full @jscad/modeling
 * module, so sources can destructure from it:
 *   const { primitives: { cuboid } } = jscad
 *
 * @param {string} source - Raw JSCAD JavaScript source string.
 * @returns {object} - The JSCAD geometry returned by main().
 * @throws {Error} - If the source fails to evaluate or main() is missing.
 */
export function evalJscadSource(source) {
  // Provide a minimal `exports`/`require` shim so CommonJS-style sources work.
  const exportsShim = {}
  const requireShim = (mod) => {
    if (mod === '@jscad/modeling') return jscadModeling
    throw new Error(`require('${mod}') is not available in the JSCAD sandbox`)
  }

  // Wrap source in a function that receives `jscad`, `exports`, and `require`.
  // eslint-disable-next-line no-new-func
  const fn = new Function('jscad', 'exports', 'require', source)
  fn(jscadModeling, exportsShim, requireShim)

  const mainFn = exportsShim.main
  if (typeof mainFn !== 'function') {
    throw new Error('JSCAD source must define exports.main as a function')
  }

  return mainFn()
}
