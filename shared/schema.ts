import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  score: integer("score").default(0).notNull(),
  lastAnswer: text("last_answer"),
  isCorrect: boolean("is_correct"),
  responseTime: text("response_time"),
  googleId: text("google_id"),
  consecutiveCorrect: integer("consecutive_correct").default(0).notNull(),
  totalAnswers: integer("total_answers").default(0).notNull(),
  correctAnswersCount: integer("correct_answers_count").default(0).notNull(),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
}).extend({
  email: z.string().email().optional(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type QuizState = {
  isAcceptingAnswers: boolean;
  correctAnswer: string | null;
  customChoices: string[] | null;
  showAccuracy: boolean;
};

// WebSocket message types
export type WsMessage = 
  | { type: 'STATE_UPDATE'; payload: QuizState }
  | { type: 'STUDENTS_UPDATE'; payload: Student[] }
  | { type: 'STUDENT_RESULT'; payload: { correct: boolean; message: string } }
  | { type: 'KICK_STUDENT'; payload: { studentId: number } }
  | { type: 'KICK_ALL'; payload: {} }
  | { type: 'TEACHER_ALERT'; payload: { message: string } }
  | { type: 'PHOTO_ADDED'; payload: { studentId: number; photo: string } }
  | { type: 'COUNTERS_UPDATE'; payload: Record<string, number> };
