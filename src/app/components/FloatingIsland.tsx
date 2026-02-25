import { motion } from 'motion/react';

interface FloatingIslandProps {
  type: 'health' | 'work' | 'learning' | 'relationships' | 'curiosity' | 'compassion';
  color: string;
  glow?: boolean;
}

export function FloatingIsland({ type, color, glow = false }: FloatingIslandProps) {
  const illustrations = {
    health: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Island base - organic shape */}
        <defs>
          <linearGradient id={`grad-health`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#2d5a3d', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#1a3d2d', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="shadow-health">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="4" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge> 
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>
        
        {/* Shadow under island */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Main island landmass */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-health)"
          filter="url(#shadow-health)"
        />
        
        {/* Grass layer */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#10b981"
          opacity="0.8"
        />
        
        {/* Decorative grass blades */}
        <g opacity="0.7">
          <line x1="70" y1="110" x2="72" y2="105" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
          <line x1="85" y1="110" x2="83" y2="104" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
          <line x1="100" y1="110" x2="102" y2="103" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
          <line x1="115" y1="110" x2="117" y2="106" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
          <line x1="130" y1="110" x2="128" y2="104" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        </g>
        
        {/* Yoga mat */}
        <rect x="65" y="102" width="25" height="8" rx="1" fill="#ec4899" opacity="0.8"/>
        
        {/* Dumbbell */}
        <g transform="translate(110, 100)">
          <rect x="0" y="4" width="15" height="2" fill="#94a3b8"/>
          <circle cx="0" cy="5" r="3" fill="#64748b"/>
          <circle cx="15" cy="5" r="3" fill="#64748b"/>
        </g>
        
        {/* Tree/plant */}
        <g transform="translate(130, 95)">
          <rect x="0" y="5" width="3" height="15" fill="#92400e"/>
          <circle cx="1.5" cy="5" r="6" fill="#10b981" opacity="0.7"/>
          <circle cx="-2" cy="3" r="4" fill="#10b981" opacity="0.8"/>
          <circle cx="5" cy="3" r="4" fill="#10b981" opacity="0.8"/>
        </g>
        
        {/* Water bottle */}
        <rect x="95" y="100" width="5" height="10" rx="1" fill="#3b82f6" opacity="0.6"/>
        <rect x="95" y="100" width="5" height="3" rx="1" fill="#60a5fa" opacity="0.8"/>
      </svg>
    ),
    
    work: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="grad-work" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#1e3a5f', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0f1f3d', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Island base */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-work)"
        />
        
        {/* Surface */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#3b82f6"
          opacity="0.6"
        />
        
        {/* Office building */}
        <g transform="translate(80, 75)">
          <rect x="0" y="10" width="20" height="35" fill="#1e40af" opacity="0.9"/>
          <rect x="2" y="12" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="7" y="12" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="14" y="12" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="2" y="18" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="7" y="18" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="14" y="18" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="2" y="24" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="7" y="24" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
          <rect x="14" y="24" width="4" height="4" fill="#60a5fa" opacity="0.8"/>
        </g>
        
        {/* Briefcase */}
        <g transform="translate(110, 95)">
          <rect x="0" y="5" width="15" height="12" rx="1" fill="#1e3a8a"/>
          <rect x="5" y="3" width="5" height="3" fill="#1e3a8a"/>
          <circle cx="7.5" cy="11" r="1.5" fill="#60a5fa"/>
        </g>
        
        {/* Desk lamp */}
        <g transform="translate(62, 95)">
          <line x1="5" y1="15" x2="5" y2="8" stroke="#64748b" strokeWidth="1.5"/>
          <path d="M 2 5 L 8 5 L 6 8 L 4 8 Z" fill="#fbbf24"/>
          <ellipse cx="5" cy="15" rx="3" ry="1" fill="#475569"/>
        </g>
        
        {/* Coffee cup */}
        <g transform="translate(125, 100)">
          <rect x="0" y="5" width="6" height="8" rx="1" fill="#7c2d12"/>
          <ellipse cx="3" cy="5" rx="3" ry="1.5" fill="#92400e"/>
          <path d="M 6 7 Q 9 7 9 9 Q 9 11 6 11" stroke="#92400e" fill="none" strokeWidth="1"/>
        </g>
      </svg>
    ),
    
    learning: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="grad-learning" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#4c1d95', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#2e1065', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Island base */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-learning)"
        />
        
        {/* Surface */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#a855f7"
          opacity="0.6"
        />
        
        {/* Library building */}
        <g transform="translate(75, 70)">
          {/* Building base */}
          <rect x="0" y="15" width="30" height="25" fill="#6b21a8" opacity="0.9"/>
          {/* Columns */}
          <rect x="2" y="15" width="3" height="25" fill="#a855f7" opacity="0.7"/>
          <rect x="12" y="15" width="3" height="25" fill="#a855f7" opacity="0.7"/>
          <rect x="22" y="15" width="3" height="25" fill="#a855f7" opacity="0.7"/>
          {/* Roof */}
          <path d="M -2 15 L 15 8 L 32 15 Z" fill="#7c3aed"/>
        </g>
        
        {/* Stack of books */}
        <g transform="translate(110, 95)">
          <rect x="0" y="10" width="12" height="3" fill="#ec4899"/>
          <rect x="0" y="7" width="12" height="3" fill="#3b82f6"/>
          <rect x="0" y="4" width="12" height="3" fill="#10b981"/>
          <rect x="2" y="1" width="10" height="3" rx="0.5" fill="#f59e0b"/>
        </g>
        
        {/* Graduation cap */}
        <g transform="translate(125, 90)">
          <rect x="0" y="5" width="2" height="8" fill="#1f2937"/>
          <path d="M -3 5 L 8 1 L 8 5 L -3 9 Z" fill="#1f2937"/>
          <ellipse cx="2.5" cy="5" rx="5.5" ry="1.5" fill="#fbbf24"/>
        </g>
        
        {/* Lightbulb idea */}
        <g transform="translate(60, 92)">
          <circle cx="3" cy="3" r="3" fill="#fbbf24" opacity="0.9"/>
          <rect x="2" y="6" width="2" height="3" fill="#a16207"/>
          <rect x="1.5" y="9" width="3" height="1.5" rx="0.5" fill="#78716c"/>
          {/* Light rays */}
          <line x1="3" y1="0" x2="3" y2="-2" stroke="#fbbf24" strokeWidth="0.5"/>
          <line x1="6" y1="3" x2="8" y2="3" stroke="#fbbf24" strokeWidth="0.5"/>
          <line x1="0" y1="3" x2="-2" y2="3" stroke="#fbbf24" strokeWidth="0.5"/>
        </g>
      </svg>
    ),
    
    relationships: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="grad-relationships" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#831843', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#500724', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Island base */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-relationships)"
        />
        
        {/* Surface */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#ec4899"
          opacity="0.6"
        />
        
        {/* Cafe/gathering building */}
        <g transform="translate(75, 80)">
          <rect x="0" y="10" width="25" height="30" rx="2" fill="#9d174d" opacity="0.9"/>
          <rect x="3" y="15" width="8" height="10" fill="#fce7f3" opacity="0.6"/>
          <rect x="14" y="15" width="8" height="10" fill="#fce7f3" opacity="0.6"/>
          {/* Awning */}
          <path d="M -2 10 L 27 10 L 25 15 L 0 15 Z" fill="#ec4899" opacity="0.8"/>
          <line x1="5" y1="10" x2="7" y2="15" stroke="#be185d" strokeWidth="1"/>
          <line x1="12" y1="10" x2="14" y2="15" stroke="#be185d" strokeWidth="1"/>
          <line x1="20" y1="10" x2="22" y2="15" stroke="#be185d" strokeWidth="1"/>
        </g>
        
        {/* Bridge/connection */}
        <g transform="translate(105, 105)">
          <path d="M 0 0 Q 10 -5 20 0" stroke="#f472b6" strokeWidth="2" fill="none"/>
          <circle cx="0" cy="0" r="2" fill="#f472b6"/>
          <circle cx="20" cy="0" r="2" fill="#f472b6"/>
        </g>
        
        {/* Heart structure */}
        <g transform="translate(115, 85)">
          <path 
            d="M 8 5 Q 8 2 10 2 Q 12 2 12 5 Q 12 2 14 2 Q 16 2 16 5 Q 16 10 12 14 Q 8 10 8 5 Z" 
            fill="#f472b6" 
            opacity="0.9"
          />
        </g>
        
        {/* Table with chairs */}
        <g transform="translate(55, 100)">
          <ellipse cx="5" cy="5" rx="6" ry="3" fill="#9d174d" opacity="0.7"/>
          <rect x="4" y="5" width="2" height="5" fill="#7c2d12"/>
          {/* Chairs */}
          <rect x="0" y="8" width="3" height="2" fill="#92400e"/>
          <rect x="9" y="8" width="3" height="2" fill="#92400e"/>
        </g>
        
        {/* Flowers */}
        <g transform="translate(130, 100)">
          <line x1="2" y1="10" x2="2" y2="5" stroke="#10b981" strokeWidth="1"/>
          <circle cx="2" cy="4" r="2" fill="#f472b6"/>
          <circle cx="0.5" cy="3" r="1" fill="#fbbf24"/>
          <circle cx="3.5" cy="3" r="1" fill="#fbbf24"/>
        </g>
      </svg>
    ),
    
    curiosity: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="grad-curiosity" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#78350f', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#451a03', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Island base */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-curiosity)"
        />
        
        {/* Surface */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#f59e0b"
          opacity="0.6"
        />
        
        {/* Telescope */}
        <g transform="translate(75, 85)">
          <line x1="15" y1="25" x2="15" y2="15" stroke="#78350f" strokeWidth="2"/>
          <line x1="10" y1="25" x2="20" y2="25" stroke="#78350f" strokeWidth="1.5"/>
          <rect x="10" y="10" width="12" height="4" rx="1" fill="#92400e" transform="rotate(-30 16 12)"/>
          <circle cx="10" cy="9" r="2" fill="#3b82f6" opacity="0.6"/>
        </g>
        
        {/* Laboratory flask */}
        <g transform="translate(110, 95)">
          <path d="M 3 0 L 3 5 L 0 12 L 10 12 L 7 5 L 7 0 Z" fill="#3b82f6" opacity="0.4"/>
          <rect x="2" y="0" width="6" height="1" fill="#1e40af"/>
          <circle cx="5" cy="10" r="1.5" fill="#10b981" opacity="0.6"/>
        </g>
        
        {/* Question mark sculpture */}
        <g transform="translate(120, 82)">
          <path 
            d="M 5 0 Q 10 0 10 5 Q 10 8 7 9 L 7 11" 
            stroke="#f59e0b" 
            strokeWidth="3" 
            fill="none" 
            strokeLinecap="round"
          />
          <circle cx="7" cy="14" r="1.5" fill="#f59e0b"/>
        </g>
        
        {/* Compass */}
        <g transform="translate(95, 98)">
          <circle cx="5" cy="5" r="5" fill="#1f2937" opacity="0.8"/>
          <circle cx="5" cy="5" r="3" fill="#f5f5f5" opacity="0.9"/>
          <path d="M 5 2 L 6 5 L 5 8 L 4 5 Z" fill="#ef4444"/>
          <path d="M 5 8 L 4 5 L 5 2 L 6 5 Z" fill="#e5e5e5" opacity="0.8"/>
        </g>
        
        {/* Map/scroll */}
        <g transform="translate(58, 97)">
          <rect x="0" y="0" width="12" height="10" rx="1" fill="#fef3c7" opacity="0.9"/>
          <line x1="2" y1="2" x2="10" y2="2" stroke="#92400e" strokeWidth="0.5" opacity="0.5"/>
          <line x1="2" y1="4" x2="8" y2="4" stroke="#92400e" strokeWidth="0.5" opacity="0.5"/>
          <line x1="2" y1="6" x2="10" y2="6" stroke="#92400e" strokeWidth="0.5" opacity="0.5"/>
          <circle cx="4" cy="4" r="0.5" fill="#ef4444"/>
        </g>
        
        {/* Magnifying glass */}
        <g transform="translate(132, 102)">
          <circle cx="3" cy="3" r="3" stroke="#64748b" strokeWidth="1.5" fill="#60a5fa" opacity="0.3"/>
          <line x1="5" y1="5" x2="8" y2="8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      </svg>
    ),
    
    compassion: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="grad-compassion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#831843', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#500724', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="100" cy="150" rx="50" ry="8" fill="#000" opacity="0.2"/>
        
        {/* Island base */}
        <path
          d="M 60 110 Q 50 115 50 120 L 55 130 Q 60 135 70 133 L 130 133 Q 140 135 145 130 L 150 120 Q 150 115 140 110 Z"
          fill="url(#grad-compassion)"
        />
        
        {/* Surface - pink tint */}
        <path
          d="M 60 110 Q 50 112 52 115 L 148 115 Q 150 112 140 110 Z"
          fill="#f472b6"
          opacity="0.5"
        />
        
        {/* Central meditation pavilion */}
        <g transform="translate(85, 75)">
          {/* Pavilion roof - curved */}
          <path d="M 0 15 Q 15 10 30 15 L 28 17 Q 15 13 2 17 Z" fill="#ec4899" opacity="0.9"/>
          {/* Columns */}
          <rect x="3" y="15" width="2" height="15" fill="#f9a8d4" opacity="0.8"/>
          <rect x="25" y="15" width="2" height="15" fill="#f9a8d4" opacity="0.8"/>
          {/* Base */}
          <ellipse cx="15" cy="30" rx="12" ry="3" fill="#be185d" opacity="0.7"/>
        </g>
        
        {/* Meditation figure */}
        <g transform="translate(95, 88)">
          {/* Person sitting cross-legged */}
          <circle cx="5" cy="5" r="3" fill="#fbbf24" opacity="0.9"/>
          <ellipse cx="5" cy="10" rx="3" ry="4" fill="#f472b6" opacity="0.8"/>
          {/* Peaceful aura */}
          <circle cx="5" cy="5" r="8" stroke="#fde047" strokeWidth="0.5" fill="none" opacity="0.4"/>
          <circle cx="5" cy="5" r="10" stroke="#fde047" strokeWidth="0.3" fill="none" opacity="0.2"/>
        </g>
        
        {/* Heart fountain */}
        <g transform="translate(60, 95)">
          {/* Fountain base */}
          <ellipse cx="7" cy="12" rx="7" ry="2" fill="#9d174d" opacity="0.8"/>
          <rect x="5" y="8" width="4" height="4" fill="#be185d" opacity="0.7"/>
          {/* Heart on top */}
          <path 
            d="M 7 5 Q 7 3 8.5 3 Q 10 3 10 5 Q 10 3 11.5 3 Q 13 3 13 5 Q 13 8 10 10 Q 7 8 7 5 Z" 
            fill="#f472b6" 
            opacity="0.9"
          />
          {/* Water droplets */}
          <circle cx="4" cy="6" r="0.5" fill="#60a5fa" opacity="0.6"/>
          <circle cx="16" cy="7" r="0.5" fill="#60a5fa" opacity="0.6"/>
        </g>
        
        {/* Candles */}
        <g transform="translate(125, 100)">
          <rect x="0" y="5" width="2" height="5" fill="#fef3c7" opacity="0.9"/>
          <ellipse cx="1" cy="5" rx="1" ry="0.5" fill="#fbbf24"/>
          <path d="M 1 3 Q 0.5 4 1 5 Q 1.5 4 1 3 Z" fill="#fbbf24" opacity="0.8"/>
          
          <rect x="5" y="6" width="2" height="4" fill="#fef3c7" opacity="0.9"/>
          <ellipse cx="6" cy="6" rx="1" ry="0.5" fill="#fbbf24"/>
          <path d="M 6 4 Q 5.5 5 6 6 Q 6.5 5 6 4 Z" fill="#fbbf24" opacity="0.8"/>
        </g>
        
        {/* Cherry blossom tree */}
        <g transform="translate(130, 85)">
          {/* Trunk */}
          <rect x="3" y="10" width="2" height="15" fill="#78350f"/>
          {/* Branches */}
          <path d="M 4 15 Q 0 12 -2 10" stroke="#78350f" strokeWidth="1" fill="none"/>
          <path d="M 4 13 Q 8 10 10 8" stroke="#78350f" strokeWidth="1" fill="none"/>
          {/* Blossoms */}
          <circle cx="-2" cy="10" r="2" fill="#f9a8d4" opacity="0.8"/>
          <circle cx="0" cy="11" r="1.5" fill="#fbcfe8" opacity="0.8"/>
          <circle cx="10" cy="8" r="2" fill="#f9a8d4" opacity="0.8"/>
          <circle cx="8" cy="9" r="1.5" fill="#fbcfe8" opacity="0.8"/>
        </g>
        
        {/* Comfort blanket/cushion */}
        <g transform="translate(108, 102)">
          <ellipse cx="8" cy="5" rx="8" ry="3" fill="#f472b6" opacity="0.6"/>
          <ellipse cx="8" cy="4" rx="6" ry="2" fill="#fbcfe8" opacity="0.5"/>
        </g>
        
        {/* Love/kindness symbols floating */}
        <g opacity="0.6">
          <path d="M 65 90 Q 65 88 66 88 Q 67 88 67 90 Q 67 88 68 88 Q 69 88 69 90 Q 69 92 67 93 Q 65 92 65 90 Z" fill="#fbbf24"/>
          <path d="M 135 95 Q 135 93 136 93 Q 137 93 137 95 Q 137 93 138 93 Q 139 93 139 95 Q 139 97 137 98 Q 135 97 135 95 Z" fill="#fbbf24"/>
        </g>
      </svg>
    ),
  };

  return (
    <div className="relative w-full h-full">
      {/* Glow effect */}
      {glow && (
        <motion.div
          className="absolute inset-0 blur-2xl"
          style={{ background: color }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      
      {/* Island illustration */}
      <div className="relative z-10">
        {illustrations[type]}
      </div>
    </div>
  );
}