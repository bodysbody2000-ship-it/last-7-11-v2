import { useEffect, useState } from "react";
import { useStudentJoin } from "@/hooks/use-students";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FlaskConical, User, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function StudentJoin() {
  const join = useStudentJoin();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [tempJoinData, setTempJoinData] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in with Replit
    const checkReplitAuth = async () => {
      try {
        const resp = await fetch("/__replit/authuser");
        if (resp.ok) {
          const user = await resp.json();
          if (user && (user.name || user.handle)) {
            // Show rules before auto-joining
            setTempJoinData({ name: user.name || user.handle });
            setShowRules(true);
          }
        }
      } catch (e) {
        console.error("Auth check failed", e);
      }
    };
    checkReplitAuth();
  }, []);

  const handleLogin = () => {
    toast({
      title: "404 Not Found",
      description: "هذه الميزة سيتم تفعيلها قريباً",
      variant: "destructive",
    });
  };

  const handleManualJoin = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال الاسم",
      });
      return;
    }
    
    // Check if name is English only
    const englishOnly = /^[A-Za-z0-9\s]+$/;
    if (!englishOnly.test(name.trim())) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال الاسم باللغة الإنجليزية فقط",
      });
      return;
    }

    setTempJoinData({ name: name.trim() });
    setShowRules(true);
  };

  const confirmJoin = async () => {
    if (!tempJoinData) return;
    try {
      const student = await join.mutateAsync(tempJoinData);
      localStorage.setItem("studentId", String(student.id));
      localStorage.setItem("studentName", student.name);
      setLocation("/student/dashboard");
    } catch (e) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "لا يمكن الانضمام حالياً (ربما الاسم مستخدم بالفعل)",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AnimatedBackground />
      
      <Link href="/" className="absolute top-4 left-4 md:top-8 md:left-8 p-2 rounded-full hover:bg-black/5 transition-colors">
        <ArrowLeft className="w-6 h-6 text-foreground/70" />
      </Link>

      <AnimatePresence mode="wait">
        {!showRules ? (
          <motion.div 
            key="join-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 text-center"
          >
            <div className="text-center mb-8 space-y-4">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary">
                <FlaskConical className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-display text-white font-bold">Lab Access</h2>
              <p className="text-gray-400">انضم للحصة الآن</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Input
                  placeholder="أدخل اسمك هنا..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-16 bg-white/5 border-white/10 text-white text-center text-xl rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button 
                    onClick={handleManualJoin}
                    disabled={join.isPending}
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-2xl shadow-xl transition-all"
                  >
                    <User className="ml-3 w-7 h-7" />
                    دخول بالاسم
                  </Button>
                </motion.div>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-3 text-gray-500 font-bold tracking-widest">أو</span></div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className="w-full py-5 bg-white text-black rounded-2xl font-bold text-2xl shadow-2xl hover:shadow-white/10 transition-all flex items-center justify-center gap-4"
              >
                <img src="https://www.google.com/favicon.ico" className="w-7 h-7" alt="Google" />
                دخول بحساب Google
              </motion.button>
            </div>

            <div className="mt-8 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary/90 leading-relaxed">
              Don't forget to subscribe to Mr.Ahmed channel on youtube (chemistry worled)
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="rules"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-black rounded-3xl p-8 shadow-2xl border-2 border-primary/30 text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-center gap-3 mb-6 text-primary">
              <ShieldCheck className="w-10 h-10" />
              <h2 className="text-3xl font-bold">قوانين المختبر 🧪</h2>
            </div>
            
            <div className="space-y-6 text-white text-lg leading-relaxed mb-8">
              <p className="font-bold text-xl text-white bg-zinc-900 p-4 rounded-2xl border border-white/10">
                اللعبه لعبه دقه وسرعه وعلشان كده احنا خلينا الطالب الاول اللي هيجاوب صح هياخد 10 نقط والتاني هياخد 9 الثالث هياخد 8 وهكذا.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• تأكد من استقرار الإنترنت لديك.</li>
                <li>• لا تغلق الصفحة أثناء الاختبار.</li>
                <li>• استعد جيداً قبل البدء.</li>
              </ul>
            </div>

            <Button 
              onClick={confirmJoin}
              className="w-full h-16 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all animate-pulse"
            >
              موافق، ابدأ الآن! 🚀
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
