/**
 * Deduplication.
 *
 * Feeds repeat themselves — the same release appears in an all-releases feed and
 * a topic feed, and a speech is announced twice. Exact URL matching catches some
 * of it; the rest needs title similarity, because the wording differs slightly.
 */

const STOP = new Set(["the", "a", "an", "of", "and", "for", "to", "in", "on", "at", "by",
  "with", "from", "as", "is", "are", "be", "will", "its", "it", "that", "this", "s"]);

export function tokens(text) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

export function jaccard(a, b) {
  const setA = new Set(a), setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared++;
  return shared / (setA.size + setB.size - shared);
}

/**
 * @returns {{items: Array, removed: number}} survivors keep a `duplicates` count,
 *          which later feeds corroboration scoring rather than being discarded.
 */
export function dedupe(stories, { threshold = 0.68 } = {}) {
  const byUrl = new Map();
  for (const item of stories) {
    const key = canonicalUrl(item.url);
    if (!byUrl.has(key)) byUrl.set(key, { ...item, duplicates: 0, alsoIn: [] });
    else {
      const kept = byUrl.get(key);
      kept.duplicates++;
      if (!kept.alsoIn.includes(item.sourceId)) kept.alsoIn.push(item.sourceId);
    }
  }

  const survivors = [];
  let removed = stories.length - byUrl.size;

  for (const candidate of byUrl.values()) {
    candidate._tokens = tokens(candidate.title);
    const twin = survivors.find((kept) =>
      kept.sourceId === candidate.sourceId &&
      jaccard(kept._tokens, candidate._tokens) >= threshold);
    if (twin) {
      twin.duplicates++;
      removed++;
      // Keep whichever is older: the first publication is the event.
      if (candidate.publishedAt && twin.publishedAt && candidate.publishedAt < twin.publishedAt) {
        twin.title = candidate.title;
        twin.url = candidate.url;
        twin.publishedAt = candidate.publishedAt;
      }
      continue;
    }
    survivors.push(candidate);
  }

  return { items: survivors, removed };
}

export function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_|^ref$|^source$/i.test(key)) parsed.searchParams.delete(key);
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`.toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}
