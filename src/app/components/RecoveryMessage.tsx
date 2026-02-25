import { motion } from 'motion/react';
import { Moon, Heart, Sunrise } from 'lucide-react';
import { Button } from './ui/button';

interface RecoveryMessageProps {
  daysMissed?: number;
  onContinue?: () => void;
}

export function RecoveryMessage({ daysMissed = 1, onContinue }: RecoveryMessageProps) {
  const messages = [
    {
      title: "Welcome back, friend 🌙",
      subtitle: "It's okay to take breaks",
      body: "Self-care isn't about perfection—it's about showing up when you can. Your islands have been waiting patiently for you, and they're happy you're here now.",
    },
    {
      title: "Rest is part of growth 🌱",
      subtitle: "You needed that time",
      body: "Sometimes we need to pause to recharge. That's not failure—that's listening to yourself. Let's continue your journey with fresh energy.",
    },
    {
      title: "Every day is a fresh start ☀️",
      subtitle: "No judgment, just support",
      body: "You don't need to make up for lost time. What matters is that you're here now, ready to care for yourself again. Let's make today count.",
    },
  ];

  const message = messages[Math.min(daysMissed - 1, messages.length - 1)];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative max-w-2xl mx-auto p-8 bg-gradient-to-br from-secondary/20 to-primary/20 backdrop-blur-xl border border-border rounded-3xl overflow-hidden"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/10 blur-2xl"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative text-center space-y-6">
        {/* Icon */}
        <motion.div
          className="flex justify-center"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center">
            <Moon className="w-10 h-10 text-secondary" />
          </div>
        </motion.div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-3xl font-medium text-foreground">{message.title}</h2>
          <p className="text-lg text-primary">{message.subtitle}</p>
          <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {message.body}
          </p>
        </div>

        {/* Stats (if applicable) */}
        {daysMissed > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full"
          >
            <Heart className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {daysMissed} days since last check-in
            </span>
          </motion.div>
        )}

        {/* Action */}
        {onContinue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={onContinue}
              size="lg"
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-8"
            >
              <Sunrise className="w-5 h-5 mr-2" />
              Start Fresh Today
            </Button>
          </motion.div>
        )}
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-secondary/40"
          initial={{
            x: '50%',
            y: '50%',
          }}
          animate={{
            x: `${50 + Math.cos((i * Math.PI * 2) / 6) * 150}%`,
            y: `${50 + Math.sin((i * Math.PI * 2) / 6) * 150}%`,
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  );
}
