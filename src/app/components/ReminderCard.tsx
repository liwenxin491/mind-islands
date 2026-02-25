import { motion } from 'motion/react';
import { Bell, Calendar, MapPin } from 'lucide-react';
import type { Reminder } from '../types';

interface ReminderCardProps {
  reminder: Reminder;
  onDismiss?: () => void;
}

export function ReminderCard({ reminder, onDismiss }: ReminderCardProps) {
  const islandColors: Record<string, string> = {
    body: '#10b981',
    work: '#3b82f6',
    learning: '#a855f7',
    relationships: '#ec4899',
    new: '#f59e0b',
  };

  const color = reminder.islandId ? islandColors[reminder.islandId] : '#9b87f5';
  const daysUntil = Math.ceil(
    (new Date(reminder.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border overflow-hidden group hover:border-primary/50 transition-colors"
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color }}
      />

      {/* Glow on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity"
        style={{ background: `${color}20` }}
      />

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <motion.div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20` }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Bell className="w-5 h-5" style={{ color }} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1">{reminder.text}</p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(reminder.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            
            {daysUntil >= 0 && (
              <div className="flex items-center gap-1">
                {daysUntil === 0 ? (
                  <span className="text-accent font-medium">Today!</span>
                ) : daysUntil === 1 ? (
                  <span className="text-secondary font-medium">Tomorrow</span>
                ) : (
                  <span>{daysUntil} days</span>
                )}
              </div>
            )}

            {reminder.islandId && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="capitalize">{reminder.islandId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Character reminder avatar */}
        <motion.div
          className="text-2xl"
          animate={{
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          🦉
        </motion.div>
      </div>

      {/* Urgency indicator */}
      {daysUntil <= 1 && daysUntil >= 0 && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}
