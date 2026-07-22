/**
 * itinerary-formatter.ts
 * ========================
 * Converts a structured JSON itinerary (as returned by the watsonx backend)
 * into clean, human-readable markdown-style text for display in the chat UI.
 *
 * Rules:
 *  - Never expose raw JSON or object notation to the user.
 *  - Uses the same markdown dialect that ChatbotPage.formatText() already renders:
 *      # H1   ## H2   **bold**   - bullet   blank line = spacer
 *  - All fields are optional; missing sections are silently skipped.
 *  - Exported as a pure function — no React dependency.
 */

type Itinerary = Record<string, unknown>;

/**
 * Attempts to parse `raw` as JSON.
 * Returns the parsed object on success, or null if parsing fails.
 * Strips markdown code fences if the model wrapped the JSON in them.
 */
export function tryParseItinerary(raw: string): Itinerary | null {
  let text = raw.trim();

  // Strip ```json ... ``` fences
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    lines.shift();                                  // remove opening ```
    if (lines.at(-1)?.trim() === "```") lines.pop(); // remove closing ```
    text = lines.join("\n").trim();
  }

  // Find the outermost { … }
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as Itinerary;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/**
 * Converts a parsed itinerary JSON object into a formatted string
 * using the markdown dialect that ChatbotPage.formatText() understands.
 */
export function formatItinerary(it: Itinerary): string {
  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  const summary = obj(it.trip_summary);
  const destination = str(summary.destination) || str(it.destination);
  const days        = str(summary.duration_days) || str(it.days);
  const style       = str(summary.travel_style);
  const budget      = str(summary.budget_tier);

  lines.push(`# ✈️ Your ${destination} Itinerary`);
  lines.push("");
  if (days)   lines.push(`**Duration:** ${days} day${Number(days) !== 1 ? "s" : ""}`);
  if (style)  lines.push(`**Travel style:** ${style}`);
  if (budget) lines.push(`**Budget tier:** ${budget}`);
  if (it.why_this_plan) lines.push(`**Why this plan:** ${str(it.why_this_plan)}`);
  lines.push("");

  // ── Day-by-day itinerary ─────────────────────────────────────────────────
  const daywise = arr<Record<string, unknown>>(it.daywise_itinerary);
  if (daywise.length > 0) {
    lines.push("## 🗓️ Day-by-Day Itinerary");
    lines.push("");
    for (const day of daywise) {
      const num   = str(day.day);
      const theme = str(day.theme);
      const why   = str(day.why);
      lines.push(`**Day ${num}${theme ? ` — ${theme}` : ""}**`);
      if (why) lines.push(why);
      const activities = arr<unknown>(day.activities);
      for (const act of activities) {
        lines.push(`- ${str(act)}`);
      }
      lines.push("");
    }
  }

  // ── Food ────────────────────────────────────────────────────────────────
  const food = arr<Record<string, unknown>>(it.food);
  if (food.length > 0) {
    lines.push("## 🍽️ Food & Restaurants");
    lines.push("");
    for (const f of food) {
      const name = str(f.name);
      const type = str(f.type);
      const desc = str(f.description);
      const why  = str(f.why);
      lines.push(`**${name}**${type ? ` *(${type})*` : ""}`);
      if (desc) lines.push(desc);
      if (why)  lines.push(`- ${why}`);
      lines.push("");
    }
  }

  // ── Where to Stay ────────────────────────────────────────────────────────
  const stay = arr<Record<string, unknown>>(it.stay);
  if (stay.length > 0) {
    lines.push("## 🏨 Where to Stay");
    lines.push("");
    for (const s of stay) {
      const name = str(s.name);
      const area = str(s.area);
      const desc = str(s.description);
      lines.push(`**${name}**${area ? ` — ${area}` : ""}`);
      if (desc) lines.push(desc);
      lines.push("");
    }
  }

  // ── Hidden Gems ──────────────────────────────────────────────────────────
  const gems = arr<Record<string, unknown>>(it.hidden_gems);
  if (gems.length > 0) {
    lines.push("## 💎 Hidden Gems");
    lines.push("");
    for (const g of gems) {
      lines.push(`- **${str(g.name)}** — ${str(g.description)}`);
    }
    lines.push("");
  }

  // ── Budget ───────────────────────────────────────────────────────────────
  const budgetObj = obj(it.estimated_budget);
  const budgetKeys = Object.keys(budgetObj);
  if (budgetKeys.length > 0) {
    lines.push("## 💰 Estimated Budget");
    lines.push("");
    for (const key of budgetKeys) {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
      lines.push(`- **${label}:** ${str(budgetObj[key])}`);
    }
    lines.push("");
  }

  // ── Travel Tips ──────────────────────────────────────────────────────────
  const tips = arr<unknown>(it.travel_tips);
  if (tips.length > 0) {
    lines.push("## 💡 Travel Tips");
    lines.push("");
    for (const tip of tips) {
      lines.push(`- ${str(tip)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Top-level helper: given raw streamed text, try to parse it as JSON and
 * return a formatted string. If parsing fails, returns null so the caller
 * can fall back to displaying the raw text (for plain prose responses).
 */
export function formatIfItinerary(raw: string): string | null {
  const parsed = tryParseItinerary(raw);
  if (!parsed) return null;
  return formatItinerary(parsed);
}
