import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "@/config/env";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "sources.json");

export type SourceEntry =
  | { id: string; type: "url"; value: string }
  | { id: string; type: "raw"; value: unknown[] };

type SourcesPayload = {
  entries: SourceEntry[];
  order?: string[];
};

const createStoredUrlId = (value: string) => `stored:url:${value}`;
const createStoredRawId = () => `stored:raw:${randomUUID()}`;

const sanitizeEntries = (entries: unknown): SourceEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seen = new Set<string>();

  const sanitized: SourceEntry[] = [];

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    if ("type" in entry && (entry as { type?: unknown }).type === "url") {
      const value = (entry as { value?: unknown }).value;
      const rawId = (entry as { id?: unknown }).id;
      if (typeof value !== "string") {
        return [];
      }
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      let id = typeof rawId === "string" ? rawId : createStoredUrlId(trimmed);
      while (seen.has(id)) {
        id = `${id}:${randomUUID()}`;
      }
      seen.add(id);
      sanitized.push({ id, type: "url", value: trimmed });
      continue;
    }

    if ("type" in entry && (entry as { type?: unknown }).type === "raw") {
      const value = (entry as { value?: unknown }).value;
      const rawId = (entry as { id?: unknown }).id;
      if (!Array.isArray(value)) {
        continue;
      }
      let id = typeof rawId === "string" ? rawId : createStoredRawId();
      while (seen.has(id)) {
        id = createStoredRawId();
      }
      seen.add(id);
      sanitized.push({ id, type: "raw", value });
      continue;
    }

    continue;
  }

  return sanitized;
};

const sanitizeOrder = (order: unknown): string[] => {
  if (!Array.isArray(order)) {
    return [];
  }

  const seen = new Set<string>();
  return order
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value && !seen.has(value) && seen.add(value));
};

const migrateLegacyPayload = (payload: unknown): SourcesPayload => {
  if (typeof payload !== "object" || payload === null) {
    return { entries: [], order: [] };
  }

  if ("entries" in payload) {
    return {
      entries: sanitizeEntries((payload as { entries?: unknown }).entries),
      order: sanitizeOrder((payload as { order?: unknown }).order),
    };
  }

  if ("urls" in payload) {
    const rawUrls = (payload as { urls?: unknown }).urls;
    const urls = Array.isArray(rawUrls)
      ? rawUrls.filter((value): value is string => typeof value === "string")
      : [];
    const entries = urls
      .map((value) => ({
        id: createStoredUrlId(value.trim()),
        type: "url" as const,
        value: value.trim(),
      }))
      .filter((entry) => entry.value);
    return { entries, order: entries.map((entry) => entry.id) };
  }

  return { entries: [], order: [] };
};

export const getStoredState = async () => {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return migrateLegacyPayload(parsed);
  } catch {
    return { entries: [], order: [] };
  }
};

export const saveStoredState = async (
  entries: SourceEntry[],
  order?: string[]
) => {
  await fs.mkdir(dataDir, { recursive: true });
  const sanitizedEntries = sanitizeEntries(entries);
  const existing = await getStoredState();
  const sanitizedOrder = sanitizeOrder(order ?? existing.order);
  const payload: SourcesPayload = {
    entries: sanitizedEntries,
    order: sanitizedOrder,
  };
  await fs.writeFile(dataFile, JSON.stringify(payload, null, 2), "utf8");
  return payload;
};

const orderEntries = (entries: SourceEntry[], order: string[]) => {
  const map = new Map(entries.map((entry) => [entry.id, entry]));
  const ordered: SourceEntry[] = [];
  const seen = new Set<string>();

  for (const id of order) {
    const entry = map.get(id);
    if (!entry || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ordered.push(entry);
  }

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    ordered.push(entry);
  }

  return ordered;
};

export const getSourcesState = async () => {
  const { entries: storedEntries, order } = await getStoredState();
  const safeOrder = order ?? [];
  const envUrls = env.indexSourceUrls;
  const envEntries: SourceEntry[] = envUrls.map((url) => ({
    id: `env:url:${url}`,
    type: "url",
    value: url,
  }));
  const combinedEntries = orderEntries(
    [...envEntries, ...storedEntries],
    safeOrder
  );
  const orderedStoredEntries = orderEntries(storedEntries, safeOrder);
  return {
    envUrls,
    storedEntries: orderedStoredEntries,
    combinedEntries,
    order: safeOrder,
  };
};
