export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

function normalize(value: unknown, path: string): CanonicalJsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Canonical JSON does not support non-finite number at ${path}.`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry, index) => normalize(entry, `${path}[${index}]`)));
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const output: Record<string, CanonicalJsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      const entry = source[key];
      if (entry === undefined) {
        continue;
      }
      output[key] = normalize(entry, `${path}.${key}`);
    }
    return Object.freeze(output);
  }

  throw new TypeError(`Canonical JSON does not support ${typeof value} at ${path}.`);
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(normalize(value, '$'));
}
