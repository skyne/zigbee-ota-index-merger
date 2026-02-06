import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

vi.mock("fs", () => ({
  promises: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
  },
}));

vi.mock("crypto", () => ({
  randomUUID: () => "uuid-1234",
}));

describe("sourceStore", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReadFile.mockReset();
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
    process.env.INDEX_SOURCE_URLS = "https://env.example/index.json";
  });

  afterEach(() => {
    delete process.env.INDEX_SOURCE_URLS;
  });

  it("migrates legacy urls payload", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ urls: [" https://a.com ", "", "https://b.com"] })
    );

    const { getStoredState } = await import("@/lib/sourceStore");
    const state = await getStoredState();

    expect(state.entries).toHaveLength(2);
    expect(state.order).toHaveLength(2);
    expect(state.entries[0]?.id).toMatch(/^stored:url:/);
    expect(state.entries[1]?.id).toMatch(/^stored:url:/);
    expect(state.order).toEqual(state.entries.map((entry) => entry.id));
  });

  it("applies custom order to combined entries", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        entries: [
          { id: "stored:url:https://a.com", type: "url", value: "https://a.com" },
          { id: "stored:raw:uuid-1234", type: "raw", value: [] },
        ],
        order: [
          "stored:raw:uuid-1234",
          "env:url:https://env.example/index.json",
          "stored:url:https://a.com",
        ],
      })
    );

    const { getSourcesState } = await import("@/lib/sourceStore");
    const state = await getSourcesState();

    expect(state.combinedEntries.map((entry) => entry.id)).toEqual([
      "stored:raw:uuid-1234",
      "env:url:https://env.example/index.json",
      "stored:url:https://a.com",
    ]);
  });

  it("persists entries and order", async () => {
    const { saveStoredState } = await import("@/lib/sourceStore");

    await saveStoredState(
      [
        { id: "stored:url:https://a.com", type: "url", value: "https://a.com" },
        { id: "stored:raw:uuid-1234", type: "raw", value: [] },
      ],
      ["stored:raw:uuid-1234", "stored:url:https://a.com"]
    );

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    const payload = JSON.parse(mockWriteFile.mock.calls[0][1]);
    expect(payload.entries).toHaveLength(2);
    expect(payload.order).toEqual([
      "stored:raw:uuid-1234",
      "stored:url:https://a.com",
    ]);
  });
});
