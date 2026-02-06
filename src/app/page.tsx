"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type SourceResponse = {
  envUrls: string[];
  storedEntries: SourceEntry[];
  combinedEntries: SourceEntry[];
  order?: string[];
};

type SourceEntry =
  | { id: string; type: "url"; value: string }
  | { id: string; type: "raw"; value: unknown[] };

const createUrlId = (value: string) => `stored:url:${value}`;
const createRawId = () =>
  `stored:raw:${typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now()}`;

export default function Home() {
  const [envUrls, setEnvUrls] = useState<string[]>([]);
  const [storedEntries, setStoredEntries] = useState<SourceEntry[]>([]);
  const [combinedEntries, setCombinedEntries] = useState<SourceEntry[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newRawJson, setNewRawJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rawPreview, setRawPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/sources", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load sources (${response.status})`);
        }
        const data = (await response.json()) as SourceResponse;
        setEnvUrls(data.envUrls ?? []);
        setStoredEntries(data.storedEntries ?? []);
        setCombinedEntries(data.combinedEntries ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load sources"
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const saveState = async (entries: SourceEntry[], order: string[]) => {
    setError(null);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, order }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save sources (${response.status})`);
      }
      const data = (await response.json()) as SourceResponse;
      setEnvUrls(data.envUrls ?? []);
      setStoredEntries(data.storedEntries ?? []);
      setCombinedEntries(data.combinedEntries ?? []);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save sources"
      );
    }
  };

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) {
      return;
    }

    if (combinedEntries.some((entry) => entry.type === "url" && entry.value === trimmed)) {
      setNewUrl("");
      return;
    }

    const newEntry: SourceEntry = { id: createUrlId(trimmed), type: "url", value: trimmed };
    const nextStoredEntries = [...storedEntries, newEntry];
    const nextCombinedEntries = [...combinedEntries, newEntry];
    const order = nextCombinedEntries.map((entry) => entry.id);
    void saveState(nextStoredEntries, order);
    setNewUrl("");
  };

  const handleAddRaw = () => {
    const trimmed = newRawJson.trim();
    if (!trimmed) {
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        setError("Raw JSON must be an array of objects.");
        return;
      }
      const newEntry: SourceEntry = {
        id: createRawId(),
        type: "raw",
        value: parsed,
      };
      const nextStoredEntries = [...storedEntries, newEntry];
      const nextCombinedEntries = [...combinedEntries, newEntry];
      const order = nextCombinedEntries.map((entry) => entry.id);
      void saveState(nextStoredEntries, order);
      setNewRawJson("");
    } catch {
      setError("Raw JSON is invalid.");
    }
  };

  const handleRemoveStored = (id: string) => {
    const nextStoredEntries = storedEntries.filter((entry) => entry.id !== id);
    const nextCombinedEntries = combinedEntries.filter((entry) => entry.id !== id);
    const order = nextCombinedEntries.map((entry) => entry.id);
    void saveState(nextStoredEntries, order);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const updated = [...combinedEntries];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) {
      return;
    }

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const order = updated.map((entry) => entry.id);
    void saveState(storedEntries, order);
  };

  const handleCopy = async () => {
    try {
      const urls = combinedEntries
        .filter((entry) => entry.type === "url")
        .map((entry) => entry.value);
      await navigator.clipboard.writeText(urls.join(";"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenRaw = (entry: SourceEntry) => {
    if (entry.type !== "raw") {
      return;
    }
    setRawPreview(JSON.stringify(entry.value, null, 2));
  };

  const handleRemoveFromCombined = (index: number) => {
    const entry = combinedEntries[index];
    if (!entry || entry.id.startsWith("env:")) {
      return;
    }
    handleRemoveStored(entry.id);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Zigbee OTA index merger</p>
            <h1>Index source URL manager</h1>
            <p className={styles.subtitle}>
              Review the server-side list and update the stored sources used by
              the index merger. Changes are saved to the local data file on the
              server.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={handleCopy}>
              {copied ? "Copied" : "Copy combined list"}
            </button>
          </div>
        </header>

        <section className={styles.card}>
          <h2>Add a URL</h2>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="url"
              placeholder="https://example.com/index.json"
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
            />
            <button className={styles.primary} onClick={handleAdd}>
              Add
            </button>
          </div>
          <div className={styles.formRow}>
            <textarea
              className={styles.textarea}
              placeholder='Paste raw JSON array (e.g. [{"manufacturerCode":123,"imageType":1}])'
              value={newRawJson}
              onChange={(event) => setNewRawJson(event.target.value)}
              rows={4}
            />
            <button className={styles.primary} onClick={handleAddRaw}>
              Add raw JSON
            </button>
          </div>
          <p className={styles.helper}>
            URLs are appended to the list and take higher priority. Reorder
            stored URLs to control precedence.
          </p>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Server URLs</h2>
              <span className={styles.count}>{envUrls.length}</span>
            </div>
            {loading ? (
              <p className={styles.muted}>Loading server URLs...</p>
            ) : error ? (
              <p className={styles.error}>{error}</p>
            ) : envUrls.length === 0 ? (
              <p className={styles.muted}>No server URLs configured.</p>
            ) : (
              <ul className={styles.list}>
                {envUrls.map((url) => (
                  <li key={url} className={styles.listItem}>
                    <span>{url}</span>
                    <span className={styles.badge}>env</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Manage URLs</h2>
              <span className={styles.count}>{storedEntries.length}</span>
            </div>
            {storedEntries.length === 0 ? (
              <p className={styles.muted}>No sources stored.</p>
            ) : (
              <ul className={styles.list}>
                {storedEntries.map((entry) => (
                  <li key={entry.id} className={styles.listItem}>
                    <span>
                      {entry.type === "url"
                        ? entry.value
                        : `Raw JSON (${entry.value.length} items)`}
                    </span>
                    <div className={styles.itemActions}>
                      <button
                        className={styles.ghost}
                        onClick={() => handleRemoveStored(entry.id)}
                        aria-label="Remove stored entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Combined list</h2>
            <span className={styles.count}>{combinedEntries.length}</span>
          </div>
          {combinedEntries.length === 0 ? (
            <p className={styles.muted}>No sources in the combined list.</p>
          ) : (
            <ol className={styles.list}>
              {combinedEntries.map((entry, index) => (
                <li key={entry.id} className={styles.listItem}>
                  <span>
                    {entry.type === "url"
                      ? entry.value
                      : `Raw JSON (${entry.value.length} items)`}
                  </span>
                  <div className={styles.itemActions}>
                    <span className={styles.badge}>
                      {entry.id.startsWith("env:") ? "env" : "stored"}
                    </span>
                    <>
                      <button
                        className={styles.ghost}
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        ⬆️
                      </button>
                      <button
                        className={styles.ghost}
                        onClick={() => handleMove(index, "down")}
                        disabled={index === combinedEntries.length - 1}
                        aria-label="Move down"
                      >
                        ⬇️
                      </button>
                    </>
                    {entry.type === "raw" ? (
                      <button
                        className={styles.secondary}
                        onClick={() => handleOpenRaw(entry)}
                      >
                        View JSON
                      </button>
                    ) : null}
                    <button
                      className={styles.ghost}
                      onClick={() => handleRemoveFromCombined(index)}
                      disabled={entry.id.startsWith("env:")}
                      aria-label="Remove entry"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
      {rawPreview ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Raw JSON preview</h3>
              <button
                className={styles.ghost}
                onClick={() => setRawPreview(null)}
              >
                Close
              </button>
            </div>
            <pre className={styles.codeBlock}>{rawPreview}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
