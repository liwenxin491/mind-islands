import { motion } from 'motion/react';
import { ArrowLeft, Calendar, TrendingUp, Sparkles, Brain } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { StreakDisplay } from '../components/StreakDisplay';
import { useMindIslands } from '../context/MindIslandsContext';
import { getDateKey } from '../lib/time';
import { SceneShell } from '../components/SceneShell';

export function Insights() {
  const navigate = useNavigate();
  const { progress } = useMindIslands();

  const totalCheckIns = progress.healthCheckIns?.length || 0;
  const totalStreak = progress.islands.reduce((sum, island) => sum + island.streak, 0);

  const generateDailySummary = () => {
    const today = getDateKey();
    const todayActivities: string[] = [];

    const todayBodyCheck = progress.healthCheckIns?.find((c) => c.date === today);
    if (todayBodyCheck) {
      todayActivities.push(`Checked in on your body and health (energy: ${todayBodyCheck.energyLevel}/5)`);
    }

    const todayWorkLog = progress.workDailyLogs?.find((l) => l.date === today);
    if (todayWorkLog) {
      todayActivities.push(`Logged work progress (stress: ${todayWorkLog.stressLevel}/5)`);
      if (todayWorkLog.todaysWin) {
        todayActivities.push(`Celebrated a win: "${todayWorkLog.todaysWin}"`);
      }
    }

    const todayLearning = progress.learningDailyLogs?.find((l) => l.date === today);
    if (todayLearning) {
      todayActivities.push(`Studied for ${todayLearning.focusedStudyMinutes} minutes`);
    }

    const todayRelationship = progress.relationshipLogs?.find((l) => l.date === today);
    if (todayRelationship && todayRelationship.connectedToday) {
      const person = todayRelationship.personName ? ` with ${todayRelationship.personName}` : '';
      todayActivities.push(`Connected${person} (${todayRelationship.category})`);
    }

    const todayCuriosity = progress.curiosityLogs?.find((l) => l.date === today);
    if (todayCuriosity) {
      todayActivities.push(`Discovered something new: "${todayCuriosity.newThingNoticed.substring(0, 50)}..."`);
    }

    const todayCompassion = progress.compassionJournals?.find((j) => j.date === today);
    if (todayCompassion) {
      todayActivities.push('Practiced self-compassion through journaling');
    }

    if (todayActivities.length === 0) {
      return "You haven't logged any activities today yet. This is a perfect time to check in with yourself and visit your islands.";
    }

    const activeIslandsCount = todayActivities.length;
    let summary = `Today you've nurtured ${activeIslandsCount} island${activeIslandsCount > 1 ? 's' : ''}:\n\n`;
    summary += todayActivities.join('\n');
    summary += `\n\n${
      activeIslandsCount >= 4
        ? "You're doing amazing."
        : activeIslandsCount >= 2
          ? 'Great progress. Keep it up.'
          : 'A good start. Every step counts.'
    }`;

    return summary;
  };

  const generateWeeklySummary = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyStats = {
      bodyCheckins: progress.healthCheckIns?.filter((c) => new Date(c.date) >= weekAgo).length || 0,
      workLogs: progress.workDailyLogs?.filter((l) => new Date(l.date) >= weekAgo).length || 0,
      learningMinutes:
        progress.learningDailyLogs
          ?.filter((l) => new Date(l.date) >= weekAgo)
          .reduce((sum, l) => sum + l.focusedStudyMinutes, 0) || 0,
      connections: progress.relationshipLogs?.filter((l) => new Date(l.date) >= weekAgo && l.connectedToday).length || 0,
      discoveries: progress.curiosityLogs?.filter((l) => new Date(l.date) >= weekAgo).length || 0,
      reflections: progress.compassionJournals?.filter((j) => new Date(j.date) >= weekAgo).length || 0,
    };

    const highlights: string[] = [];
    if (weeklyStats.bodyCheckins > 0) highlights.push(`${weeklyStats.bodyCheckins} body check-ins`);
    if (weeklyStats.workLogs > 0) highlights.push(`${weeklyStats.workLogs} work progress logs`);
    if (weeklyStats.learningMinutes > 0) highlights.push(`${weeklyStats.learningMinutes} minutes of focused learning`);
    if (weeklyStats.connections > 0) highlights.push(`${weeklyStats.connections} meaningful connections`);
    if (weeklyStats.discoveries > 0) highlights.push(`${weeklyStats.discoveries} new discoveries`);
    if (weeklyStats.reflections > 0) highlights.push(`${weeklyStats.reflections} self-reflection sessions`);

    if (highlights.length === 0) {
      return 'This week is just beginning. Start by visiting any island that calls to you.';
    }

    let summary = "This week's journey:\n\n";
    summary += highlights.join('\n');

    const totalActivities = Object.values(weeklyStats).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0);
    summary += `\n\n${
      totalActivities >= 5
        ? "You're maintaining a beautiful balance across your islands."
        : totalActivities >= 3
          ? "You're making steady progress."
          : 'Every journey starts with small steps.'
    }`;

    return summary;
  };

  return (
    <SceneShell>
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-8 pt-6 text-slate-800">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6 rounded-[28px] border border-white/18 bg-[rgba(236,243,246,0.82)] p-5 shadow-[0_18px_48px_rgba(8,33,41,0.18)] backdrop-blur-xl"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 text-slate-500 hover:bg-white/35 hover:text-slate-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>

          <h1 className="mb-2 text-3xl font-medium text-slate-800">Your Journey</h1>
          <p className="text-slate-600">Reflecting on your self-care progress</p>
          <div className="mt-4 rounded-2xl border border-[#6b98a2]/18 bg-[rgba(107,152,162,0.10)] p-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium">What is Insights?</span> This page shows a summary of your activities across all islands.
              It helps you reflect on patterns, streaks, and progress without needing to visit each island one by one.
            </p>
          </div>
        </motion.div>

        <div className="mb-6 grid grid-cols-1 gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <StreakDisplay streak={totalStreak} label="Total Island Days" size="md" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/18 bg-[rgba(236,243,246,0.82)] p-5 shadow-[0_16px_44px_rgba(8,33,41,0.14)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b98a2]/20">
                <Calendar className="h-5 w-5 text-[#5d8690]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{totalCheckIns}</p>
                <p className="text-sm text-slate-500">Total Check-ins</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/18 bg-[rgba(236,243,246,0.82)] p-5 shadow-[0_16px_44px_rgba(8,33,41,0.14)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#86adb6]/20">
                <TrendingUp className="h-5 w-5 text-[#5d8690]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{progress.islands.filter((i) => i.streak > 0).length}</p>
                <p className="text-sm text-slate-500">Active Islands</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-[#6b98a2]/20 bg-[linear-gradient(180deg,rgba(107,152,162,0.16),rgba(139,179,188,0.08))] p-5 shadow-[0_16px_44px_rgba(8,33,41,0.12)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b98a2]/20">
                <Brain className="h-5 w-5 text-[#6b98a2]" />
              </div>
              <h3 className="text-lg font-medium text-slate-800">Today's Summary</h3>
            </div>
            <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{generateDailySummary()}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-[#86adb6]/20 bg-[linear-gradient(180deg,rgba(134,173,182,0.16),rgba(107,152,162,0.08))] p-5 shadow-[0_16px_44px_rgba(8,33,41,0.12)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#86adb6]/20">
                <Sparkles className="h-5 w-5 text-[#5d8690]" />
              </div>
              <h3 className="text-lg font-medium text-slate-800">This Week's Summary</h3>
            </div>
            <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{generateWeeklySummary()}</div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-2">
          <div className="mb-4 px-1">
            <h2 className="inline-flex rounded-2xl bg-[rgba(236,243,246,0.72)] px-4 py-2 text-2xl font-semibold text-slate-800 shadow-[0_10px_24px_rgba(8,33,41,0.12)] backdrop-blur-md">
              Island Streaks
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {progress.islands.map((island, index) => (
              <motion.div
                key={island.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="rounded-2xl border border-white/18 bg-[rgba(236,243,246,0.82)] p-5 shadow-[0_16px_44px_rgba(8,33,41,0.14)] backdrop-blur-xl"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                    style={{
                      background: `${island.color}20`,
                      boxShadow: `0 0 20px ${island.color}20`,
                    }}
                  >
                    {island.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-800">{island.name}</h3>
                    <p className="text-xs text-slate-500">{island.description}</p>
                  </div>
                </div>
                <StreakDisplay streak={island.streak} label="Day Streak" size="sm" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 rounded-2xl border border-[#6b98a2]/20 bg-[linear-gradient(180deg,rgba(107,152,162,0.18),rgba(139,179,188,0.08))] p-5 text-center shadow-[0_16px_44px_rgba(8,33,41,0.12)]"
        >
          <p className="mb-2 text-lg text-slate-800">
            {totalCheckIns === 0 && "Your journey begins with a single step. You've got this."}
            {totalCheckIns > 0 && totalCheckIns < 10 && "You're building beautiful habits. Keep nurturing your islands."}
            {totalCheckIns >= 10 && totalCheckIns < 50 && "Your dedication is inspiring. Your islands are thriving."}
            {totalCheckIns >= 50 && "You've created an incredible self-care practice. We're so proud of you."}
          </p>
          <p className="text-sm text-slate-600">Remember: Every check-in is an act of self-love.</p>
        </motion.div>
      </div>
    </SceneShell>
  );
}
