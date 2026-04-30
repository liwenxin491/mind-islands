import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Target,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import { Progress } from '../../components/ui/progress';
import { getDateKey } from '../../lib/time';

export function LearningIsland() {
  const navigate = useNavigate();
  const {
    progress,
    addLearningGoal,
    updateLearningGoal,
    deleteLearningGoal,
    addLearningGoalCheckIn,
    addLearningDailyLog,
    updateLearningDailyLog,
    deleteLearningDailyLog,
  } = useMindIslands();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const island = progress.islands.find(i => i.id === 'learning');
  const today = getDateKey();
  const todayLog = [...progress.learningDailyLogs].reverse().find(l => l.date === today);
  const editingLog = editingLogId
    ? progress.learningDailyLogs.find((log) => log.id === editingLogId) || null
    : null;
  const activeLog = editingLog || todayLog;

  const [goalForm, setGoalForm] = useState({
    ultimateGoal: '',
    targetDate: '',
    checkInMode: 'fixed' as const,
    cadence: 'daily' as const,
    cadenceInterval: 1,
    progressCheckInThreshold: 25,
    targetValue: 5,
    unitLabel: 'sessions',
  });

  const getDailyLogForm = (source = activeLog) => ({
    focusedStudyMinutes: source?.focusedStudyMinutes || 0,
    whatILearned: source?.whatILearned || '',
    insight: source?.resources?.[0] || '',
  });

  const [dailyLogForm, setDailyLogForm] = useState(getDailyLogForm);

  useEffect(() => {
    if (!showDailyLog) return;
    setDailyLogForm(getDailyLogForm());
  }, [showDailyLog, activeLog?.id]);

  const openDailyLogEditor = (logId?: string) => {
    setEditingLogId(logId || null);
    setShowDailyLog(true);
  };

  const handleSaveGoal = () => {
    if (goalForm.ultimateGoal.trim()) {
      addLearningGoal({
        ultimateGoal: goalForm.ultimateGoal,
        targetDate: goalForm.targetDate || undefined,
        weeklyMilestones: [],
        checkInMode: goalForm.checkInMode,
        cadence: goalForm.cadence,
        cadenceInterval: goalForm.cadenceInterval,
        progressPercent: 0,
        progressCheckInThreshold: goalForm.progressCheckInThreshold,
        checkIns: [],
        targetValue: goalForm.targetValue,
        unitLabel: goalForm.unitLabel.trim() || undefined,
      });

      setGoalForm({
        ultimateGoal: '',
        targetDate: '',
        checkInMode: 'fixed',
        cadence: 'daily',
        cadenceInterval: 1,
        progressCheckInThreshold: 25,
        targetValue: 5,
        unitLabel: 'sessions',
      });
      setShowGoalForm(false);
    }
  };

  const handleSaveDailyLog = () => {
    const payload = {
      focusedStudyMinutes: dailyLogForm.focusedStudyMinutes,
      whatILearned: dailyLogForm.whatILearned,
      resources: dailyLogForm.insight ? [dailyLogForm.insight] : [],
    };
    const targetLog = editingLog || todayLog;
    if (targetLog) {
      updateLearningDailyLog(targetLog.id, payload);
    } else {
      addLearningDailyLog({
        date: today,
        ...payload,
      });
    }
    setShowDailyLog(false);
    setEditingLogId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteLog = (logId: string) => {
    if (!window.confirm('Delete this learning log?')) return;
    deleteLearningDailyLog(logId);
    if (editingLogId === logId) {
      setEditingLogId(null);
      setShowDailyLog(false);
    }
  };

  const getRecentLogs = () => {
    return progress.learningDailyLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  };

  const getCadenceLabel = (goal: (typeof progress.learningGoals)[number]) => {
    if (goal.cadence === 'daily') return goal.cadenceInterval === 1 ? 'Every day' : `Every ${goal.cadenceInterval} days`;
    if (goal.cadence === 'weekly') return goal.cadenceInterval === 1 ? 'Every week' : `Every ${goal.cadenceInterval} weeks`;
    return `Every ${goal.cadenceInterval} custom cycle(s)`;
  };

  const getNextThreshold = (goal: (typeof progress.learningGoals)[number]) => {
    const nextStep = (goal.checkIns.length + 1) * goal.progressCheckInThreshold;
    return Math.min(100, nextStep);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!window.confirm('Delete this learning goal?')) return;
    deleteLearningGoal(goalId);
    if (editingGoalId === goalId) setEditingGoalId(null);
  };

  return (
    <SceneShell>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-foreground hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-medium text-foreground flex items-center gap-3">
                <span className="text-4xl">{island?.icon}</span>
                {island?.name}
              </h1>
              <p className="text-muted-foreground">Build mastery through consistent progress</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: island?.color }}>
              {island?.streak} day streak
            </div>
          </div>
        </motion.div>

        {/* Goal System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#6b98a2]/12 to-[#7eaab3]/12 backdrop-blur-md border border-[#6b98a2]/20 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-foreground flex items-center gap-2">
              <Target className="w-6 h-6" />
              Goal System
            </h2>
            <Button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="bg-[#6b98a2]/20 hover:bg-[#6b98a2]/30"
            >
              Set Goal
            </Button>
          </div>

          {showGoalForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">What do you want to master?</label>
                <input
                  type="text"
                  placeholder="e.g., Master Python programming"
                  value={goalForm.ultimateGoal}
                  onChange={(e) => setGoalForm({ ...goalForm, ultimateGoal: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-lg"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGoalForm({ ...goalForm, checkInMode: 'fixed' })}
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        goalForm.checkInMode === 'fixed'
                          ? 'bg-[#6b98a2] text-white'
                          : 'bg-white/5 text-muted-foreground'
                      }`}
                    >
                      Fixed check-in
                    </button>
                    <button
                      onClick={() => setGoalForm({ ...goalForm, checkInMode: 'progress' })}
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        goalForm.checkInMode === 'progress'
                          ? 'bg-[#6b98a2] text-white'
                          : 'bg-white/5 text-muted-foreground'
                      }`}
                    >
                      % threshold
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Target unit
                  </label>
                  <input
                    type="text"
                    value={goalForm.unitLabel}
                    onChange={(e) => setGoalForm({ ...goalForm, unitLabel: e.target.value })}
                    placeholder="sessions"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Target amount
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goalForm.targetValue}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, targetValue: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                  />
                </div>
                {goalForm.checkInMode === 'fixed' ? (
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Cadence
                      </label>
                      <select
                        value={goalForm.cadence}
                        onChange={(e) =>
                          setGoalForm({
                            ...goalForm,
                            cadence: e.target.value as 'daily' | 'weekly' | 'custom',
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Every
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={goalForm.cadenceInterval}
                        onChange={(e) =>
                          setGoalForm({
                            ...goalForm,
                            cadenceInterval: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Check in every %
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={goalForm.progressCheckInThreshold}
                      onChange={(e) =>
                        setGoalForm({
                          ...goalForm,
                          progressCheckInThreshold: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Target completion (optional)</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowGoalForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveGoal} className="flex-1 bg-primary">
                  Create Goal
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {progress.learningGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Set a learning goal and decide when a check-in should count.</p>
                </div>
              ) : (
                progress.learningGoals.map((goal) => (
                  <div key={goal.id} className="bg-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl text-foreground">{goal.ultimateGoal}</h3>
                        <div className="text-sm text-muted-foreground">
                          {goal.checkInMode === 'fixed'
                            ? `Fixed mode · ${getCadenceLabel(goal)}`
                            : `Check in every ${goal.progressCheckInThreshold}% progress`}
                        </div>
                      </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{goal.checkIns.length} check-ins</div>
                      {goal.targetDate && <div>By {new Date(goal.targetDate).toLocaleDateString()}</div>}
                    </div>
                  </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setEditingGoalId(editingGoalId === goal.id ? null : goal.id)}
                        size="sm"
                        variant="outline"
                      >
                        {editingGoalId === goal.id ? 'Done editing' : 'Edit goal'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteGoal(goal.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>

                    {editingGoalId === goal.id && (
                      <div className="grid grid-cols-1 gap-3 rounded-xl bg-black/15 p-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            Goal
                          </label>
                          <input
                            type="text"
                            value={goal.ultimateGoal}
                            onChange={(e) =>
                              updateLearningGoal(goal.id, { ultimateGoal: e.target.value })
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            Mode
                          </label>
                          <select
                            value={goal.checkInMode}
                            onChange={(e) =>
                              updateLearningGoal(goal.id, {
                                checkInMode: e.target.value as 'fixed' | 'progress',
                              })
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                          >
                            <option value="fixed">Fixed check-in</option>
                            <option value="progress">% threshold</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            Target date
                          </label>
                          <input
                            type="date"
                            value={goal.targetDate || ''}
                            onChange={(e) =>
                              updateLearningGoal(goal.id, { targetDate: e.target.value || undefined })
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                          />
                        </div>
                        {goal.checkInMode === 'fixed' ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                Cadence
                              </label>
                              <select
                                value={goal.cadence}
                                onChange={(e) =>
                                  updateLearningGoal(goal.id, {
                                    cadence: e.target.value as 'daily' | 'weekly' | 'custom',
                                  })
                                }
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                Every
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={goal.cadenceInterval}
                                onChange={(e) =>
                                  updateLearningGoal(goal.id, {
                                    cadenceInterval: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                              Check in every %
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={goal.progressCheckInThreshold}
                              onChange={(e) =>
                                updateLearningGoal(goal.id, {
                                  progressCheckInThreshold: Math.min(
                                    100,
                                    Math.max(1, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Progress
                        </label>
                        <div className="flex items-center gap-3">
                          <Progress value={goal.progressPercent} className="h-3 bg-white/10" />
                          <span className="w-12 text-right text-sm text-foreground">
                            {Math.round(goal.progressPercent)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={goal.progressPercent}
                          onChange={(e) =>
                            updateLearningGoal(goal.id, { progressPercent: Number(e.target.value) })
                          }
                          className="w-full accent-[#6b98a2]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Target
                        </label>
                        <div className="grid grid-cols-[96px_1fr] gap-2">
                          <input
                            type="number"
                            min={1}
                            value={goal.targetValue || 1}
                            onChange={(e) =>
                              updateLearningGoal(goal.id, {
                                targetValue: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                          />
                          <input
                            type="text"
                            value={goal.unitLabel || ''}
                            onChange={(e) => updateLearningGoal(goal.id, { unitLabel: e.target.value })}
                            placeholder="sessions"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {goal.checkInMode === 'progress' ? (
                        <div className="text-muted-foreground">
                          Next check-in unlocks at {getNextThreshold(goal)}%
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Current rhythm: {getCadenceLabel(goal)}</div>
                      )}
                      <Button
                        onClick={() => addLearningGoalCheckIn(goal.id)}
                        size="sm"
                        className="bg-[#6b98a2] hover:bg-[#5a8790] text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Check in once
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* Today's Learning Session */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Today's Learning Session
            </h2>
            <Button
              onClick={() => {
                if (showDailyLog) {
                  setShowDailyLog(false);
                  setEditingLogId(null);
                } else {
                  openDailyLogEditor(todayLog?.id);
                }
              }}
              className="bg-primary hover:bg-primary/80"
            >
              {todayLog ? 'Edit Session' : 'Log Session'}
            </Button>
          </div>

          {showDailyLog && editingLog && (
            <div className="mb-4 text-xs text-muted-foreground">
              Editing log from{' '}
              {new Date(editingLog.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          )}

          {showDailyLog ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Focused study time (minutes)</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setDailyLogForm({ ...dailyLogForm, focusedStudyMinutes: minutes })}
                      className={`flex-1 py-3 rounded-xl transition-all ${
                        dailyLogForm.focusedStudyMinutes === minutes
                          ? 'bg-[#6b98a2] text-white'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={dailyLogForm.focusedStudyMinutes || ''}
                  onChange={(e) => setDailyLogForm({ ...dailyLogForm, focusedStudyMinutes: parseInt(e.target.value) || 0 })}
                  placeholder="Or enter custom minutes..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  What I learned today
                </label>
                <textarea
                  value={dailyLogForm.whatILearned}
                  onChange={(e) => setDailyLogForm({ ...dailyLogForm, whatILearned: e.target.value })}
                  placeholder="Describe what you learned in your own words..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  One key insight
                </label>
                <input
                  type="text"
                  value={dailyLogForm.insight}
                  onChange={(e) => setDailyLogForm({ ...dailyLogForm, insight: e.target.value })}
                  placeholder="Your biggest 'aha' moment..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDailyLog(false);
                    setEditingLogId(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveDailyLog} className="flex-1 bg-primary">
                  Save Session
                </Button>
              </div>
            </div>
          ) : todayLog ? (
            <div className="space-y-4" onDoubleClick={() => openDailyLogEditor(todayLog.id)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#6b98a2]/10 rounded-xl p-4 border border-[#6b98a2]/20">
                  <div className="text-sm text-muted-foreground mb-1">Study Time</div>
                  <div className="text-2xl font-bold text-[#6b98a2]">
                    {todayLog.focusedStudyMinutes} min
                  </div>
                </div>
              </div>
              
              {todayLog.whatILearned && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    What I learned
                  </div>
                  <div className="text-foreground">{todayLog.whatILearned}</div>
                </div>
              )}

              {todayLog.resources && todayLog.resources.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Key Insight
                  </div>
                  <div className="text-foreground">{todayLog.resources[0]}</div>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={() => openDailyLogEditor(todayLog.id)} variant="outline" className="flex-1">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteLog(todayLog.id)}
                  variant="outline"
                  className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No learning session logged today</p>
              <p className="text-sm">Track your study time and learnings to build momentum</p>
            </div>
          )}
        </motion.div>

        {/* Recent Progress */}
        {getRecentLogs().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-medium text-foreground mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {getRecentLogs().map((log) => (
                <div
                  key={log.id}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                  onDoubleClick={() => openDailyLogEditor(log.id)}
                >
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-foreground text-sm line-clamp-1">
                      {log.whatILearned || 'Learning session'}
                    </div>
                  </div>
                  <div className="text-[#6b98a2] font-medium">
                    {log.focusedStudyMinutes}m
                  </div>
                  <div className="ml-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDailyLogEditor(log.id);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLog(log.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Success Feedback */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-[#6b98a2] to-[#8bb3bc] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <div>
                  <div className="font-medium">Great work!</div>
                  <div className="text-sm opacity-90">Another step toward mastery</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneShell>
  );
}
