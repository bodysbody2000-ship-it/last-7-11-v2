import fs from "fs";
import path from "path";

const COUNTERS_FILE = path.resolve("data/counters.json");

export interface SessionCounters {
  joinCount: number;
  deleteAllCount: number;
  nextQuestionCount: number;
}

function ensureDir() {
  const dir = path.dirname(COUNTERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadCounters(): SessionCounters {
  try {
    ensureDir();
    if (fs.existsSync(COUNTERS_FILE)) {
      const raw = fs.readFileSync(COUNTERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        joinCount: parsed.joinCount ?? 0,
        deleteAllCount: parsed.deleteAllCount ?? 0,
        nextQuestionCount: parsed.nextQuestionCount ?? 0,
      };
    }
  } catch {
    // If file is corrupt or missing, start fresh
  }
  return { joinCount: 0, deleteAllCount: 0, nextQuestionCount: 0 };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveCounters(counters: SessionCounters) {
  // Debounce writes — wait 500ms after last call before writing
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      ensureDir();
      fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save counters:", e);
    }
  }, 500);
}
