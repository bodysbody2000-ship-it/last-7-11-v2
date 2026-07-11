import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const TEACHER_PASSWORD = "246802";

  // Global Quiz State
  let quizState = {
    isAcceptingAnswers: true,
    correctAnswer: null as string | null,
    answerStartTime: 0,
  };

  export async function registerRoutes(
    httpServer: Server,
    app: Express
  ): Promise<Server> {
    const wss = new WebSocketServer({ 
      server: httpServer, 
      path: "/ws",
      perMessageDeflate: false // Better performance for many small messages
    });

  // Broadcast helper
  const broadcast = (message: any) => {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  // Broadcast helper for state
  const broadcastState = async () => {
    broadcast({ type: "STATE_UPDATE", payload: quizState });
    const students = await storage.getStudents();
    broadcast({ type: "STUDENTS_UPDATE", payload: students });
  };

  wss.on("connection", (ws) => {
    // Send initial state on connection
    ws.send(JSON.stringify({ type: "STATE_UPDATE", payload: quizState }));
    storage.getStudents().then((students) => {
      ws.send(JSON.stringify({ type: "STUDENTS_UPDATE", payload: students }));
    });
  });

  // Teacher APIs
  app.post(api.teacher.login.path, (req, res) => {
    const { password } = req.body;
    if (password === TEACHER_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  });

  app.post(api.teacher.setAnswer.path, async (req, res) => {
    const { answer } = req.body;
    quizState.correctAnswer = answer;
    quizState.answerStartTime = Date.now();
    
    // Grade existing answers
    const students = await storage.getStudents();
    for (const student of students) {
      if (student.lastAnswer) {
        const isCorrect = student.lastAnswer === answer;
        const newScore = isCorrect ? student.score + 10 : student.score; 
        
        // Update DB
        if (isCorrect !== student.isCorrect) {
             await storage.updateStudentAnswer(student.id, student.lastAnswer, isCorrect);
             if (isCorrect) {
                 await storage.updateStudentScore(student.id, newScore);
             }
        }
      }
    }
    
    broadcastState();
    res.json({ success: true });
  });

  app.post(api.teacher.toggleAccepting.path, (req, res) => {
    const { accepting } = req.body;
    quizState.isAcceptingAnswers = accepting;
    broadcastState();
    res.json({ success: true });
  });

  app.post("/api/teacher/reset", async (req, res) => {
    // Reset student answers but keep scores
    await storage.clearAnswersOnly(); // This clears only lastAnswer and isCorrect
    quizState.correctAnswer = null;
    quizState.isAcceptingAnswers = true;
    broadcastState();
    res.json({ success: true });
  });

  app.post("/api/teacher/reset-points", async (req, res) => {
    await storage.resetAllStudents();
    quizState.correctAnswer = null;
    quizState.isAcceptingAnswers = true;
    broadcastState();
    res.json({ success: true });
  });

  app.delete("/api/students/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const student = await storage.getStudent(id);
    if (student) {
      await storage.updateStudentScore(id, 0);
    }
    await storage.deleteStudent(id);
    
    // Notify the specific student to logout/kick
    const kickMessage = JSON.stringify({ type: "KICK_STUDENT", payload: { studentId: id } });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(kickMessage);
      }
    });

    broadcastState();
    res.json({ success: true });
  });

  app.delete("/api/students", async (req, res) => {
    // Reset all scores before deleting
    await storage.resetAllStudents();
    await storage.deleteAllStudents();
    
    // Notify all students to logout/kick
    const kickAllMessage = JSON.stringify({ type: "KICK_ALL", payload: {} });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(kickAllMessage);
      }
    });

    broadcastState();
    res.json({ success: true });
  });

    app.post("/api/students/:id/points", async (req, res) => {
      const id = parseInt(req.params.id);
      const { points } = req.body;
      const student = await storage.getStudent(id);
      if (!student) return res.status(404).json({ message: "Student not found" });
      
      const newScore = student.score + (parseInt(points) || 0);
      await storage.updateStudentScore(id, newScore);
      broadcastState();
      res.json({ success: true, newScore });
    });

  // Student APIs
  app.post(api.students.join.path, async (req, res) => {
    try {
      const { name } = req.body;
      const students = await storage.getStudents();
      const existing = students.find(s => s.name.toLowerCase() === name.toLowerCase());
      
      if (existing) {
        return res.status(200).json(existing);
      }

      const student = await storage.createStudent(req.body);
      broadcastState();
      res.status(201).json(student);
    } catch (e) {
      res.status(400).json({ message: "Could not join" });
    }
  });

  app.post(api.students.submit.path, async (req, res) => {
    if (!quizState.isAcceptingAnswers) {
      return res.status(400).json({ message: "Not accepting answers" });
    }

    const wrongAnswerMessages = [
      "إنت جاي تهزر",
      "لا يا حبيبي… كده لأ",
      "إجابة تحزن والله",
      "راجع نفسك كده وبعدين تعالى",
      "الإجابة دي مش في الكتالوج",
      "حاول مرة تانية قبل ما أزعل",
      "اللي إنت كاتبه ده خطر على التعليم",
      "لا تعليق بصراحة",
      "الإجابة دي تايهة خالص",
      "هو السؤال زعّلك"
    ];

    const { answer } = req.body;
    const responseTime = (req.body.responseTime as string | string[]) || "0.000";
    const finalResponseTime = Array.isArray(responseTime) ? responseTime[0] : responseTime;
    const studentIdStr = req.params.id;
    if (!studentIdStr) return res.status(400).json({ message: "Student ID required" });
    const studentId = parseInt(studentIdStr);
    
    // Calculate final response time based on teacher setting the answer
    const serverEndTime = Date.now();
    const serverDuration = quizState.answerStartTime > 0 
      ? ((serverEndTime - quizState.answerStartTime) / 1000).toFixed(3) 
      : "0.000";
    
    if (!quizState.correctAnswer) {
      // Notify teacher about early attempt
      const student = await storage.getStudent(studentId);
      broadcast({ 
        type: "TEACHER_ALERT", 
        payload: { message: `الطالب ${student?.name || "مجهول"} حاول الإجابة قبل تحديد الإجابة الصحيحة!` } 
      });
      return res.status(400).json({ message: "WAITING FOR MR AHMED TO SET THE RIGHT ANSWER" });
    }
    
    let isCorrect = false;
    // Grade immediately if answer is set
    if (quizState.correctAnswer) {
      isCorrect = answer === quizState.correctAnswer;
    }
    
    // Update storage
    const student = await storage.getStudent(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // If answer is already known and correct, calculate rank-based score
    if (quizState.correctAnswer && isCorrect) {
        const students = await storage.getStudents();
        const correctAnswersCount = students.filter(s => s.isCorrect && s.lastAnswer).length;
        const speedBonus = Math.max(1, 10 - correctAnswersCount);
        const points = student.score + speedBonus;
        await storage.updateStudentScore(studentId, points);
    }
    
    await storage.updateStudentAnswer(studentId, answer, isCorrect, serverDuration);
    
    broadcastState();
    
    const randomWrongMessage = wrongAnswerMessages[Math.floor(Math.random() * wrongAnswerMessages.length)];
    res.json({ 
      success: true, 
      correct: isCorrect,
      message: isCorrect ? "إجابة صحيحة! أحسنت" : randomWrongMessage
    });
  });

  app.get(api.students.list.path, async (req, res) => {
    const students = await storage.getStudents();
    res.json(students);
  });

  // Seed data if empty
  storage.getStudents().then(async (students) => {
    if (students.length === 0) {
      await storage.createStudent({ name: "Demo Student 1" });
      await storage.createStudent({ name: "Demo Student 2" });
    }
  });

  return httpServer;
}
