import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ButtonHTMLAttributes } from "react";

interface BigButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'style'> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "destructive" | "success";
  size?: "lg" | "xl";
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export function BigButton({ 
  className, 
  variant = "primary", 
  size = "lg", 
  label,
  sublabel,
  icon,
  ...props 
}: BigButtonProps) {
  const baseStyles = "relative overflow-hidden rounded-3xl font-bold transition-all duration-300 flex flex-col items-center justify-center gap-3 group border-b-[6px] active:border-b-0 active:translate-y-1.5 shadow-2xl";
    
  const variants = {
    primary: "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-white border-cyan-400/40 hover:from-blue-500 hover:to-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_50px_rgba(6,182,212,0.55)] border-b-cyan-500",
    secondary: "bg-gradient-to-br from-violet-600 via-indigo-500 to-purple-500 text-white border-indigo-400/40 hover:from-violet-500 hover:to-purple-400 shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:shadow-[0_0_50px_rgba(139,92,246,0.55)] border-b-violet-500",
    accent: "bg-gradient-to-br from-emerald-600 via-teal-500 to-lime-500 text-white border-emerald-400/40 hover:from-emerald-500 hover:to-lime-400 shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_50px_rgba(16,185,129,0.55)] border-b-emerald-500",
    gold: "bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-400 text-white border-yellow-400/40 hover:from-amber-500 hover:to-orange-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:shadow-[0_0_50px_rgba(245,158,11,0.55)] border-b-amber-500",
    destructive: "bg-gradient-to-br from-red-600 to-orange-500 text-white border-red-500/50 hover:from-red-500 hover:to-orange-400 shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:shadow-[0_0_50px_rgba(239,68,68,0.55)]",
    success: "bg-gradient-to-br from-green-500 to-emerald-400 text-white border-green-700 hover:bg-green-600 shadow-green-500/50",
    outline: "bg-background/40 backdrop-blur-md text-white border-white/20 hover:bg-white/10 hover:border-white/40 shadow-xl",
  };

  const sizes = {
    lg: "p-8 w-full min-w-[120px]",
    xl: "p-6 sm:p-10 md:p-14 w-full",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)}
      {...props}
    >
      {icon && <span className="text-3xl mb-2">{icon}</span>}
      <span className={cn("font-display", size === "xl" ? "text-3xl md:text-4xl" : "text-xl")}>
        {label}
      </span>
      {sublabel && (
        <span className="text-sm opacity-80 font-medium font-body">{sublabel}</span>
      )}
    </motion.button>
  );
}
