import { students, type Student, type InsertStudent } from "@shared/schema";

export interface IStorage {
  createStudent(student: InsertStudent): Promise<Student>;
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  updateStudentScore(id: number, score: number): Promise<Student>;
  updateStudentAnswer(id: number, answer: string, isCorrect: boolean, responseTime?: string): Promise<Student>;
  resetAllStudents(): Promise<void>;
  clearAnswersOnly(): Promise<void>;
  deleteStudent(id: number): Promise<void>;
  deleteAllStudents(): Promise<void>;
}

export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private currentId: number;

  constructor() {
    this.students = new Map();
    this.currentId = 1;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentId++;
    const student: Student = { 
      ...insertStudent, 
      id, 
      score: insertStudent.score ?? 0,
      lastAnswer: insertStudent.lastAnswer ?? null,
      isCorrect: insertStudent.isCorrect ?? null,
      responseTime: insertStudent.responseTime ?? null,
      name: insertStudent.name ?? ""
    };
    this.students.set(id, student);
    return student;
  }

  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values()).sort((a, b) => a.id - b.id);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async updateStudentScore(id: number, score: number): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    const updated = { ...student, score };
    this.students.set(id, updated);
    return updated;
  }

  async updateStudentAnswer(id: number, answer: string, isCorrect: boolean, responseTime?: string): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    const updated = { ...student, lastAnswer: answer, isCorrect, responseTime: responseTime || null };
    this.students.set(id, updated);
    return updated;
  }

  async resetAllStudents(): Promise<void> {
    for (const [id, student] of this.students.entries()) {
      this.students.set(id, { 
        ...student, 
        score: 0, 
        lastAnswer: null, 
        isCorrect: null,
        responseTime: null 
      });
    }
  }

  async clearAnswersOnly(): Promise<void> {
    for (const [id, student] of this.students.entries()) {
      this.students.set(id, { 
        ...student, 
        lastAnswer: null, 
        isCorrect: null,
        responseTime: null 
      });
    }
  }

  async deleteStudent(id: number): Promise<void> {
    this.students.delete(id);
  }

  async deleteAllStudents(): Promise<void> {
    this.students.clear();
  }
}

export const storage = new MemStorage();
