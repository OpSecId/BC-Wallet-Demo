import type { Attribute } from '../slices/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAttributesFromProof = (proof: any) => {
  const requestedProof = proof?.presentation?.requested_proof || proof?.pres?.requested_proof || proof?.requested_proof

  const groups = requestedProof?.revealed_attr_groups
  const attributes: Attribute[] = []

  if (groups) {
    for (const prop in groups) {
      const values = groups[prop]?.values
      if (!values) continue
      for (const prop2 in values) {
        attributes.push({ name: prop2, value: values[prop2].raw })
      }
    }
    return attributes
  }

  const flat = requestedProof?.revealed_attrs
  if (flat) {
    for (const reft in flat) {
      const spec = flat[reft]
      if (spec?.raw !== undefined) {
        attributes.push({ name: reft, value: spec.raw })
      }
    }
  }

  return attributes
}
