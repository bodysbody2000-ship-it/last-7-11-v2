import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import TeacherLogin from "@/pages/teacher/Login";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import HostLogin from "@/pages/host/Login";
import HostDashboard from "@/pages/host/Dashboard";
import StudentJoin from "@/pages/student/Join";
import StudentDashboard from "@/pages/student/Dashboard";
import Leaderboard from "@/pages/Leaderboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/leaderboard" component={Leaderboard} />
      
      {/* Teacher Routes */}
      <Route path="/teacher/login" component={TeacherLogin} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      
      {/* Host Routes */}
      <Route path="/host/login" component={HostLogin} />
      <Route path="/host/dashboard" component={HostDashboard} />
      
      {/* Student Routes */}
      <Route path="/student/join" component={StudentJoin} />
      <Route path="/student/dashboard" component={StudentDashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen">
          <Router />
          <footer className="fixed bottom-4 right-4 text-[10px] md:text-xs text-muted-foreground/50 font-medium pointer-events-none z-[100] text-right">
            Made by Ahmed Abdelwahab • The app will update automatically
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
