import { motion } from 'motion/react';
import type { CharacterMood } from '../types';

interface CharacterProps {
  mood: CharacterMood;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Character({ mood, name, size = 'md' }: CharacterProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  const glowColors = {
    happy: 'rgba(251, 191, 36, 0.6)',
    neutral: 'rgba(155, 135, 245, 0.4)',
    tired: 'rgba(148, 163, 184, 0.3)',
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: glowColors[mood],
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Character circle */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
          {/* Simple character face */}
          <div className="text-6xl">
            {mood === 'happy' && '🦉'}
            {mood === 'neutral' && '🦉'}
            {mood === 'tired' && '😴'}
          </div>
        </div>

        {/* Particles for happy state */}
        {mood === 'happy' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-accent/60"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0,
                }}
                animate={{
                  x: Math.cos((i * Math.PI) / 3) * 60,
                  y: Math.sin((i * Math.PI) / 3) * 60,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-lg text-foreground/90">{name}</p>
        <p className="text-sm text-muted-foreground capitalize">{mood}</p>
      </motion.div>
    </div>
  );
}
