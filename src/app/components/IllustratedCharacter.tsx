import { motion } from 'motion/react';
import type { CharacterMood } from '../types';

interface IllustratedCharacterProps {
  type: 'owl' | 'puppy' | 'girl';
  mood: CharacterMood;
  size?: 'sm' | 'md' | 'lg';
}

export function IllustratedCharacter({ type, mood, size = 'lg' }: IllustratedCharacterProps) {
  const sizeMap = {
    sm: 80,
    md: 120,
    lg: 160,
  };

  const dimension = sizeMap[size];

  const owlIllustration = (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="owl-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#92400e', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#78350f', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="owl-glow">
          <stop offset="0%" style={{ stopColor: mood === 'happy' ? '#fbbf24' : mood === 'tired' ? '#94a3b8' : '#a78bfa', stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* Glow effect behind owl */}
      {mood === 'happy' && (
        <circle cx="60" cy="65" r="50" fill="url(#owl-glow)" />
      )}

      {/* Body */}
      <ellipse cx="60" cy="70" rx="30" ry="35" fill="url(#owl-body)" />
      
      {/* Wings */}
      <ellipse cx="35" cy="70" rx="12" ry="25" fill="#92400e" opacity="0.8" />
      <ellipse cx="85" cy="70" rx="12" ry="25" fill="#92400e" opacity="0.8" />
      
      {/* Head */}
      <circle cx="60" cy="45" r="28" fill="#a16207" />
      
      {/* Ear tufts */}
      <ellipse cx="45" cy="25" rx="5" ry="12" fill="#92400e" />
      <ellipse cx="75" cy="25" rx="5" ry="12" fill="#92400e" />
      
      {/* Eye circles (white background) */}
      <circle cx="50" cy="45" r="12" fill="#fef3c7" />
      <circle cx="70" cy="45" r="12" fill="#fef3c7" />
      
      {/* Eyes */}
      {mood === 'tired' ? (
        <>
          {/* Closed/sleepy eyes */}
          <path d="M 44 45 Q 50 48 56 45" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 64 45 Q 70 48 76 45" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Open eyes */}
          <circle cx="50" cy="45" r="6" fill="#1f2937" />
          <circle cx="70" cy="45" r="6" fill="#1f2937" />
          {/* Eye shine */}
          <circle cx="52" cy="43" r="2" fill="#ffffff" />
          <circle cx="72" cy="43" r="2" fill="#ffffff" />
        </>
      )}
      
      {/* Beak */}
      <path d="M 60 52 L 54 58 L 66 58 Z" fill="#f59e0b" />
      
      {/* Belly detail */}
      <ellipse cx="60" cy="75" rx="18" ry="22" fill="#d97706" opacity="0.3" />
      
      {/* Feet */}
      <g transform="translate(50, 100)">
        <path d="M 0 0 L -3 5 M 0 0 L 0 5 M 0 0 L 3 5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(70, 100)">
        <path d="M 0 0 L -3 5 M 0 0 L 0 5 M 0 0 L 3 5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Happy sparkles */}
      {mood === 'happy' && (
        <>
          <motion.circle
            cx="30"
            cy="40"
            r="2"
            fill="#fbbf24"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx="90"
            cy="40"
            r="2"
            fill="#fbbf24"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </svg>
  );

  const puppyIllustration = (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="puppy-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Body */}
      <ellipse cx="60" cy="75" rx="28" ry="30" fill="url(#puppy-body)" />
      
      {/* Head */}
      <circle cx="60" cy="48" r="24" fill="#fbbf24" />
      
      {/* Ears */}
      <ellipse cx="40" cy="38" rx="10" ry="18" fill="#f59e0b" transform="rotate(-20 40 38)" />
      <ellipse cx="80" cy="38" rx="10" ry="18" fill="#f59e0b" transform="rotate(20 80 38)" />
      
      {/* Snout */}
      <ellipse cx="60" cy="55" rx="12" ry="10" fill="#fef3c7" />
      
      {/* Eyes */}
      {mood === 'tired' ? (
        <>
          <path d="M 50 45 Q 52 48 54 45" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 66 45 Q 68 48 70 45" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="52" cy="45" r="4" fill="#1f2937" />
          <circle cx="68" cy="45" r="4" fill="#1f2937" />
          <circle cx="53" cy="44" r="1.5" fill="#ffffff" />
          <circle cx="69" cy="44" r="1.5" fill="#ffffff" />
        </>
      )}
      
      {/* Nose */}
      <ellipse cx="60" cy="58" rx="3" ry="2.5" fill="#1f2937" />
      
      {/* Mouth */}
      {mood === 'happy' && (
        <path d="M 60 58 Q 55 62 50 60 M 60 58 Q 65 62 70 60" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      
      {/* Collar */}
      <ellipse cx="60" cy="68" rx="16" ry="4" fill="#ef4444" />
      <circle cx="60" cy="68" r="2" fill="#fbbf24" />
      
      {/* Paws */}
      <ellipse cx="48" cy="102" rx="6" ry="8" fill="#f59e0b" />
      <ellipse cx="72" cy="102" rx="6" ry="8" fill="#f59e0b" />
      
      {/* Tail */}
      <path d="M 85 75 Q 95 70 100 75" stroke="#f59e0b" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* Happy particles */}
      {mood === 'happy' && (
        <>
          <motion.path
            d="M 25 50 L 28 53 L 25 56 L 22 53 Z"
            fill="#fbbf24"
            animate={{ opacity: [0, 1, 0], y: [0, -5, -10] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.path
            d="M 95 50 L 98 53 L 95 56 L 92 53 Z"
            fill="#fbbf24"
            animate={{ opacity: [0, 1, 0], y: [0, -5, -10] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
          />
        </>
      )}
    </svg>
  );

  const girlIllustration = (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="girl-dress" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#be185d', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Body/Dress */}
      <path d="M 60 65 L 40 100 L 45 100 L 60 75 L 75 100 L 80 100 Z" fill="url(#girl-dress)" />
      
      {/* Head */}
      <circle cx="60" cy="45" r="18" fill="#fde68a" />
      
      {/* Hair */}
      <path d="M 42 40 Q 42 25 60 25 Q 78 25 78 40" fill="#92400e" />
      <ellipse cx="40" cy="45" rx="8" ry="12" fill="#92400e" />
      <ellipse cx="80" cy="45" rx="8" ry="12" fill="#92400e" />
      
      {/* Hair detail - bun */}
      <circle cx="60" cy="28" r="8" fill="#92400e" />
      
      {/* Eyes */}
      {mood === 'tired' ? (
        <>
          <path d="M 52 42 Q 54 45 56 42" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 64 42 Q 66 45 68 42" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="54" cy="43" r="3" fill="#1f2937" />
          <circle cx="66" cy="43" r="3" fill="#1f2937" />
          <circle cx="55" cy="42" r="1" fill="#ffffff" />
          <circle cx="67" cy="42" r="1" fill="#ffffff" />
        </>
      )}
      
      {/* Smile */}
      {mood === 'happy' && (
        <path d="M 52 50 Q 60 54 68 50" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      
      {/* Nose */}
      <circle cx="60" cy="48" r="1.5" fill="#f59e0b" opacity="0.4" />
      
      {/* Arms */}
      <ellipse cx="45" cy="68" rx="4" ry="10" fill="#fde68a" transform="rotate(-20 45 68)" />
      <ellipse cx="75" cy="68" rx="4" ry="10" fill="#fde68a" transform="rotate(20 75 68)" />
      
      {/* Legs/Feet */}
      <rect x="48" y="100" width="5" height="8" rx="2" fill="#fde68a" />
      <rect x="67" y="100" width="5" height="8" rx="2" fill="#fde68a" />
      <ellipse cx="50" cy="108" rx="5" ry="3" fill="#1f2937" />
      <ellipse cx="69" cy="108" rx="5" ry="3" fill="#1f2937" />

      {/* Happy hearts */}
      {mood === 'happy' && (
        <>
          <motion.path
            d="M 25 45 Q 25 42 27 42 Q 29 42 29 45 Q 29 42 31 42 Q 33 42 33 45 Q 33 50 29 53 Q 25 50 25 45 Z"
            fill="#ec4899"
            opacity="0.6"
            animate={{ opacity: [0, 0.8, 0], y: [0, -8, -15] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.path
            d="M 87 45 Q 87 42 89 42 Q 91 42 91 45 Q 91 42 93 42 Q 95 42 95 45 Q 95 50 91 53 Q 87 50 87 45 Z"
            fill="#ec4899"
            opacity="0.6"
            animate={{ opacity: [0, 0.8, 0], y: [0, -8, -15] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          />
        </>
      )}
    </svg>
  );

  const illustrations = {
    owl: owlIllustration,
    puppy: puppyIllustration,
    girl: girlIllustration,
  };

  const moodStyle = {
    happy: {
      ring: '0 0 36px rgba(251,191,36,0.45)',
      badge: '✨',
      label: 'Thriving',
    },
    neutral: {
      ring: '0 0 24px rgba(167,139,250,0.3)',
      badge: '🌙',
      label: 'Steady',
    },
    tired: {
      ring: '0 0 18px rgba(148,163,184,0.3)',
      badge: '💤',
      label: 'Needs Rest',
    },
  } as const;

  return (
    <div className="relative">
      <motion.div
        style={{ width: dimension, height: dimension, filter: `drop-shadow(${moodStyle[mood].ring})` }}
        animate={{
          y: [0, -8, 0],
          scale: mood === 'happy' ? [1, 1.02, 1] : [1, 0.99, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {illustrations[type]}
      </motion.div>

      <motion.div
        className="absolute -top-2 -right-2 px-2 py-1 rounded-full bg-card/80 backdrop-blur-md border border-white/20 text-[10px] text-foreground flex items-center gap-1"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span>{moodStyle[mood].badge}</span>
        <span>{moodStyle[mood].label}</span>
      </motion.div>

      {mood === 'tired' && (
        <>
          <motion.div
            className="absolute -top-5 -left-2 text-xs text-slate-200/80"
            animate={{ y: [0, -8, -14], opacity: [0.15, 0.8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0 }}
          >
            Zz
          </motion.div>
          <motion.div
            className="absolute -top-8 left-3 text-[10px] text-slate-200/70"
            animate={{ y: [0, -6, -11], opacity: [0.12, 0.7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.7 }}
          >
            z
          </motion.div>
        </>
      )}
    </div>
  );
}
