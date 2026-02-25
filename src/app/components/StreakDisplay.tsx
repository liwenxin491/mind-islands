import { motion } from 'motion/react';
import { Flame, TrendingUp } from 'lucide-react';

interface StreakDisplayProps {
  streak: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakDisplay({ streak, label = 'Day Streak', size = 'md' }: StreakDisplayProps) {
  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-4 h-4',
      number: 'text-2xl',
      label: 'text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'w-5 h-5',
      number: 'text-3xl',
      label: 'text-sm',
    },
    lg: {
      container: 'p-6',
      icon: 'w-6 h-6',
      number: 'text-4xl',
      label: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  if (streak === 0) {
    return (
      <div className={`${classes.container} bg-muted/30 rounded-2xl border border-border text-center`}>
        <div className="flex flex-col items-center gap-2">
          <div className="text-muted-foreground">
            <TrendingUp className={classes.icon} />
          </div>
          <p className={`${classes.label} text-muted-foreground`}>
            Start your streak today! 🌱
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${classes.container} bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl border border-accent/30 text-center relative overflow-hidden`}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent blur-xl"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative flex flex-col items-center gap-2">
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Flame className={`${classes.icon} text-accent`} />
        </motion.div>

        <div>
          <motion.p
            className={`${classes.number} font-bold text-accent`}
            key={streak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            {streak}
          </motion.p>
          <p className={`${classes.label} text-muted-foreground`}>{label}</p>
        </div>
      </div>

      {/* Sparkles for milestones */}
      {streak % 7 === 0 && streak > 0 && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-lg"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, (i - 1) * 30],
                y: [0, -40],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              style={{
                left: '50%',
                top: '50%',
              }}
            >
              ✨
            </motion.div>
          ))}
        </>
      )}
    </motion.div>
  );
}
