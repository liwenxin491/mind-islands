import { motion } from 'motion/react';
import { TrendingUp, Award, Heart, Sparkles } from 'lucide-react';
import { useMindIslands } from '../context/MindIslandsContext';

export function WeeklySummary() {
  const { progress } = useMindIslands();

  // Calculate weekly stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weeklyCheckIns = progress.checkIns.filter(
    (checkIn) => new Date(checkIn.date) >= weekAgo
  );

  const totalCheckIns = weeklyCheckIns.length;
  const avgMood = weeklyCheckIns.length > 0
    ? weeklyCheckIns.reduce((sum, c) => sum + c.mood, 0) / weeklyCheckIns.length
    : 0;

  const completedTodos = progress.todos.filter((t) => t.completed).length;
  const activeStreaks = progress.islands.filter((i) => i.streak > 0).length;

  const achievements = [
    {
      icon: <Heart className="w-6 h-6" />,
      label: 'Check-ins',
      value: totalCheckIns,
      color: '#ec4899',
    },
    {
      icon: <Award className="w-6 h-6" />,
      label: 'Active Streaks',
      value: activeStreaks,
      color: '#fbbf24',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Avg Mood',
      value: avgMood.toFixed(1),
      color: '#9b87f5',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-foreground mb-1">
            Weekly Summary
          </h2>
          <p className="text-sm text-muted-foreground">
            {weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Sparkles className="w-8 h-8 text-accent" />
        </motion.div>
      </div>

      {/* Achievement cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative p-4 rounded-xl bg-muted/30 border border-border overflow-hidden group hover:border-primary/50 transition-colors"
          >
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity"
              style={{ background: `${achievement.color}20` }}
            />

            <div className="relative flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${achievement.color}20`, color: achievement.color }}
              >
                {achievement.icon}
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {achievement.value}
                </p>
                <p className="text-sm text-muted-foreground">{achievement.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Encouraging message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-primary/10 border border-primary/20"
      >
        <p className="text-foreground text-center">
          {totalCheckIns === 0 && "Let's start building healthy habits together! 🌱"}
          {totalCheckIns > 0 && totalCheckIns < 3 && "You're taking the first steps! Keep it up! 🌟"}
          {totalCheckIns >= 3 && totalCheckIns < 7 && "Great consistency! You're building momentum! 💫"}
          {totalCheckIns >= 7 && "Incredible dedication! You're truly caring for yourself! 🎉"}
        </p>
      </motion.div>

      {/* Island breakdown */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Island Activity
        </h3>
        {progress.islands.map((island, index) => {
          const islandCheckIns = weeklyCheckIns.filter(
            (c) => c.islandId === island.id
          ).length;

          return (
            <motion.div
              key={island.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{island.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{island.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {islandCheckIns} check-ins
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: island.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(islandCheckIns / (totalCheckIns || 1)) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.05 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
