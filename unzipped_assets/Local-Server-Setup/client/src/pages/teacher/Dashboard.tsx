import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useTeacherActions } from "@/hooks/use-teacher";
import { useStudentsList } from "@/hooks/use-students";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BigButton } from "@/components/BigButton";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Beaker, Microscope, Atom, Plus, Copy, LogOut, Trophy, Users, RefreshCw, Play, Pause, Trash2, CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Student } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
  const { socket, onMessage } = useSocket();
  const { setAnswer, toggleAccepting, reset } = useTeacherActions();
  const { data: initialStudents, refetch } = useStudentsList();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [customChoices, setCustomChoices] = useState<string[] | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [pointAdjustValue, setPointAdjustValue] = useState<string>("0");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
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

  const handlePointAdjustment = async () => {
    if (selectedStudentId === null) return;
    try {
      await apiRequest("POST", `/api/students/${selectedStudentId}/points`, { points: pointAdjustValue });
      toast({ title: "تم التحديث", description: "تم تعديل النقاط بنجاح" });
      setPointAdjustValue("0");
      setSelectedStudentId(null);
    } catch (err) {
      toast({ title: "خطأ", description: "فشل تعديل النقاط", variant: "destructive" });
    }
  };

  const copyResults = () => {
    const text = students
      .sort((a, b) => b.score - a.score)
      .map((s) => `${s.name} : ${s.score}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ!",
      description: "تم نسخ نتائج الطلاب بنجاح",
    });
  };

  const [showEndReport, setShowEndReport] = useState(false);

  const endSession = async () => {
    // Show report first
    setShowEndReport(true);
  };

  const confirmEndSession = async () => {
    resetRefresh();
    // Clear all answers first to reset state
    await apiRequest("POST", "/api/teacher/reset");
    // Delete all students from DB
    await apiRequest("DELETE", "/api/students");
    
    toast({
      title: "تم إنهاء الحصة",
      description: "تم إخراج جميع الطلاب ومسح البيانات بنجاح",
    });
    setShowEndReport(false);
    refetch();
  };

  // Sync initial data
  useEffect(() => {
    if (initialStudents) {
      setStudents(initialStudents);
    }
  }, [initialStudents]);

  // WebSocket listeners
  useEffect(() => {
    onMessage("STUDENTS_UPDATE", (updatedStudents) => {
      setStudents(updatedStudents);
    });

    onMessage("STATE_UPDATE", (state) => {
      setIsAccepting(state.isAcceptingAnswers);
      setCorrectAnswer(state.correctAnswer);
      setCustomChoices(state.customChoices);
    });
  }, [onMessage]);

  const handleSetCustomChoices = () => {
    const choices = customInput.split(",").map(c => c.trim()).filter(c => c.length > 0);
    if (choices.length < 2) {
      toast({ title: "خطأ", description: "يرجى إدخال خيارين على الأقل مفصولين بفاصلة", variant: "destructive" });
      return;
    }
    apiRequest("POST", "/api/teacher/answer", { answer: null, customChoices: choices });
    setCustomInput("");
  };

  const currentChoices = customChoices || ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Control Panel */}
        <header className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col md:flex-row gap-6 items-center justify-between sticky top-4 z-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Chemistry Lab: Mr. Ahmed</h1>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("w-2 h-2 rounded-full", isAccepting ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                  {isAccepting ? "LIVE: Accepting Answers" : "PAUSED: Submissions Closed"}
                </div>
                <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded border border-white/5 text-[10px] text-white/40 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  <span>Refresh in: {timeLeft}s</span>
                </div>
              </div>
            </div>
          </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={copyResults}
                className="px-6 py-3 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 border-b-4 border-zinc-950 flex items-center gap-2 transition-all shadow-md active:translate-y-0.5"
              >
                <Copy className="w-5 h-5" />
                نسخ النتائج
              </button>
              <button
                onClick={() => toggleAccepting.mutate(!isAccepting)}
                disabled={toggleAccepting.isPending}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:translate-y-0.5",
                  isAccepting 
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-b-4 border-amber-200" 
                    : "bg-green-100 text-green-700 hover:bg-green-200 border-b-4 border-green-200"
                )}
              >
                {isAccepting ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isAccepting ? "Start Quiz" : "Stop Quiz"}
              </button>
            
            <button
              onClick={() => {
                if(confirm("هل أنت متأكد؟ سيتم حذف جميع النقاط لكل الطلاب.")) reset.mutate();
              }}
              disabled={reset.isPending}
              className="px-6 py-3 rounded-xl font-bold bg-white text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all border-2 border-transparent hover:border-red-100 flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              تصفير كل النقاط
            </button>
            
            <button
              onClick={() => {
                // New logic: call reset for next question
                apiRequest("POST", "/api/teacher/reset")
                  .then(() => {
                    refetch();
                  });
              }}
              className="px-6 py-3 rounded-xl font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 border-b-4 border-blue-200 flex items-center gap-2 transition-all shadow-md active:translate-y-0.5"
            >
              <RefreshCw className="w-5 h-5" />
              السؤال التالي
            </button>
            <button
              onClick={() => {
                if(confirm("هل أنت متأكد من حذف جميع الطلاب؟")) {
                  apiRequest("DELETE", "/api/students")
                    .then(() => refetch());
                }
              }}
              className="px-6 py-3 rounded-xl font-bold bg-red-100 text-red-700 hover:bg-red-200 border-b-4 border-red-200 flex items-center gap-2 transition-all shadow-md active:translate-y-0.5"
            >
              <Trash2 className="w-5 h-5" />
              حذف كل الطلاب
            </button>

            <Dialog>
              <DialogTrigger asChild>
                <button className="px-6 py-3 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 border-b-4 border-zinc-950 flex items-center gap-2 transition-all shadow-md active:translate-y-0.5">
                  <Copy className="w-5 h-5" />
                  تقرير النتائج
                </button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center mb-4 text-white">نتائج الحصة 📊</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-4 max-h-[400px] overflow-y-auto font-mono text-sm leading-relaxed">
                    {students.length > 0 ? (
                      students
                        .sort((a, b) => b.score - a.score)
                        .map((s, idx) => (
                          <div key={s.id} className="flex justify-between border-b border-white/5 py-2 last:border-0 items-center">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-white">#{idx + 1}</span>
                              <span className="font-bold text-white">{s.name}</span>
                            </div>
                            <span className="text-primary font-bold">{s.score} pts</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-center text-muted-foreground italic">لا يوجد طلاب</p>
                    )}
                  </div>
                  <button
                    onClick={copyResults}
                    className="w-full py-4 rounded-xl font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Copy className="w-5 h-5" />
                    نسخ كل النتائج
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog open={showEndReport} onOpenChange={setShowEndReport}>
              <AlertDialogTrigger asChild>
                <button className="px-6 py-3 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 border-b-4 border-zinc-950 flex items-center gap-2 transition-all shadow-md active:translate-y-0.5">
                  <LogOut className="w-5 h-5" />
                  إنهاء الحصة
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-white/10 text-white rounded-3xl max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-white text-center">تقرير نهاية الحصة 📊</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 text-center">
                    راجع النتائج النهائية قبل إنهاء الحصة وحذف الطلاب.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="bg-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto my-4">
                  {students.length > 0 ? (
                    students
                      .sort((a, b) => b.score - a.score)
                      .map((s, idx) => (
                        <div key={s.id} className="flex justify-between border-b border-white/5 py-2 last:border-0 items-center">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-white">#{idx + 1}</span>
                            <span className="font-bold text-white">{s.name}</span>
                          </div>
                          <span className="text-primary font-bold">{s.score} pts</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-center text-muted-foreground italic">لا يوجد طلاب</p>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <Button onClick={copyResults} className="flex-1 bg-zinc-800 hover:bg-zinc-700">
                    <Copy className="w-4 h-4 mr-2" />
                    نسخ النتائج
                  </Button>
                </div>

                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="bg-zinc-800 border-white/5 hover:bg-zinc-700 text-white rounded-xl">إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmEndSession}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold"
                  >
                    تأكيد إنهاء الحصة وحذف الطلاب
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Answer Key Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <CheckCircle className="w-5 h-5 text-primary" />
                Set Correct Answer
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {currentChoices.map((opt) => (
                  <BigButton
                    key={opt}
                    label={opt}
                    variant={correctAnswer === opt ? "success" : "outline"}
                    className={cn(
                      "h-24 text-2xl transition-all",
                      correctAnswer === opt && "ring-4 ring-green-200 ring-offset-2"
                    )}
                    onClick={() => apiRequest("POST", "/api/teacher/answer", { answer: opt, customChoices })}
                  />
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold text-white mb-2">خيارات مخصصة (مثال: نعم,لا)</h3>
                <div className="flex gap-2">
                  <Input 
                    placeholder="فصل الخيارات بفاصلة..." 
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={handleSetCustomChoices}>تحديث</Button>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
              <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                Lab Stats
              </h3>
              <div className="space-y-2 text-sm font-medium text-foreground/80">
                <div className="flex justify-between">
                  <span className="text-white">Total Students</span>
                  <span className="font-bold text-white">{students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Responses</span>
                  <span className="font-bold text-white">
                    {students.filter(s => s.lastAnswer).length} / {students.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="lg:col-span-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 min-h-[500px] border border-white/10">
              <h2 className="text-xl font-bold mb-6 text-white text-right">قائمة الطلاب والنتائج</h2>
              
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-gray-400">اسم الطالب</th>
                      <th className="p-3 text-gray-400">الحالة</th>
                      <th className="p-3 text-gray-400">النتيجة</th>
                      <th className="p-3 text-gray-400 text-center">النقاط</th>
                      <th className="p-3 text-gray-400 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{student.name}</td>
                        <td className="p-3">
                          {student.lastAnswer ? (
                            <div className="flex flex-col">
                              <span className="text-blue-400 font-medium">تمت الإجابة ({student.lastAnswer})</span>
                              {student.responseTime && (
                                <span className="text-[12px] text-yellow-400 font-mono bg-yellow-400/10 px-1 rounded">Time: {student.responseTime}s</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">في الانتظار</span>
                          )}
                        </td>
                        <td className="p-3">
                          {student.isCorrect === true && <span className="text-green-400 font-bold">✓ صح</span>}
                          {student.isCorrect === false && <span className="text-red-400 font-bold">✗ خطأ</span>}
                          {student.isCorrect === null && student.lastAnswer && <span className="text-amber-400 font-medium">قيد الانتظار</span>}
                          {!student.lastAnswer && <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-primary cursor-pointer hover:underline" onClick={() => {
                          setSelectedStudentId(student.id);
                          setPointAdjustValue("0");
                        }}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentId(student.id);
                                setPointAdjustValue("1");
                              }}
                              className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span 
                              className="cursor-pointer hover:underline underline-offset-4 text-primary"
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                setPointAdjustValue("0");
                              }}
                            >
                              {student.score}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if(confirm(`هل أنت متأكد من حذف الطالب ${student.name}؟`)) {
                                apiRequest("DELETE", `/api/students/${student.id}`)
                                  .then(() => refetch());
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-bold mb-4 text-white">لوحة الصور</h3>
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <p>Waiting for students to join...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {students.map((student) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                          "relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 shadow-sm bg-white/5 border-white/10",
                          student.lastAnswer 
                            ? student.isCorrect === true
                              ? "border-green-400 bg-green-500/10 shadow-green-500/20" 
                              : student.isCorrect === false
                                ? "border-red-400 bg-red-500/10 shadow-red-500/20"
                                : "border-amber-400 bg-amber-500/10 shadow-amber-500/20"
                            : "border-transparent hover:border-white/20"
                        )}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary mb-1">
                          <Atom className="w-6 h-6" />
                        </div>
                        <div className="font-bold truncate w-full text-white" title={student.name}>
                          {student.name}
                        </div>
                        <div className="text-sm font-mono bg-white/10 text-white px-2 py-1 rounded-md w-full">
                          Score: {student.score}
                        </div>
                        
                        {/* Status Badge */}
                        {student.lastAnswer && (
                          <div className={cn(
                            "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-sm border-2 border-white",
                            student.isCorrect === true ? "bg-green-500" : 
                            student.isCorrect === false ? "bg-red-500" : "bg-amber-400"
                          )}>
                            {student.lastAnswer}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <Dialog open={selectedStudentId !== null} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-white">تعديل النقاط للطالب</DialogTitle>
              <DialogDescription className="text-center text-gray-400">
                {students.find(s => s.id === selectedStudentId)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={pointAdjustValue} 
                  onChange={(e) => setPointAdjustValue(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-center text-xl h-14 rounded-xl"
                  placeholder="عدد النقاط"
                />
              </div>
              <p className="text-xs text-center text-gray-500">استخدم أرقام سالبة للخصم (مثال: -5)</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setSelectedStudentId(null)}
                className="rounded-xl border-white/10 hover:bg-white/5 text-white h-12"
              >
                إلغاء
              </Button>
              <Button 
                onClick={handlePointAdjustment}
                className="rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold h-12"
              >
                تأكيد التعديل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
