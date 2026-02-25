import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Flame } from 'lucide-react';
import { FloatingIsland } from './FloatingIsland';
import type { Island } from '../types';

interface IslandCardProps {
  island: Island;
  position?: { x: number; y: number };
  delay?: number;
}

export function IslandCard({ island, position = { x: 0, y: 0 }, delay = 0 }: IslandCardProps) {
  const navigate = useNavigate();
  
  // Map island IDs to illustration types
  const islandTypeMap: Record<string, 'health' | 'work' | 'learning' | 'relationships' | 'curiosity' | 'compassion'> = {
    body: 'health',
    work: 'work',
    learning: 'learning',
    relationships: 'relationships',
    curiosity: 'curiosity',
    compassion: 'compassion',
  };

  const illustrationType = islandTypeMap[island.id] || 'health';

  const handleClick = () => {
    // Navigate to specific island pages
    const islandRoutes: Record<string, string> = {
      body: '/island/body',
      work: '/island/work',
      learning: '/island/learning',
      relationships: '/island/relationships',
      curiosity: '/island/curiosity',
      compassion: '/island/compassion',
    };

    const route = islandRoutes[island.id];
    if (route) {
      navigate(route);
    } else {
      navigate(`/island/${island.id}`);
    }
  };

  return (
    <motion.div
      className="absolute z-10 cursor-pointer group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        delay,
        type: 'spring',
        stiffness: 100,
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="relative w-48 h-48 cursor-pointer group"
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 3 + delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{
            background: island.color,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Island illustration */}
        <div className="relative w-full h-full transition-all duration-300">
          <FloatingIsland 
            type={illustrationType} 
            color={island.color}
            glow={island.completedToday}
          />
          
          {/* Island name label */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8">
            <p className="text-sm font-medium text-foreground/90 px-3 py-1 rounded-full bg-card/60 backdrop-blur-sm border border-white/20 whitespace-nowrap">
              {island.name}
            </p>
          </div>
        </div>

        {/* Streak indicator */}
        {island.streak > 0 && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-accent/90 text-accent-foreground px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10">
            <Flame className="w-3 h-3" />
            {island.streak}
          </div>
        )}

        {/* Completed today indicator */}
        {island.completedToday && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <motion.div 
              className="w-3 h-3 rounded-full bg-accent shadow-lg"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        )}

        {/* Hover sparkle effect */}
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity text-sm z-10"
          animate={{
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✨
        </motion.div>
      </motion.div>
    </motion.div>
  );
}