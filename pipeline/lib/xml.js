/**
 * A deliberately small RSS/Atom reader.
 *
 * Not a general XML parser and not trying to be. It extracts the handful of
 * elements a feed item actually carries, because pulling in a parser dependency
 * for that would be the largest supply-chain risk in the project.
 */

const TAG = (name) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
const TAG_ALL = (name) => new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?</${name}>`, "gi");
const SELF_OR_PAIR = (name) => new RegExp(`<${name}(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${name}>)`, "i");

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  "&nbsp;": " ", "&#39;": "'", "&#8217;": "’", "&#8216;": "‘",
  "&#8220;": "“", "&#8221;": "”", "&#8212;": "—", "&#8211;": "–",
};

export function decode(text = "") {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .trim();
}

export const stripTags = (html = "") =>
  decode(String(html).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

function pick(block, ...names) {
  for (const name of names) {
    const match = block.match(TAG(name));
    if (match && match[1] !== undefined) {
      const value = decode(match[1]);
      if (value) return value;
    }
  }
  return "";
}

function pickLink(block) {
  const direct = pick(block, "link");
  if (direct && /^https?:/i.test(direct)) return direct;
  const href = block.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*>/i);
  if (href) return decode(href[1]);
  const guid = pick(block, "guid", "id");
  return /^https?:/i.test(guid) ? guid : "";
}

/** Parse an RSS 2.0 or Atom document into a flat list of items. */
export function parseFeed(xml, { limit = 60 } = {}) {
  if (!xml) return [];
  const blocks = [
    ...(xml.match(TAG_ALL("item")) || []),
    ...(xml.match(TAG_ALL("entry")) || []),
  ];

  return blocks.slice(0, limit).map((block) => {
    const published = pick(block, "pubDate", "published", "updated", "dc:date");
    const summaryRaw = pick(block, "description", "summary", "content");
    return {
      title: stripTags(pick(block, "title")),
      url: pickLink(block),
      publishedAt: normaliseDate(published),
      summary: stripTags(summaryRaw).slice(0, 700),
      author: pick(block, "author", "dc:creator").replace(/<[^>]+>/g, "").trim(),
      categories: [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
        .map((match) => decode(match[1])).filter(Boolean),
    };
  }).filter((item) => item.title && item.url);
}

export function feedTitle(xml) {
  const head = xml.split(/<(?:item|entry)\b/i)[0] || "";
  const match = head.match(SELF_OR_PAIR("title"));
  return match ? stripTags(match[1] || "") : "";
}

function normaliseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
