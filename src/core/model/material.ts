export const Material = {
  Empty: 0,
  Wall: 1,
  Sand: 2,
} as const;

export type Material = (typeof Material)[keyof typeof Material];

export function isMaterial(value: number): value is Material {
  return value === Material.Empty || value === Material.Wall || value === Material.Sand;
}
