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
    primary: "bg-primary text-primary-foreground border-primary/50 hover:bg-primary/95 hover:shadow-primary/30",
    secondary: "bg-secondary text-secondary-foreground border-secondary/50 hover:bg-secondary/95 hover:shadow-secondary/30",
    accent: "bg-accent text-accent-foreground border-accent/50 hover:bg-accent/95 hover:shadow-accent/30",
    destructive: "bg-destructive text-destructive-foreground border-destructive/50 hover:bg-destructive/95 hover:shadow-destructive/30",
    success: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))]/50 hover:opacity-95",
    outline: "bg-background text-foreground border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/40",
  };

  const sizes = {
    lg: "p-8 w-full min-w-[160px]",
    xl: "p-10 md:p-14 w-full min-w-[220px] md:min-w-[320px]",
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
