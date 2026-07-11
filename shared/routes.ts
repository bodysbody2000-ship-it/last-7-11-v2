import { z } from "zod";
import { insertStudentSchema, students } from "./schema";

export const api = {
  teacher: {
    login: {
      method: "POST" as const,
      path: "/api/teacher/login",
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: z.object({ message: z.string() }),
      },
    },
    setAnswer: {
      method: "POST" as const,
      path: "/api/teacher/answer",
      input: z.object({ answer: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    toggleAccepting: {
      method: "POST" as const,
      path: "/api/teacher/toggle",
      input: z.object({ accepting: z.boolean() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    reset: {
      method: "POST" as const,
      path: "/api/teacher/reset",
      input: z.object({}),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  students: {
    join: {
      method: "POST" as const,
      path: "/api/students",
      input: insertStudentSchema,
      responses: {
        201: z.custom<typeof students.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    submit: {
      method: "POST" as const,
      path: "/api/students/:id/answer",
      input: z.object({ answer: z.string() }),
      responses: {
        200: z.object({ success: z.boolean(), correct: z.boolean().optional() }),
        404: z.object({ message: z.string() }),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/students",
      responses: {
        200: z.array(z.custom<typeof students.$inferSelect>()),
      },
    },
  },
};
