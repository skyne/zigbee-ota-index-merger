export type ManufacturerEntry = {
  manufacturerCode: string | number;
  imageType: string | number;
  [key: string]: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const toManufacturerEntry = (value: unknown): ManufacturerEntry | null => {
  if (!isObject(value)) {
    return null;
  }

  const manufacturerCode = value.manufacturerCode;
  const imageType = value.imageType;
  if (typeof manufacturerCode !== "string" && typeof manufacturerCode !== "number") {
    return null;
  }
  if (typeof imageType !== "string" && typeof imageType !== "number") {
    return null;
  }

  return value as ManufacturerEntry;
};

export const getEntryKey = (entry: ManufacturerEntry) =>
  `${entry.manufacturerCode}::${entry.imageType}`;

export const mergeIndexSources = (sources: unknown[][]) => {
  const mergedByKey = new Map<string, ManufacturerEntry>();

  for (const source of sources) {
    for (const item of source) {
      const entry = toManufacturerEntry(item);
      if (!entry) {
        continue;
      }

      const entryKey = getEntryKey(entry);
      if (mergedByKey.has(entryKey)) {
        mergedByKey.delete(entryKey);
      }
      mergedByKey.set(entryKey, entry);
    }
  }

  return Array.from(mergedByKey.values());
};
