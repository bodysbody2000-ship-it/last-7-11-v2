import fs from "fs";
import path from "path";

const POINTS_FILE = path.resolve("data/permanent_students.json");

export interface PermanentStudent {
  email: string;
  name: string;
  score: number;
  photo?: string;
  consecutiveCorrect: number;
  totalAnswers: number;
  correctAnswersCount: number;
  lastUpdated: string;
}

function ensureDir() {
  const dir = path.dirname(POINTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadPermanentStudents(): PermanentStudent[] {
  try {
    ensureDir();
    if (fs.existsSync(POINTS_FILE)) {
      const raw = fs.readFileSync(POINTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to load permanent students:", e);
  }
  return [];
}

export function savePermanentStudents(students: PermanentStudent[]) {
  try {
    ensureDir();
    fs.writeFileSync(POINTS_FILE, JSON.stringify(students, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save permanent students:", e);
  }
}

export function updatePermanentStudent(
  email: string,
  name: string,
  scoreChange: number,
  photo?: string,
  additionalData?: Partial<Pick<PermanentStudent, "consecutiveCorrect" | "totalAnswers" | "correctAnswersCount">>
): PermanentStudent {
  const list = loadPermanentStudents();
  const index = list.findIndex(s => s.email.toLowerCase() === email.toLowerCase());
  
  let record: PermanentStudent;
  if (index >= 0) {
    record = list[index];
    record.name = name; // Update name to keep it synchronized
    record.score = Math.max(0, record.score + scoreChange);
    if (photo) record.photo = photo;
    if (additionalData) {
      if (additionalData.consecutiveCorrect !== undefined) {
        record.consecutiveCorrect = additionalData.consecutiveCorrect;
      }
      if (additionalData.totalAnswers !== undefined) {
        record.totalAnswers += additionalData.totalAnswers;
      }
      if (additionalData.correctAnswersCount !== undefined) {
        record.correctAnswersCount += additionalData.correctAnswersCount;
      }
    }
    record.lastUpdated = new Date().toISOString();
    list[index] = record;
  } else {
    record = {
      email,
      name,
      score: Math.max(0, scoreChange),
      photo,
      consecutiveCorrect: additionalData?.consecutiveCorrect || 0,
      totalAnswers: additionalData?.totalAnswers || 0,
      correctAnswersCount: additionalData?.correctAnswersCount || 0,
      lastUpdated: new Date().toISOString(),
    };
    list.push(record);
  }
  
  savePermanentStudents(list);
  return record;
}
