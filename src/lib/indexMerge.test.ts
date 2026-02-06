import { describe, expect, it } from "vitest";
import { mergeIndexSources, toManufacturerEntry } from "@/lib/indexMerge";

describe("toManufacturerEntry", () => {
  it("returns null for invalid entries", () => {
    expect(toManufacturerEntry(null)).toBeNull();
    expect(toManufacturerEntry({})).toBeNull();
    expect(toManufacturerEntry({ manufacturerCode: 1 })).toBeNull();
    expect(toManufacturerEntry({ imageType: 2 })).toBeNull();
  });

  it("accepts entries with manufacturerCode and imageType", () => {
    const entry = toManufacturerEntry({ manufacturerCode: 1, imageType: 2, foo: "bar" });
    expect(entry).not.toBeNull();
    expect(entry?.manufacturerCode).toBe(1);
    expect(entry?.imageType).toBe(2);
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
    const byKey = new Map(merged.map((entry) => [`${entry.manufacturerCode}::${entry.imageType}`, entry]));

    expect(byKey.get("1::100")?.value).toBe("c");
    expect(byKey.get("2::200")?.value).toBe("b");
    expect(byKey.get("3::300")?.value).toBe("d");
  });

  it("ignores items without required keys", () => {
    const sources = [[{ manufacturerCode: 1, imageType: 10 }, { foo: "bar" }]];
    const merged = mergeIndexSources(sources);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.manufacturerCode).toBe(1);
  });
});
