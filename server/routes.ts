import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { loadCounters, saveCounters } from "./counters";
import { loadEmails, saveEmails, addOrUpdateEmail, type SavedEmail } from "./emails";
import { loadPermanentStudents } from "./permanent_points";

const TEACHER_PASSWORD = "246802";

// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const CALLBACK_URL = (() => {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  if (process.env.REPLIT_DOMAINS) return `https://${process.env.REPLIT_DOMAINS}/auth/google/callback`;
  if (process.env.NODE_ENV === "production") return "https://ahmedlivequiz.up.railway.app/auth/google/callback";
  return "http://localhost:5000/auth/google/callback";
})();

console.log("[Google OAuth] Callback URL:", CALLBACK_URL);

// Configure Passport
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Create or find student by Google email
      const email = profile.emails?.[0]?.value || "";
      let student = email ? await storage.getStudentByEmail?.(email) : undefined;
      const studentName = profile.displayName || profile.name?.givenName || email;
      const googlePhoto = profile.photos?.[0]?.value || null;

      if (!student) {
        // Create new student
        student = await storage.createStudent({
          name: studentName,
          ...(email ? { email } : {}),
        });
      }

      // Save Google profile photo to storage
      if (googlePhoto) {
        await storage.setStudentPhoto(student.id, googlePhoto);
      }

      // Attach googlePhoto to user object so the callback can use it
      (student as any).googlePhoto = googlePhoto;

      // Persist email to file so it survives server restarts
      if (email) {
        savedEmails = addOrUpdateEmail(email, studentName, savedEmails);
        saveEmails(savedEmails);
      }
      
      return done(null, student);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const student = await storage.getStudent(id);
      done(null, student);
    } catch (err) {
      done(err);
    }
  });
}

// Global Quiz State
let quizState = {
  isAcceptingAnswers: true,
  correctAnswer: null as string | null,
  customChoices: null as string[] | null,
  answerStartTime: 0,
  showAccuracy: true,
};

// Session Counters — loaded from disk so they survive server restarts
let sessionCounters = loadCounters();
let savedEmails: SavedEmail[] = loadEmails();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Polling Alerts State
  const pendingAlerts: { id: number; type: string; payload: any; timestamp: number }[] = [];
  let alertIdCounter = 1;

  const addAlert = (type: string, payload: any) => {
    pendingAlerts.push({
      id: alertIdCounter++,
      type,
      payload,
      timestamp: Date.now()
    });
    // Keep only the last 50 alerts to prevent memory growth
    if (pendingAlerts.length > 50) {
      pendingAlerts.shift();
    }
  };

  // Broadcast helper - now stores messages as alerts for polling clients
  const broadcast = (message: any) => {
    if (message && message.type) {
      addAlert(message.type, message.payload || {});
    }
  };

  // Broadcast helper for state - simple trigger/no-op since clients poll state directly
  const broadcastState = async () => {
    // In polling mode, state is retrieved directly on poll request,
    // so broadcastState is just a signal or no-op.
  };

  // State polling endpoint
  app.get("/api/state", async (req, res) => {
    const { answerStartTime, ...publicState } = quizState;
    const students = await storage.getStudents();
    res.json({
      state: publicState,
      students: students,
      counters: sessionCounters,
      alerts: pendingAlerts,
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
    sessionCounters.nextQuestionCount++;
    saveCounters(sessionCounters);
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

  app.post("/api/teacher/toggle-accuracy", (req, res) => {
    const { show } = req.body;
    quizState.showAccuracy = typeof show === "boolean" ? show : !quizState.showAccuracy;
    broadcastState();
    res.json({ success: true, showAccuracy: quizState.showAccuracy });
  });

  app.delete("/api/students/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const student = await storage.getStudent(id);
    if (student) {
      await storage.updateStudentScore(id, 0, true);
    }
    await storage.deleteStudent(id);
    
    // Notify the specific student to logout/kick
    broadcast({ type: "KICK_STUDENT", payload: { studentId: id } });

    broadcastState();
    res.json({ success: true });
  });

  app.delete("/api/students", async (req, res) => {
    // Reset all scores before deleting
    // await storage.resetAllStudents();
    await storage.deleteAllStudents();
    sessionCounters.deleteAllCount++;
    saveCounters(sessionCounters);
    
    // Notify all students to logout/kick
    broadcast({ type: "KICK_ALL", payload: {} });

    broadcastState();
    res.json({ success: true });
  });

  app.post("/api/students/:id/photo", async (req, res) => {
    const id = parseInt(req.params.id);
    const { photo } = req.body;
    if (!photo || typeof photo !== "string") {
      return res.status(400).json({ message: "Photo required" });
    }
    await storage.setStudentPhoto(id, photo);
    broadcast({ type: "PHOTO_ADDED", payload: { studentId: id, photo } });
    res.json({ success: true });
  });

  app.get("/api/photos", async (req, res) => {
    const photos = await storage.getAllPhotos();
    res.json(photos);
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
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "الاسم مطلوب وصالح" });
      }
      const students = await storage.getStudents();
      const existing = students.find(s => s.name.toLowerCase() === name.toLowerCase());
      
      if (existing) {
        return res.status(200).json(existing);
      }

      const student = await storage.createStudent(req.body);
      sessionCounters.joinCount++;
      saveCounters(sessionCounters);
      broadcastState();
      res.status(201).json(student);
    } catch (e: any) {
      console.error("Error in student join:", e);
      res.status(400).json({ message: e instanceof Error ? e.message : "تعذر الانضمام (خطأ داخلي)" });
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

    const { answer, isRetry } = req.body;
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
    
    // Check if student already has a correct answer for this question (unless retrying)
    if (!isRetry && student.isCorrect && student.lastAnswer) {
      return res.status(400).json({ message: "لقد أجبت بشكل صحيح بالفعل على هذا السؤال!" });
    }

    // Check if student already submitted an answer (unless retrying)
    if (!isRetry && student.lastAnswer) {
      return res.status(400).json({ message: "لقد قمت بإرسال إجابة بالفعل!" });
    }
    
    let pointsChange = 0;
    let doublePoints = false;

    if (isCorrect) {
        if (isRetry) {
            pointsChange = 3;
        } else {
            const students = await storage.getStudents();
            const correctAnswersCount = students.filter(s => s.isCorrect && s.lastAnswer).length;
            pointsChange = Math.max(1, 10 - correctAnswersCount);
        }
    } else {
        if (isRetry) {
            pointsChange = -5;
        } else {
            pointsChange = 0;
        }
    }
    
    let newScore = student.score + pointsChange;
    let newConsecutive = isCorrect ? student.consecutiveCorrect + 1 : 0;

    // Every 4th consecutive correct answer = double points, then streak resets to 0
    if (isCorrect && newConsecutive === 4) {
        pointsChange = pointsChange * 2;
        newScore = student.score + pointsChange;
        doublePoints = true;
        newConsecutive = 0; // reset after double so next cycle starts fresh
    }

    await storage.updateStudentScore(studentId, newScore);
    await storage.updateStudentAnswerWithStreak(studentId, answer, isCorrect, serverDuration, isRetry, newConsecutive);
    
    broadcastState();
    
    const messages = isCorrect ? correctMessages : (wrongMessages as string[]);
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    res.json({ 
      success: true, 
      correct: isCorrect,
      message: randomMessage,
      doublePoints,
      newScore
    });
  });

  app.get(api.students.list.path, async (req, res) => {
    const students = await storage.getStudents();
    res.json(students);
  });

  // All-time saved emails (persisted across server restarts)
  app.get("/api/emails", (_req, res) => {
    res.json(savedEmails);
  });

  // All-time Leaderboard and Points
  app.get("/api/leaderboard", (_req, res) => {
    const list = loadPermanentStudents();
    const sorted = list.sort((a, b) => b.score - a.score);
    res.json(sorted);
  });

  // Google OAuth Routes
  app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/student/join" }),
    (req, res) => {
      const student = (req.user as any);
      if (student) {
        // Broadcast photo to teacher dashboard
        if (student.googlePhoto) {
          broadcast({ type: "PHOTO_ADDED", payload: { studentId: student.id, photo: student.googlePhoto } });
        }
        const photoUrl = student.googlePhoto ? `&photo=${encodeURIComponent(student.googlePhoto)}` : "";
        res.redirect(`/student/join?id=${student.id}&name=${encodeURIComponent(student.name)}${photoUrl}`);
      } else {
        res.redirect("/student/join");
      }
    }
  );

  app.get("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ message: "Logout failed" });
      } else {
        res.redirect("/");
      }
    });
  });

  // No longer seeding demo data to ensure a fresh session for the teacher
  storage.deleteAllStudents().then(() => {
    console.log("Cleared all students for fresh session");
  });

  // Health check for deployment
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
