import { describe, expect, it, vi } from "vitest";

const getSourcesState = vi.fn();
const saveStoredState = vi.fn();

vi.mock("@/lib/sourceStore", () => ({
  getSourcesState: (...args: unknown[]) => getSourcesState(...args),
  saveStoredState: (...args: unknown[]) => saveStoredState(...args),
}));

import { GET, POST } from "@/app/api/sources/route";

describe("/api/sources", () => {
  it("returns source state", async () => {
    getSourcesState.mockResolvedValue({ envUrls: [], storedEntries: [], combinedEntries: [] });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ envUrls: [], storedEntries: [], combinedEntries: [] });
  });

  it("saves entries on POST", async () => {
    saveStoredState.mockResolvedValue({ entries: [], order: [] });
    getSourcesState.mockResolvedValue({ envUrls: [], storedEntries: [], combinedEntries: [], order: [] });

    const request = new Request("http://localhost/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(saveStoredState).toHaveBeenCalled();
    expect(data).toEqual({ envUrls: [], storedEntries: [], combinedEntries: [], order: [] });
  });
});
