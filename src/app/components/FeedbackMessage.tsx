import { motion } from 'motion/react';
import { Sparkles, Heart, Moon } from 'lucide-react';

interface FeedbackMessageProps {
  type: 'success' | 'encouragement' | 'recovery';
  message: string;
  onClose?: () => void;
}

export function FeedbackMessage({ type, message, onClose }: FeedbackMessageProps) {
  const styles = {
    success: {
      bg: 'bg-accent/20',
      border: 'border-accent/40',
      icon: <Sparkles className="w-6 h-6 text-accent" />,
      glow: 'rgba(251, 191, 36, 0.3)',
    },
    encouragement: {
      bg: 'bg-primary/20',
      border: 'border-primary/40',
      icon: <Heart className="w-6 h-6 text-primary" />,
      glow: 'rgba(155, 135, 245, 0.3)',
    },
    recovery: {
      bg: 'bg-secondary/20',
      border: 'border-secondary/40',
      icon: <Moon className="w-6 h-6 text-secondary" />,
      glow: 'rgba(217, 70, 239, 0.3)',
    },
  };

  const style = styles[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`relative p-6 rounded-2xl ${style.bg} border ${style.border} backdrop-blur-xl overflow-hidden`}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 blur-2xl"
        style={{ background: style.glow }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-4">
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {style.icon}
        </motion.div>
        <div className="flex-1">
          <p className="text-foreground leading-relaxed">{message}</p>
        </div>
      </div>

      {/* Floating particles */}
      {type === 'success' && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-accent rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                opacity: 0,
              }}
              animate={{
                x: `${50 + Math.cos((i * Math.PI * 2) / 5) * 100}%`,
                y: `${50 + Math.sin((i * Math.PI * 2) / 5) * 100}%`,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
