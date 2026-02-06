import { describe, expect, it } from "vitest";
import { getEntryKey, mergeIndexSources, toIndexEntry } from "@/lib/indexMerge";

describe("toIndexEntry", () => {
  it("returns null for non-objects", () => {
    expect(toIndexEntry(null)).toBeNull();
    expect(toIndexEntry("nope")).toBeNull();
  });

  it("accepts objects without required keys", () => {
    const entry = toIndexEntry({ url: "./file.ota", foo: "bar" });
    expect(entry).not.toBeNull();
    expect(entry?.url).toBe("./file.ota");
  });
});

describe("getEntryKey", () => {
  it("prefers manufacturerCode + imageType", () => {
    const key = getEntryKey({ manufacturerCode: 1, imageType: 2 });
    expect(key).toBe("mc:1::it:2");
  });

  it("returns null when manufacturerCode or imageType missing", () => {
    expect(getEntryKey({ manufacturerName: "_TZE200_test", modelId: "TS0601" })).toBeNull();
  });
});

describe("mergeIndexSources", () => {
  it("merges by manufacturerCode + imageType with later sources overriding", () => {
    const sources = [
      [
        { manufacturerCode: 1, imageType: 100, value: "a" },
        { manufacturerCode: 2, imageType: 200, value: "b" },
      ],
      [
        { manufacturerCode: 1, imageType: 100, value: "c" },
        { manufacturerCode: 3, imageType: 300, value: "d" },
      ],
    ];

    const merged = mergeIndexSources(sources);
    const byKey = new Map(
      merged.map((entry) => [
        `${entry.manufacturerCode}::${entry.imageType}`,
        entry,
      ])
    );

    expect(byKey.get("1::100")?.value).toBe("c");
    expect(byKey.get("2::200")?.value).toBe("b");
    expect(byKey.get("3::300")?.value).toBe("d");
    expect(merged[0]?.manufacturerCode).toBe(1);
    expect(merged[0]?.imageType).toBe(100);
  });

  it("keeps entries without manufacturerCode as-is", () => {
    const sources = [
      [{ manufacturerName: "_TZE200_test", modelId: "TS0601" }],
      [{ manufacturerName: "_TZE200_test", modelId: "TS0601", foo: "bar" }],
    ];
    const merged = mergeIndexSources(sources);
    expect(merged).toHaveLength(2);
  });
});
