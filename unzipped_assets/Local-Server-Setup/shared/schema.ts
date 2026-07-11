import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  score: integer("score").default(0).notNull(),
  lastAnswer: text("last_answer"),
  isCorrect: boolean("is_correct"),
  responseTime: text("response_time"),
  googleId: text("google_id"),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type QuizState = {
  isAcceptingAnswers: boolean;
  correctAnswer: string | null;
  customChoices: string[] | null;
};

// WebSocket message types
export type WsMessage = 
  | { type: 'STATE_UPDATE'; payload: QuizState }
  | { type: 'STUDENTS_UPDATE'; payload: Student[] }
  | { type: 'STUDENT_RESULT'; payload: { correct: boolean; message: string } }
  | { type: 'KICK_STUDENT'; payload: { studentId: number } }
  | { type: 'KICK_ALL'; payload: {} }
  | { type: 'TEACHER_ALERT'; payload: { message: string } };
