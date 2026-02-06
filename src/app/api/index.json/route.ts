import { NextResponse } from "next/server";
import { getSourcesState } from "@/lib/sourceStore";
import { mergeIndexSources } from "@/lib/indexMerge";

const fetchJsonArray = async (url: string) => {
  try {
    console.info("[index.json] fetching", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.warn("[index.json] non-OK response", url, response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    // if (!contentType.includes("application/json")) {
    //   console.warn("[index.json] non-JSON content-type", url, contentType);
    //   return null;
    // }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      console.warn("[index.json] JSON is not an array", url);
      return null;
    }

    console.info("[index.json] fetched items", url, data.length);
    return data;
  } catch (error) {
    console.error("[index.json] fetch failed", url, error);
    return null;
  }
};

export async function GET() {
  const { combinedEntries } = await getSourcesState();

  try {
    console.info(
      "[index.json] source entries",
      combinedEntries.map((entry) => entry.type)
    );
    const sources: unknown[][] = [];

    for (const entry of combinedEntries) {
      if (entry.type === "raw") {
        sources.push(entry.value);
        continue;
      }

      const data = await fetchJsonArray(entry.value);
      if (!data) {
        console.warn("[index.json] skipped source", entry.value);
        continue;
      }

      sources.push(data);
    }

    const merged = mergeIndexSources(sources);

    console.info(
      "[index.json] merged items",
      merged.length
    );

    return NextResponse.json(merged, {
      status: 200,
    });
  } catch (error) {
    console.error("[index.json] handler failed", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON from source" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to merge index sources" },
      { status: 500 }
    );
  }
}
