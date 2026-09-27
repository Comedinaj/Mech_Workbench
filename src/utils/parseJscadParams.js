/**
 * Parse `input_` prefixed variable declarations from a JSCAD source string.
 *
 * Supported inline-comment annotations (on the same line as the declaration):
 *   // slider min=X max=Y step=Z   → range input
 *   // options A|B|C               → select / radio group
 *   // int                         → number input, step=1
 *   // float                       → number input, step=0.1
 *   (none / default)               → text input
 *
 * @param {string} source
 * @returns {Array<{ name, type, defaultValue, min?, max?, step?, options? }>}
 */
export function parseJscadParams(source) {
  if (!source) return []

  const results = []
  // Match: const input_<name> = <value>; // optional comment
  const lineRe = /^\s*(?:const|let|var)\s+(input_\w+)\s*=\s*([^;/\n]+?)\s*;?\s*(?:\/\/\s*(.+))?$/gm

  let match
  while ((match = lineRe.exec(source)) !== null) {
    const rawName = match[1]          // input_width
    const rawValue = match[2].trim()  // 10 or 'cube'
    const comment = (match[3] || '').trim()

    const name = rawName.replace(/^input_/, '')

    // Parse defaultValue — try number first, then strip quotes for string
    let defaultValue = rawValue
    const asNum = Number(rawValue)
    if (!isNaN(asNum) && rawValue !== '') {
      defaultValue = asNum
    } else {
      // strip surrounding quotes
      defaultValue = rawValue.replace(/^['"`]|['"`]$/g, '')
    }

    // Determine type from comment
    if (/^slider/i.test(comment)) {
      const minM = comment.match(/min=([\d.+-]+)/)
      const maxM = comment.match(/max=([\d.+-]+)/)
      const stepM = comment.match(/step=([\d.]+)/)
      results.push({
        name,
        type: 'slider',
        defaultValue,
        min: minM ? Number(minM[1]) : 0,
        max: maxM ? Number(maxM[1]) : 100,
        step: stepM ? Number(stepM[1]) : 1,
      })
    } else if (/^options\s+/i.test(comment)) {
      const optStr = comment.replace(/^options\s+/i, '')
      const options = optStr.split('|').map((o) => o.trim())
      results.push({ name, type: 'options', defaultValue, options })
    } else if (/\bint\b/i.test(comment) || (typeof defaultValue === 'number' && Number.isInteger(defaultValue))) {
      results.push({ name, type: 'int', defaultValue })
    } else if (/\bfloat\b/i.test(comment) || (typeof defaultValue === 'number')) {
      const stepM = comment.match(/step=([\d.]+)/)
      results.push({ name, type: 'float', defaultValue, step: stepM ? Number(stepM[1]) : 0.1 })
    } else {
      results.push({ name, type: 'text', defaultValue })
    }
  }

  return results
}

/**
 * Substitute input_ variable values in a JSCAD source string.
 *
 * @param {string} source
 * @param {Record<string, string|number>} paramValues
 * @returns {string}
 */
export function substituteParams(source, paramValues) {
  let result = source
  for (const [name, value] of Object.entries(paramValues)) {
    const varName = `input_${name}`
    const escaped = typeof value === 'string' ? `'${value}'` : String(value)
    result = result.replace(
      new RegExp(`((?:const|let|var)\\s+${varName}\\s*=\\s*)[^;/\\n]+?(?=\\s*[;/\\n])`),
      `$1${escaped}`
    )
  }
  return result
}
