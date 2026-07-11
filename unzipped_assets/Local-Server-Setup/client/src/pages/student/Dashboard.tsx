import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSocket } from "@/hooks/use-socket";
import { useStudentSubmit } from "@/hooks/use-students";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BigButton } from "@/components/BigButton";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Beaker, Atom, Microscope, Star, Check, X, Clock, Trophy, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function StudentDashboard() {
  useEffect(() => {
    // Hidden style to remove Replit badge
    const style = document.createElement('style');
    style.innerHTML = `
      iframe[src*="replit.com"], 
      .replit-badge, 
      [title="Built with Replit"] { 
        display: none !important; 
        visibility: hidden !important; 
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const [, setLocation] = useLocation();
  const { onMessage } = useSocket();
  const submit = useStudentSubmit();
  const { toast } = useToast();
  
  const [studentId, setStudentId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [customChoices, setCustomChoices] = useState<string[] | null>(null);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [score, setScore] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000) * 1000;
      const refreshInterval = 120000;
      const targetTime = Math.floor(lastRefresh / refreshInterval + 1) * refreshInterval;
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  const resetRefresh = () => {
    // No-op as requested: time should not increase
  };
  const [teacherHasAnswer, setTeacherHasAnswer] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isAccepting && !selectedAnswer && !result) {
      setStartTime(performance.now());
    }
  }, [isAccepting, selectedAnswer, result]);

  // Initialize from local storage
  useEffect(() => {
    const storedId = localStorage.getItem("studentId");
    const storedName = localStorage.getItem("studentName");
    
    if (!storedId || !storedName) {
      setLocation("/student/join");
      return;
    }
    
    setStudentId(storedId);
    setName(storedName);
  }, [setLocation]);

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

  // WebSocket Listeners
  useEffect(() => {
    onMessage("STATE_UPDATE", (state) => {
      setIsAccepting(state.isAcceptingAnswers);
      setTeacherHasAnswer(!!state.correctAnswer);
      setCustomChoices(state.customChoices);
      if (state.correctAnswer && !selectedAnswer && !result) {
        setStartTime(Date.now());
      }
      // Reset local state if quiz resets or new question starts
      if (state.isAcceptingAnswers && !state.correctAnswer) {
        setResult(null);
        setSelectedAnswer(null);
        setShowLeaderboard(false);
      }
    });

    onMessage("KICK_STUDENT", (payload: any) => {
      const myId = localStorage.getItem("studentId");
      if (payload && String(payload.studentId) === myId) {
        localStorage.removeItem("studentId");
        localStorage.removeItem("studentName");
        window.location.href = "/student/join";
      }
    });

    onMessage("KICK_ALL", () => {
      localStorage.removeItem("studentId");
      localStorage.removeItem("studentName");
      window.location.href = "/student/join";
    });

    onMessage("STUDENT_RESULT", (payload) => {
      setResult(payload);
    });

    onMessage("TEACHER_ALERT", (payload: any) => {
      if (payload && payload.message) {
        toast({
          title: "تنبيه من المعلم",
          description: payload.message,
        });
      }
    });

    // We can also listen to general student updates to catch our own score updates
    onMessage("STUDENTS_UPDATE", (students) => {
      const sorted = [...students].sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
      
      const me = students.find(s => String(s.id) === localStorage.getItem("studentId"));
      if (me) {
        setScore(me.score);
        // Show rank if student has answered
        if (me.lastAnswer) {
          setShowLeaderboard(true);
        }
        
        // Also sync result state if we reconnected
        if (me.lastAnswer && me.isCorrect !== null) {
          const randomMessage = me.isCorrect 
            ? correctMessages[Math.floor(Math.random() * correctMessages.length)]
            : wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
            
          setResult({
            correct: me.isCorrect,
            message: randomMessage
          });
          setSelectedAnswer(me.lastAnswer);
        } else if (!me.lastAnswer) {
          setSelectedAnswer(null);
          setResult(null);
        }
      }
    });
  }, [onMessage]);

  const handleAnswer = (answer: string) => {
    resetRefresh();
    if (!isAccepting || result || submit.isPending) return;
    
    if (!teacherHasAnswer) {
      toast({
        variant: "destructive",
        title: "انتظر قليلاً",
        description: "WAITING FOR MR AHMED TO SET THE RIGHT ANSWER",
      });
      return;
    }
    
    setSelectedAnswer(answer);
  };

  const confirmAnswer = () => {
    resetRefresh();
    if (studentId && selectedAnswer) {
      const timeTaken = ((Date.now() - (startTime || Date.now())) / 1000).toFixed(3);
      submit.mutate({ id: parseInt(studentId), answer: selectedAnswer, responseTime: timeTaken });
    }
  };

  if (!name) return null;

  const myRank = leaderboard.findIndex(s => String(s.id) === studentId) + 1;

  const currentChoices = customChoices || ["A", "B", "C", "D"];
  const variants: Record<string, "primary" | "secondary" | "accent" | "destructive" | "outline"> = {
    A: "primary",
    B: "secondary", 
    C: "accent",
    D: "destructive"
  };

  return (
    <div className="min-h-screen flex flex-col p-4 relative overflow-hidden bg-black">
      <AnimatedBackground />

      {/* Header */}
      <header className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/10 mb-6 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <img src="/logo.png" className="w-5 h-5 object-contain" alt="Logo" />
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Hi, Mr.Ahmed's Students</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg">
              <FlaskConical className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg hidden sm:block text-white">{name}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* 
          <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg border border-white/5 text-[10px] text-white/50 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>Auto-refresh: {timeLeft}s</span>
          </div>
          */}
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-yellow-400 font-bold">
            <FlaskConical className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span>{score} pts</span>
          </div>
          {myRank > 0 && (
            <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-xl border border-primary/30 text-primary font-bold">
              <Atom className="w-5 h-5" />
              <span>Rank #{myRank}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full z-10">
        
        {/* Status Message */}
        <div className="mb-8 w-full text-center min-h-[80px]">
          <AnimatePresence mode="wait">
            {!isAccepting && !result && !selectedAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-black/80 backdrop-blur-md text-white px-8 py-4 rounded-2xl inline-flex items-center gap-3 shadow-xl"
              >
                <Clock className="w-6 h-6 animate-pulse text-yellow-400" />
                <span className="text-xl font-bold">Waiting for teacher...</span>
              </motion.div>
            )}

            {isAccepting && !result && !selectedAnswer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-display font-medium text-primary/80 animate-pulse text-center max-w-xs"
              >
                {!teacherHasAnswer ? "WAITING FOR MR AHMED TO SET THE RIGHT ANSWER" : "Choose an Answer!"}
              </motion.div>
            )}

            {result && (
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  className={cn(
                    "px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 border-4",
                    result.correct 
                      ? "bg-green-100 border-green-400 text-green-700" 
                      : "bg-red-100 border-red-400 text-red-700"
                  )}
                >
                  {result.correct ? (
                    <Check className="w-16 h-16" />
                  ) : (
                    <X className="w-16 h-16" />
                  )}
                  <span className="text-3xl font-bold font-display">{result.message}</span>
                </motion.div>

                {showLeaderboard && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 w-full shadow-2xl"
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                      <h3 className="text-white text-xl font-bold">Class Leaderboard</h3>
                    </div>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {leaderboard.slice(0, 5).map((student, idx) => (
                        <div 
                          key={student.id} 
                          className={cn(
                            "flex justify-between items-center p-3 rounded-xl transition-all",
                            String(student.id) === studentId 
                              ? "bg-primary/20 text-white font-bold border border-primary/30 ring-2 ring-primary/20" 
                              : "bg-white/5 text-white/70"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-[10px] opacity-70">#{idx + 1}</span>
                            <span>{student.name}</span>
                          </div>
                          <span className="font-mono text-primary">{student.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
          {currentChoices.map((opt) => {
            const isSelected = selectedAnswer === opt;
            const isDisabled = !isAccepting || (!!result && !isSelected);
            const variant = variants[opt] || "outline";

            return (
              <BigButton
                key={opt}
                label={opt}
                variant={variant as any}
                size="xl"
                disabled={isDisabled}
                onClick={() => handleAnswer(opt)}
                className={cn(
                  "h-24 sm:h-32 text-3xl sm:text-5xl transition-all duration-300 w-full rounded-[2.5rem]",
                  isSelected && "ring-8 ring-white ring-offset-4 ring-offset-primary/20 scale-[1.05] z-20 shadow-2xl",
                  isDisabled && !isSelected && "opacity-30 scale-95 grayscale",
                  isDisabled && isSelected && "opacity-100 grayscale-0"
                )}
              />
            );
          })}
        </div>

        {/* Submit Button */}
        <AnimatePresence>
          {selectedAnswer && !result && isAccepting && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={confirmAnswer}
              disabled={submit.isPending}
              className="w-full max-w-sm py-4 bg-black text-white rounded-2xl font-bold text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {submit.isPending ? "Sending..." : "Check your answer"} 
              <Check className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
