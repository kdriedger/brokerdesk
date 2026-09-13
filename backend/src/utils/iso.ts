export const iso = (value: Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toISOString();

export const isoRequired = (value: Date): string => value.toISOString();
