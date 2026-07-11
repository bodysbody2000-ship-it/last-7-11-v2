import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#040612] overflow-hidden pointer-events-none">
      {/* Glow 1: Cyan/Science Fluid Blob */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -100, 60, 0],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px]"
      />

      {/* Glow 2: Violet/Chemical Reaction Blob */}
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -80, 0],
          scale: [1, 0.8, 1.2, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full bg-violet-500/10 blur-[140px]"
      />

      {/* Glow 3: Emerald/Nuclear Energy Blob */}
      <motion.div
        animate={{
          x: [0, 60, -80, 0],
          y: [0, 80, -100, 0],
          scale: [0.8, 1.15, 0.9, 0.8],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-[450px] h-[450px] rounded-full bg-emerald-500/8 blur-[110px]"
      />

      {/* Cybernetic Alignment Grid */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-80" 
      />

      {/* Vignette layer for deep aesthetic contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#040612_95%)]" />
    </div>
  );
}
