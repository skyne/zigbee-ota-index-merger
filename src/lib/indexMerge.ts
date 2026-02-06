export type IndexEntry = Record<string, unknown> & {
  manufacturerCode?: string | number;
  manufactureCode?: string | number;
  imageType?: string | number;
  image_type?: string | number;
  modelId?: string | string[];
  manufacturerName?: string | string[];
  fileVersion?: string | number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const toIndexEntry = (value: unknown): IndexEntry | null => {
  if (!isObject(value)) {
    return null;
  }

  return value as IndexEntry;
};

const readString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const readStringOrNumber = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const normalizeStringSet = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort();
  }
  return [];
};

export const getEntryKey = (entry: IndexEntry) => {
  const manufacturerCode = readStringOrNumber(
    entry.manufacturerCode ?? entry.manufactureCode
  );
  const imageType = readStringOrNumber(entry.imageType ?? entry.image_type);
  if (manufacturerCode && imageType) {
    return `mc:${manufacturerCode}::it:${imageType}`;
  }

  return null;
};

export const mergeIndexSources = (sources: unknown[][]) => {
  const merged: IndexEntry[] = [];
  const seen = new Set<string>();

  for (let sourceIndex = sources.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
    const source = sources[sourceIndex] ?? [];
    for (const item of source) {
      const entry = toIndexEntry(item);
      if (!entry) {
        continue;
      }

      const entryKey = getEntryKey(entry);
      if (!entryKey) {
        merged.push(entry);
        continue;
      }

      if (seen.has(entryKey)) {
        continue;
      }

      seen.add(entryKey);
      merged.push(entry);
    }
  }

  return merged;
};
