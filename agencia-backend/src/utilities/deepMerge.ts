type DeepMergeObject = Record<string, unknown>

function isObject(value: unknown): value is DeepMergeObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepMerge<T extends DeepMergeObject>(target: T, source: Partial<T>): T {
  const output: DeepMergeObject = { ...target }

  for (const key of Object.keys(source)) {
    const targetValue = output[key]
    const sourceValue = (source as DeepMergeObject)[key]

    if (isObject(targetValue) && isObject(sourceValue)) {
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
