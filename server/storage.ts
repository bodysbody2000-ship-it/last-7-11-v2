import { students, type Student, type InsertStudent } from "@shared/schema";
import { updatePermanentStudent, loadPermanentStudents } from "./permanent_points";
import fs from "fs";
import path from "path";

const STUDENTS_FILE = path.resolve("data/students.json");
const PHOTOS_FILE = path.resolve("data/photos.json");

function ensureDir() {
  const dir = path.dirname(STUDENTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export interface IStorage {
  createStudent(student: InsertStudent): Promise<Student>;
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByEmail?(email: string): Promise<Student | undefined>;
  updateStudentScore(id: number, score: number, skipPermanentSync?: boolean): Promise<Student>;
  updateStudentAnswer(id: number, answer: string, isCorrect: boolean, responseTime?: string, isRetry?: boolean): Promise<Student>;
  updateStudentAnswerWithStreak(id: number, answer: string, isCorrect: boolean, responseTime?: string, isRetry?: boolean, newConsecutive?: number): Promise<Student>;
  resetAllStudents(): Promise<void>;
  clearAnswersOnly(): Promise<void>;
  deleteStudent(id: number): Promise<void>;
  deleteAllStudents(): Promise<void>;
  setStudentPhoto(id: number, photo: string): Promise<void>;
  getStudentPhoto(id: number): Promise<string | undefined>;
  getAllPhotos(): Promise<Record<number, string>>;
}

export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private photos: Map<number, string>;
  private currentId: number;

  constructor() {
    this.students = new Map();
    this.photos = new Map();
    this.currentId = 1;
    this.loadFromFiles();
  }

  private loadFromFiles() {
    try {
      ensureDir();
      if (fs.existsSync(STUDENTS_FILE)) {
        const raw = fs.readFileSync(STUDENTS_FILE, "utf-8");
        const list: Student[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          let maxId = 0;
          for (const s of list) {
            this.students.set(s.id, s);
            if (s.id > maxId) maxId = s.id;
          }
          this.currentId = maxId + 1;
        }
      }
      if (fs.existsSync(PHOTOS_FILE)) {
        const raw = fs.readFileSync(PHOTOS_FILE, "utf-8");
        const obj: Record<string, string> = JSON.parse(raw);
        for (const [idStr, photo] of Object.entries(obj)) {
          const id = parseInt(idStr, 10);
          if (!isNaN(id)) {
            this.photos.set(id, photo);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load active session data from JSON:", e);
    }
  }

  private saveToFiles() {
    try {
      ensureDir();
      const studentsList = Array.from(this.students.values());
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(studentsList, null, 2), "utf-8");
      
      const photosObj: Record<number, string> = {};
      for (const [id, photo] of this.photos.entries()) {
        photosObj[id] = photo;
      }
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photosObj, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save active session data to JSON:", e);
    }
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentId++;
    
    let initialConsecutive = 0;
    let initialTotal = 0;
    let initialCorrect = 0;
    
    if (insertStudent.email) {
      // Check if they already have permanent stats to sync down to current active session
      const permRecord = loadPermanentStudents().find(p => p.email.toLowerCase() === insertStudent.email!.toLowerCase());
      if (permRecord) {
        initialConsecutive = permRecord.consecutiveCorrect;
        initialTotal = permRecord.totalAnswers;
        initialCorrect = permRecord.correctAnswersCount;
      } else {
        // Create initial permanent points record
        updatePermanentStudent(insertStudent.email, insertStudent.name ?? "", 0, undefined, {
          consecutiveCorrect: 0,
          totalAnswers: 0,
          correctAnswersCount: 0,
        });
      }
    }

    const anyStudent = insertStudent as any;
    const student: Student = { 
      ...insertStudent, 
      id, 
      email: insertStudent.email ?? null,
      score: anyStudent.score ?? 0,
      lastAnswer: anyStudent.lastAnswer ?? null,
      isCorrect: anyStudent.isCorrect ?? null,
      responseTime: anyStudent.responseTime ?? null,
      name: insertStudent.name ?? "",
      googleId: null,
      consecutiveCorrect: initialConsecutive,
      totalAnswers: initialTotal,
      correctAnswersCount: initialCorrect,
    };
    this.students.set(id, student);
    this.saveToFiles();
    return student;
  }

  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values()).sort((a, b) => a.id - b.id);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(s => s.email?.toLowerCase() === email.toLowerCase());
  }

  async updateStudentScore(id: number, score: number, skipPermanentSync: boolean = false): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    
    const diff = score - student.score;
    const updated = { ...student, score };
    this.students.set(id, updated);
    this.saveToFiles();
    
    if (student.email && !skipPermanentSync) {
      updatePermanentStudent(student.email, student.name, diff, undefined, {
        consecutiveCorrect: student.consecutiveCorrect,
        totalAnswers: 0,
        correctAnswersCount: 0,
      });
    }
    
    return updated;
  }

  async updateStudentAnswer(id: number, answer: string, isCorrect: boolean, responseTime?: string, isRetry?: boolean): Promise<Student> {
    return this.updateStudentAnswerWithStreak(id, answer, isCorrect, responseTime, isRetry);
  }

  async updateStudentAnswerWithStreak(id: number, answer: string, isCorrect: boolean, responseTime?: string, isRetry?: boolean, newConsecutive?: number): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    
    const consecutive = newConsecutive !== undefined
      ? newConsecutive
      : (isCorrect ? student.consecutiveCorrect + 1 : 0);

    const newTotal = isRetry ? student.totalAnswers : student.totalAnswers + 1;
    const newCorrectCount = isCorrect
      ? student.correctAnswersCount + 1
      : student.correctAnswersCount;

    const updated = { 
      ...student, 
      lastAnswer: answer, 
      isCorrect, 
      responseTime: responseTime || null,
      consecutiveCorrect: consecutive,
      totalAnswers: newTotal,
      correctAnswersCount: newCorrectCount,
    };
    this.students.set(id, updated);
    this.saveToFiles();
    
    if (student.email) {
      updatePermanentStudent(student.email, student.name, 0, undefined, {
        consecutiveCorrect: consecutive,
        totalAnswers: isRetry ? 0 : 1,
        correctAnswersCount: isCorrect && !isRetry ? 1 : 0,
      });
    }
    
    return updated;
  }

  async resetAllStudents(): Promise<void> {
    for (const [id, student] of this.students.entries()) {
      this.students.set(id, { 
        ...student, 
        score: 0, 
        lastAnswer: null, 
        isCorrect: null,
        responseTime: null,
        consecutiveCorrect: 0,
        totalAnswers: 0,
        correctAnswersCount: 0,
      });
    }
    this.saveToFiles();
  }

  async clearAnswersOnly(): Promise<void> {
    for (const [id, student] of this.students.entries()) {
      this.students.set(id, { 
        ...student, 
        lastAnswer: null, 
        isCorrect: null,
        responseTime: null,
        // consecutiveCorrect is NOT reset here — streak persists across questions
      });
    }
    this.saveToFiles();
  }

  async deleteStudent(id: number): Promise<void> {
    this.students.delete(id);
    this.saveToFiles();
  }

  async deleteAllStudents(): Promise<void> {
    this.students.clear();
    this.photos.clear();
    this.saveToFiles();
  }

  async setStudentPhoto(id: number, photo: string): Promise<void> {
    this.photos.set(id, photo);
    this.saveToFiles();
  }

  async getStudentPhoto(id: number): Promise<string | undefined> {
    return this.photos.get(id);
  }

  async getAllPhotos(): Promise<Record<number, string>> {
    const result: Record<number, string> = {};
    for (const [id, photo] of this.photos.entries()) {
      result[id] = photo;
    }
    return result;
  }
}

export const storage = new MemStorage();
