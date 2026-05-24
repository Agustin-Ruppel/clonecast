/**
 * Merge disk-level brand.json with an optional per-video override.
 *
 * Rules:
 *  - If no override, return disk brand (may be null).
 *  - If disk brand is null but override is present, return the override as-is
 *    (the composition layer treats undefined fields as defaults).
 *  - Otherwise shallow-merge override on top of disk brand. Only keys explicitly
 *    set in `override` win — `undefined` values do NOT clobber the disk values.
 */
import type { BrandPack } from '../types';

export function mergeBrand(
  diskBrand: BrandPack | null,
  override: Partial<BrandPack> | null,
): BrandPack | null {
  if (!override) return diskBrand;
  const cleaned: Partial<BrandPack> = {};
  for (const [k, v] of Object.entries(override)) {
    if (v !== undefined && v !== '') (cleaned as Record<string, unknown>)[k] = v;
  }
  if (!diskBrand) return cleaned as BrandPack;
  return { ...diskBrand, ...cleaned };
}
