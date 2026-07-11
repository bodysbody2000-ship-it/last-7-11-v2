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
  customChoices: null as string[] | null,
  answerStartTime: 0,
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    perMessageDeflate: false,
    clientTracking: true
  });

  // Broadcast helper
  const broadcast = (message: any) => {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (e) {
          console.error("Broadcast error:", e);
        }
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
    const { answer, customChoices } = req.body;
    quizState.correctAnswer = answer;
    quizState.customChoices = customChoices || null;
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
    quizState.customChoices = null;
    quizState.isAcceptingAnswers = true;
    quizState.answerStartTime = 0;
    broadcastState();
    res.json({ success: true });
  });

  app.post("/api/teacher/reset-points", async (req, res) => {
    await storage.resetAllStudents();
    quizState.correctAnswer = null;
    quizState.customChoices = null;
    quizState.isAcceptingAnswers = true;
    quizState.answerStartTime = 0;
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
    // await storage.resetAllStudents();
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

    const correctMessages = [
      "برافو عليك 👏 دماغك دي محتاجة تتأمن عليها!",
      "إجابة صح 100%… واضح إنك مذاكر مش هزار 😎",
      "عاش يا نجم 🌟 كمل كده!",
      "الله ينور عليك 👌 إجابة مظبوطة!",
      "أنت كده بتجمع درجات مش بتهزر 💪",
      "إيه العظمة دي! صح يا بطل 🏆",
      "دماغ شغالة فل الفل 🔥",
      "حلو الكلام… الإجابة زي الفل!",
      "واضح إنك مركز ومصحي بدري 😄",
      "إجابة تقيلة 👌 ربنا يزيدك",
      "إنت كده داخل المنافسة بقوة 💥",
      "مظبوط يا معلم 👨‍🏫",
      "كده انت فهمان مش حافظ بس 👌",
      "الإجابة صح… وده مش صدفة 😉",
      "عاش التفكير 👏",
      "مستوى عالي النهارده 😎",
      "إيه التركيز ده!",
      "كده أنا أفرح بيك بقى 😄",
      "صح صح صح ✔️",
      "لو كل الإجابات كده… هتخلص المنهج بدري 😁",
      "الله عليك يا وحش 😎",
      "أيوه كده… ده الكلام الكبير!",
      "ده أنت طلعت تقيل أوي 💪",
      "إيه الثبات الانفعالي ده 👏",
      "عاش… كده اللعب على المكشوف!",
      "ده أنت جاي تلعب كبير بقى 🎬",
      "يا سلام على العظمة!",
      "كده انت بتقول أنا هنا أهو 😏",
      "ده شغل عالي أوي",
      "حلو أوي… أنا بحب الثقة دي",
      "ده أنت فاجئتني بصراحة 😄",
      "ياااه… ده انت فاهم اللعبة صح",
      "إحنا كده هنكسب البطولة 🏆",
      "تقفل ملف وتفتح التاني 👌",
      "أنت بتقول للمنهج أنا قدك",
      "ده أنت نجم الشباك النهارده 🌟",
      "كده أنت بتكتب التاريخ",
      "كبير يا كبير",
      "ده لعب عيال بالنسبة لك 😎",
      "أقف احتراما للعب التقيل 👏"
    ];

    const wrongMessages = [
      "لا يا بطل… حاول تاني بس المرة دي شغل دماغك شوية 😅",
      "قريب… بس مش للدرجة دي 😄",
      "الإجابة دي عايزة إعادة نظر 👀",
      "لأ خالص 😂 بس حلو إنك حاولت",
      "شكلك كنت سرحان ثانية كده",
      "لأ… دي محتاجة مراجعة سريعة",
      "إحنا مش بعيدين… بس لسه مجتش",
      "المحاولة جميلة بس الإجابة لأ 😅",
      "ركز بس وهتوصل",
      "لا يا عم مش كده خالص 😄",
      "دي إجابة من كوكب تاني 👽",
      "لأ… بس عندك فرصة تعوض",
      "حاول تفكر فيها تاني بهدوء",
      "الإجابة دي شكلها اتلخبطت منك",
      "كنت ماشي صح… وبعدين لفّيت فجأة 😂",
      "لأ… بس واضح إنك بتجرب",
      "ركز معايا كده شوية",
      "الإجابة دي محتاجة إنعاش",
      "لأ… بس المرة الجاية هتيجي صح",
      "متزعلش… الغلط بيعلّم 😉",
      "إيه يا عم الكلام ده 😅",
      "لا يا نجم… مش كده خالص",
      "أنت كنت داخل بثقة زيادة شوية 😂",
      "إيه التخبيص ده؟",
      "لأ لأ… كده الموضوع خرج عن السيطرة",
      "هو إحنا بنهزر ولا إيه 😄",
      "شكلك سمعت السؤال غلط",
      "دي إجابة محتاجة لجنة تقصي حقائق",
      "مين ضحك عليك وقالك كده؟ 😂",
      "أنت قلبت السيناريو خالص",
      "إيه الجرأة دي بس!",
      "لأ… دي طلعت حركة فيلم هندي",
      "كده إحنا محتاجين نرجع للمذاكرة",
      "أنت روحت بعيد أوي",
      "ده مش التويست اللي كنا مستنينه",
      "لأ يا معلم… رجعنا لنقطة الصفر",
      "كنت ماشي صح… وبوظتها في الآخر 😅",
      "ده مش مشهد النهاية اللي عايزينه",
      "لأ… دي محتاجة إعادة تصوير",
      "استنى بس… نعيد اللقطة تاني 🎬"
    ];

    const { answer } = req.body;
    const studentIdStr = req.params.id;
    if (!studentIdStr) return res.status(400).json({ message: "Student ID required" });
    const studentId = parseInt(studentIdStr as string);
    
    const student = await storage.getStudent(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Calculate final response time based on teacher setting the answer
    const serverEndTime = Date.now();
    const serverDuration = quizState.answerStartTime > 0 
      ? ((serverEndTime - quizState.answerStartTime) / 1000).toFixed(3) 
      : "0.000";
    
    if (!quizState.correctAnswer) {
      // Notify teacher about early attempt
      broadcast({ 
        type: "TEACHER_ALERT", 
        payload: { message: `الطالب ${student.name} حاول الإجابة قبل تحديد الإجابة الصحيحة!` } 
      });
      return res.status(400).json({ message: "WAITING FOR MR AHMED TO SET THE RIGHT ANSWER" });
    }
    
    let isCorrect = answer === quizState.correctAnswer;
    
    // Check if student already has a correct answer for this question
    if (student.isCorrect && student.lastAnswer) {
      return res.status(400).json({ message: "لقد أجبت بشكل صحيح بالفعل على هذا السؤال!" });
    }

    // Check if student already submitted an answer
    if (student.lastAnswer) {
      return res.status(400).json({ message: "لقد قمت بإرسال إجابة بالفعل!" });
    }
    
    if (isCorrect) {
        const students = await storage.getStudents();
        const correctAnswersCount = students.filter(s => s.isCorrect && s.lastAnswer).length;
        const speedBonus = Math.max(1, 10 - correctAnswersCount);
        const points = student.score + speedBonus;
        await storage.updateStudentScore(studentId, points);
    }
    
    await storage.updateStudentAnswer(studentId, answer, isCorrect, serverDuration);
    
    broadcastState();
    
    const messages = isCorrect ? correctMessages : (wrongMessages as string[]);
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    res.json({ 
      success: true, 
      correct: isCorrect,
      message: randomMessage
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
