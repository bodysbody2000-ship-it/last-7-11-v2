import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useStudentsList } from "@/hooks/use-students";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, ShieldCheck } from "lucide-react";
import { Student } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export default function HostDashboard() {
  const { onMessage } = useSocket();
  const { data: initialStudents } = useStudentsList();
  const [, setLocation] = useLocation();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("host_auth") !== "true") {
      setLocation("/host/login");
    }
  }, [setLocation]);

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
    });
  }, [onMessage]);

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col md:flex-row gap-6 items-center justify-between sticky top-4 z-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Host Dashboard (View Only)</h1>
              <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                <span className={cn("w-2 h-2 rounded-full", isAccepting ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                {isAccepting ? "LIVE: Accepting Answers" : "PAUSED: Submissions Closed"}
              </div>
            </div>
          </div>
          <div className="px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">
             مرحباً بك في وضع المراقبة
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/10">
              <h2 className="text-xl font-bold mb-4 text-white">Current Answer Key</h2>
              <div className="text-4xl font-bold text-center p-8 bg-white/5 rounded-2xl border border-white/10 text-primary">
                {correctAnswer || "Not Set"}
              </div>
            </div>

            <div className="bg-blue-500/5 rounded-3xl p-6 border border-blue-500/10">
              <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm font-medium text-gray-400">
                <div className="flex justify-between">
                  <span>Total Students</span>
                  <span className="font-bold text-white">{students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Responses</span>
                  <span className="font-bold text-white">
                    {students.filter(s => s.lastAnswer).length} / {students.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 min-h-[500px] border border-white/10">
              <h2 className="text-xl font-bold mb-6 text-white text-right">قائمة الطلاب والنتائج (عرض فقط)</h2>
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-gray-400">اسم الطالب</th>
                      <th className="p-3 text-gray-400">الحالة</th>
                      <th className="p-3 text-gray-400">النتيجة</th>
                      <th className="p-3 text-gray-400 text-center">النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{student.name}</td>
                        <td className="p-3 text-gray-300">
                          {student.lastAnswer ? `تمت الإجابة (${student.lastAnswer})` : "في الانتظار"}
                        </td>
                        <td className="p-3 font-bold">
                          {student.isCorrect === true && <span className="text-green-500">✓ صح</span>}
                          {student.isCorrect === false && <span className="text-red-500">✗ خطأ</span>}
                          {student.isCorrect === null && student.lastAnswer && <span className="text-amber-500">قيد الانتظار</span>}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-blue-400">{student.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
