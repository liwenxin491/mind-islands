import { motion } from 'motion/react';
import { ArrowLeft, Calendar, TrendingUp, Sparkles, Brain } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { StreakDisplay } from '../components/StreakDisplay';
import { useMindIslands } from '../context/MindIslandsContext';
import { getDateKey } from '../lib/time';

export function Insights() {
  const navigate = useNavigate();
  const { progress } = useMindIslands();

  const totalCheckIns = progress.healthCheckIns?.length || 0;
  const totalStreak = progress.islands.reduce((sum, island) => sum + island.streak, 0);

  // Generate AI summary based on user's data
  const generateDailySummary = () => {
    const today = getDateKey();
    const todayActivities: string[] = [];
    
    // Check Body & Health
    const todayBodyCheck = progress.healthCheckIns?.find(c => c.date === today);
    if (todayBodyCheck) {
      todayActivities.push(`✅ Checked in on your body and health (energy: ${todayBodyCheck.energyLevel}/5)`);
    }
    
    // Check Work
    const todayWorkLog = progress.workDailyLogs?.find(l => l.date === today);
    if (todayWorkLog) {
      todayActivities.push(`💼 Logged work progress (stress: ${todayWorkLog.stressLevel}/5)`);
      if (todayWorkLog.todaysWin) {
        todayActivities.push(`🎉 Celebrated a win: "${todayWorkLog.todaysWin}"`);
      }
    }
    
    // Check Learning
    const todayLearning = progress.learningDailyLogs?.find(l => l.date === today);
    if (todayLearning) {
      todayActivities.push(`📚 Studied for ${todayLearning.focusedStudyMinutes} minutes`);
    }
    
    // Check Relationships
    const todayRelationship = progress.relationshipLogs?.find(l => l.date === today);
    if (todayRelationship && todayRelationship.connectedToday) {
      const person = todayRelationship.personName ? ` with ${todayRelationship.personName}` : '';
      todayActivities.push(`💝 Connected${person} (${todayRelationship.category})`);
    }
    
    // Check Curiosity
    const todayCuriosity = progress.curiosityLogs?.find(l => l.date === today);
    if (todayCuriosity) {
      todayActivities.push(`✨ Discovered something new: \"${todayCuriosity.newThingNoticed.substring(0, 50)}...\"`);
    }
    
    // Check Self-Compassion
    const todayCompassion = progress.compassionJournals?.find(j => j.date === today);
    if (todayCompassion) {
      todayActivities.push(`🌸 Practiced self-compassion through journaling`);
    }
    
    if (todayActivities.length === 0) {
      return "You haven't logged any activities today yet. This is a perfect time to check in with yourself and visit your islands! 🌙";
    }
    
    const activeIslandsCount = todayActivities.length;
    let summary = `Today you've nurtured ${activeIslandsCount} island${activeIslandsCount > 1 ? 's' : ''}:\n\n`;
    summary += todayActivities.join('\n');
    summary += `\n\n${activeIslandsCount >= 4 ? "You're doing amazing! 🌟" : activeIslandsCount >= 2 ? "Great progress! Keep it up! 💪" : "A good start! Every step counts! 🌱"}`;
    
    return summary;
  };

  const generateWeeklySummary = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyStats = {
      bodyCheckins: progress.healthCheckIns?.filter(c => new Date(c.date) >= weekAgo).length || 0,
      workLogs: progress.workDailyLogs?.filter(l => new Date(l.date) >= weekAgo).length || 0,
      learningMinutes: progress.learningDailyLogs
        ?.filter(l => new Date(l.date) >= weekAgo)
        .reduce((sum, l) => sum + l.focusedStudyMinutes, 0) || 0,
      connections: progress.relationshipLogs?.filter(l => new Date(l.date) >= weekAgo && l.connectedToday).length || 0,
      discoveries: progress.curiosityLogs?.filter(l => new Date(l.date) >= weekAgo).length || 0,
      reflections: progress.compassionJournals?.filter(j => new Date(j.date) >= weekAgo).length || 0,
    };
    
    const highlights: string[] = [];
    
    if (weeklyStats.bodyCheckins > 0) {
      highlights.push(`🏃 ${weeklyStats.bodyCheckins} body check-ins`);
    }
    if (weeklyStats.workLogs > 0) {
      highlights.push(`💼 ${weeklyStats.workLogs} work progress logs`);
    }
    if (weeklyStats.learningMinutes > 0) {
      highlights.push(`📚 ${weeklyStats.learningMinutes} minutes of focused learning`);
    }
    if (weeklyStats.connections > 0) {
      highlights.push(`💝 ${weeklyStats.connections} meaningful connections`);
    }
    if (weeklyStats.discoveries > 0) {
      highlights.push(`✨ ${weeklyStats.discoveries} new discoveries`);
    }
    if (weeklyStats.reflections > 0) {
      highlights.push(`🌸 ${weeklyStats.reflections} self-reflection sessions`);
    }
    
    if (highlights.length === 0) {
      return "This week is just beginning! Start by visiting any island that calls to you. 🌙";
    }
    
    let summary = "This Week's Journey:\n\n";
    summary += highlights.join('\n');
    
    const totalActivities = Object.values(weeklyStats).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0);
    summary += `\n\n${totalActivities >= 5 ? "You're maintaining a beautiful balance across your islands! 🌈" : totalActivities >= 3 ? "You're making steady progress! 🌟" : "Every journey starts with small steps! 🌱"}`;
    
    return summary;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4f] to-[#1a0f2e]">
      {/* Starry background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-12">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hub
          </Button>

          <h1 className="text-3xl md:text-4xl font-medium text-foreground mb-2">
            Your Journey
          </h1>
          <p className="text-muted-foreground">
            Reflecting on your self-care progress 🌟
          </p>
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-sm text-foreground">
              <span className="font-medium">What is Insights?</span> This page shows a summary of all your activities across all islands. 
              It tracks your streaks, check-ins, and progress over time - giving you an overview of your self-care journey without needing to visit each island individually.
            </p>
          </div>
        </motion.div>

        {/* Overview stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <StreakDisplay streak={totalStreak} label="Total Island Days" size="md" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-card/60 backdrop-blur-xl border border-border rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalCheckIns}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-card/60 backdrop-blur-xl border border-border rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {progress.islands.filter((i) => i.streak > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Islands</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* AI-Generated Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Today's Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Today's Summary</h3>
            </div>
            <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {generateDailySummary()}
            </div>
          </motion.div>

          {/* This Week's Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground">This Week's Summary</h3>
            </div>
            <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {generateWeeklySummary()}
            </div>
          </motion.div>
        </div>

        {/* Island Streaks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-medium text-foreground mb-6">
            Island Streaks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress.islands.map((island, index) => (
              <motion.div
                key={island.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-6 bg-card/40 backdrop-blur-xl border border-border rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{
                      background: `${island.color}20`,
                      boxShadow: `0 0 20px ${island.color}20`,
                    }}
                  >
                    {island.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground font-medium">{island.name}</h3>
                    <p className="text-xs text-muted-foreground">{island.description}</p>
                  </div>
                </div>
                <StreakDisplay streak={island.streak} label="Day Streak" size="sm" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Encouraging message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 p-6 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl text-center"
        >
          <p className="text-lg text-foreground mb-2">
            {totalCheckIns === 0 && "Your journey begins with a single step. You've got this! 🌱"}
            {totalCheckIns > 0 && totalCheckIns < 10 && "You're building beautiful habits! Keep nurturing your islands! 🌸"}
            {totalCheckIns >= 10 && totalCheckIns < 50 && "Your dedication is inspiring! Your islands are thriving! 🌟"}
            {totalCheckIns >= 50 && "You've created an incredible self-care practice! We're so proud of you! 🎉"}
          </p>
          <p className="text-sm text-muted-foreground">
            Remember: Every check-in is an act of self-love 💜
          </p>
        </motion.div>
      </div>
    </div>
  );
}
