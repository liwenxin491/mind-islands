import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Award, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CelebrationOverlayProps {
  show: boolean;
  milestone: string;
  description: string;
  onComplete?: () => void;
}

export function CelebrationOverlay({
  show,
  milestone,
  description,
  onComplete,
}: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (show) {
      // Generate random particles
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setParticles(newParticles);

      // Auto-complete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          {/* Particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                background: `linear-gradient(135deg, #fbbf24, #d946ef)`,
              }}
              initial={{
                scale: 0,
                opacity: 0,
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
                y: [0, -100],
              }}
              transition={{
                duration: 2,
                delay: particle.id * 0.05,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 200,
            }}
            className="relative text-center"
          >
            {/* Trophy icon */}
            <motion.div
              className="relative mb-8"
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-accent/30 to-secondary/30 flex items-center justify-center relative">
                {/* Glow */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <Trophy className="w-16 h-16 text-accent relative z-10" />
              </div>

              {/* Orbiting sparkles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.3,
                  }}
                >
                  <div
                    className="text-2xl"
                    style={{
                      transform: `translate(-50%, -50%) translateY(-80px)`,
                    }}
                  >
                    ✨
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-4xl md:text-5xl font-medium text-foreground">
                {milestone}
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                {description}
              </p>
            </motion.div>

            {/* Confetti burst */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#d946ef' : '#9b87f5',
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Bottom sparkle trail */}
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Keep shining!</span>
              <Sparkles className="w-5 h-5" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
