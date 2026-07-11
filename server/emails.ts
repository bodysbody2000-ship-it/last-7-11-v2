import fs from "fs";
import path from "path";

const EMAILS_FILE = path.resolve("data/emails.json");

export interface SavedEmail {
  email: string;
  name: string;
  firstSeen: string;
}

function ensureDir() {
  const dir = path.dirname(EMAILS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadEmails(): SavedEmail[] {
  try {
    ensureDir();
    if (fs.existsSync(EMAILS_FILE)) {
      const raw = fs.readFileSync(EMAILS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to empty
  }
  return [];
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveEmails(emails: SavedEmail[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      ensureDir();
      fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save emails:", e);
    }
  }, 300);
}

export function addOrUpdateEmail(email: string, name: string, emails: SavedEmail[]): SavedEmail[] {
  const existing = emails.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return emails;
  }
  return [
    ...emails,
    {
      email,
      name,
      firstSeen: new Date().toISOString(),
    },
  ];
}
