type DeepMergeObject = Record<string, unknown>

function isObject(value: unknown): value is DeepMergeObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && !value.some((item) => isObject(item))
}

export function deepMerge<T extends DeepMergeObject>(target: T, source: Partial<T>): T {
  const output: DeepMergeObject = { ...target }

  for (const key of Object.keys(source)) {
    const targetValue = output[key]
    const sourceValue = (source as DeepMergeObject)[key]

    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      if (isPlainArray(sourceValue)) {
        // Plain value arrays → replace
        output[key] = [...sourceValue]
      } else {
        // Object arrays → merge by index
        const maxLen = Math.max(sourceValue.length, targetValue.length)
        const merged: unknown[] = []
        for (let i = 0; i < maxLen; i++) {
          const targetItem = targetValue[i]
          const sourceItem = sourceValue[i]
          if (isObject(targetItem) && isObject(sourceItem)) {
            merged.push(deepMerge(
              targetItem as DeepMergeObject,
              sourceItem as DeepMergeObject,
            ))
          } else {
            merged.push(sourceItem !== undefined ? sourceItem : targetItem)
          }
        }
        output[key] = merged
      }
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      output[key] = deepMerge(
        targetValue as DeepMergeObject,
        sourceValue as DeepMergeObject,
      )
    } else if (sourceValue !== undefined) {
      output[key] = sourceValue
    }
  }

  return output as T
}
