import { motion } from 'motion/react';
import type { CharacterMood } from '../types';
import seaOtterImage from '../../assets/sea-otter.png';

interface IllustratedCharacterProps {
  type: 'otter';
  mood: CharacterMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function IllustratedCharacter({ type: _type, mood, size = 'lg' }: IllustratedCharacterProps) {
  const sizeMap = {
    sm: 80,
    md: 120,
    lg: 160,
    xl: 240,
  };

  const dimension = sizeMap[size];

  const moodStyle = {
    happy: {
      ring: '0 0 42px rgba(228,214,191,0.5)',
      badge: '✨',
      label: 'Thriving',
    },
    neutral: {
      ring: '0 0 28px rgba(188,198,208,0.34)',
      badge: '🌙',
      label: 'Steady',
    },
    tired: {
      ring: '0 0 22px rgba(160,170,184,0.28)',
      badge: '💤',
      label: 'Needs Rest',
    },
  } as const;

  return (
    <div className="relative">
      <motion.div
        style={{
          width: dimension * 1.8,
          height: dimension * 1.1,
          filter: `drop-shadow(${moodStyle[mood].ring})`,
        }}
        animate={{
          y: [0, -6, 0],
          rotate: [-0.6, 0.6, -0.6],
          scale: mood === 'happy' ? [1, 1.015, 1] : [1, 0.995, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        <img
          src={seaOtterImage}
          alt="Sea otter avatar"
          className="h-full w-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      </motion.div>

    </div>
  );
}
