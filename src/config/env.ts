const parseUrlList = (value: string | undefined) =>
  (value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  indexSourceUrls: parseUrlList(process.env.INDEX_SOURCE_URLS),
};
