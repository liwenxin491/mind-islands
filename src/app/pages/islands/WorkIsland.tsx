import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Target, TrendingUp, Heart, Trash2, CheckCircle2 } from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import { Progress } from '../../components/ui/progress';
import type { WorkStage, WorkItem } from '../../types';
import { getDateKey } from '../../lib/time';

export function WorkIsland() {
  const navigate = useNavigate();
  const {
    progress,
    addWorkItem,
    updateWorkItem,
    addWorkDailyLog,
    updateWorkDailyLog,
    deleteWorkDailyLog,
    addWorkGoal,
    updateWorkGoal,
    deleteWorkGoal,
    addWorkGoalCheckIn,
  } = useMindIslands();
  const [showNewItem, setShowNewItem] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemStage, setNewItemStage] = useState<WorkStage>('planned');

  const island = progress.islands.find(i => i.id === 'work');
  const today = getDateKey();
  const todayLog = [...progress.workDailyLogs].reverse().find(l => l.date === today);

  const stages: { key: WorkStage; label: string; color: string }[] = [
    { key: 'planned', label: 'Planned', color: '#64748b' },
    { key: 'applied', label: 'Applied', color: '#3b82f6' },
    { key: 'waiting', label: 'Waiting', color: '#f59e0b' },
    { key: 'interview', label: 'Interview', color: '#a855f7' },
    { key: 'outcome', label: 'Outcome', color: '#10b981' },
  ];

  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      addWorkItem({
        title: newItemTitle,
        stage: newItemStage,
      });
      setNewItemTitle('');
      setShowNewItem(false);
    }
  };

  const getDailyLogForm = () => ({
    progressStep: todayLog?.progressStep || '',
    stressLevel: todayLog?.stressLevel || 3,
    todaysWin: todayLog?.todaysWin || '',
  });

  const [dailyLogForm, setDailyLogForm] = useState(getDailyLogForm);

  useEffect(() => {
    if (!showDailyLog) return;
    setDailyLogForm(getDailyLogForm());
  }, [showDailyLog, todayLog?.id]);

  const handleSaveDailyLog = () => {
    if (todayLog) {
      updateWorkDailyLog(todayLog.id, dailyLogForm);
    } else {
      addWorkDailyLog({
        date: today,
        ...dailyLogForm,
      });
    }
    setShowDailyLog(false);
  };

  const handleDeleteTodayLog = () => {
    if (!todayLog) return;
    if (!window.confirm('Delete this work log?')) return;
    deleteWorkDailyLog(todayLog.id);
    setShowDailyLog(false);
  };

  const [goalForm, setGoalForm] = useState({
    text: '',
    targetDate: '',
    checkInMode: 'fixed' as const,
    cadence: 'daily' as const,
    cadenceInterval: 1,
    progressCheckInThreshold: 25,
    targetValue: 10,
    unitLabel: 'applications',
  });

  const handleSaveGoal = () => {
    if (goalForm.text.trim()) {
      addWorkGoal({
        text: goalForm.text,
        targetDate: goalForm.targetDate || undefined,
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
        text: '',
        targetDate: '',
        checkInMode: 'fixed',
        cadence: 'daily',
        cadenceInterval: 1,
        progressCheckInThreshold: 25,
        targetValue: 10,
        unitLabel: 'applications',
      });
      setShowGoalForm(false);
    }
  };

  const getCadenceLabel = (goal: (typeof progress.workGoals)[number]) => {
    if (goal.cadence === 'daily') return goal.cadenceInterval === 1 ? 'Every day' : `Every ${goal.cadenceInterval} days`;
    if (goal.cadence === 'weekly') return goal.cadenceInterval === 1 ? 'Every week' : `Every ${goal.cadenceInterval} weeks`;
    return `Every ${goal.cadenceInterval} check-in cycle(s)`;
  };

  const getNextThreshold = (goal: (typeof progress.workGoals)[number]) => {
    const nextStep = (goal.checkIns.length + 1) * goal.progressCheckInThreshold;
    return Math.min(100, nextStep);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!window.confirm('Delete this work goal?')) return;
    deleteWorkGoal(goalId);
    if (editingGoalId === goalId) setEditingGoalId(null);
  };

  return (
    <SceneShell>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
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
              <p className="text-muted-foreground">Track your career progress and wins</p>
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
          className="bg-gradient-to-r from-[#6b98a2]/12 to-[#8bb3bc]/12 backdrop-blur-md border border-[#6b98a2]/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
              <Target className="w-5 h-5" />
              Goal System
            </h2>
            <Button
              onClick={() => setShowGoalForm(!showGoalForm)}
              size="sm"
              className="bg-blue-500/20 hover:bg-blue-500/30"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showGoalForm && (
            <div className="mb-4 space-y-4 bg-black/20 rounded-xl p-4">
              <input
                type="text"
                placeholder="e.g., Apply to 10 companies every day"
                value={goalForm.text}
                onChange={(e) => setGoalForm({ ...goalForm, text: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground"
              />
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
                    placeholder="applications"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground"
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
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
                />
                <Button onClick={handleSaveGoal} size="sm" className="bg-primary">
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {progress.workGoals.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Set a work goal, choose how often it should count as a check-in, and drag its progress yourself.
              </p>
            ) : (
              progress.workGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white/5 rounded-2xl p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-blue-400 mt-1" />
                      <div>
                        <div className="text-foreground font-medium">{goal.text}</div>
                        <div className="text-sm text-muted-foreground">
                          {goal.checkInMode === 'fixed'
                            ? `Fixed mode · ${getCadenceLabel(goal)}`
                            : `Check in every ${goal.progressCheckInThreshold}% progress`}
                        </div>
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
                          value={goal.text}
                          onChange={(e) => updateWorkGoal(goal.id, { text: e.target.value })}
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
                            updateWorkGoal(goal.id, {
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
                          onChange={(e) => updateWorkGoal(goal.id, { targetDate: e.target.value || undefined })}
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
                                updateWorkGoal(goal.id, {
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
                                updateWorkGoal(goal.id, {
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
                              updateWorkGoal(goal.id, {
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
                          updateWorkGoal(goal.id, { progressPercent: Number(e.target.value) })
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
                            updateWorkGoal(goal.id, {
                              targetValue: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                        />
                        <input
                          type="text"
                          value={goal.unitLabel || ''}
                          onChange={(e) => updateWorkGoal(goal.id, { unitLabel: e.target.value })}
                          placeholder="applications"
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
                      onClick={() => addWorkGoalCheckIn(goal.id)}
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
        </motion.div>

        {/* Today's Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Today's Progress
            </h2>
            <Button
              onClick={() => setShowDailyLog(!showDailyLog)}
              size="sm"
              className="bg-primary/20 hover:bg-primary/30"
            >
              {todayLog ? 'Edit' : 'Log Today'}
            </Button>
          </div>

          {showDailyLog ? (
            <div className="space-y-4" onDoubleClick={() => setShowDailyLog(true)}>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">What progress did you make?</label>
                <input
                  type="text"
                  placeholder="e.g., Applied to 3 positions"
                  value={dailyLogForm.progressStep}
                  onChange={(e) => setDailyLogForm({ ...dailyLogForm, progressStep: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Stress Level</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDailyLogForm({ ...dailyLogForm, stressLevel: level })}
                      className={`flex-1 py-3 rounded-xl transition-all ${
                        dailyLogForm.stressLevel === level
                          ? 'bg-orange-400 text-black'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Today's Win
                </label>
                <textarea
                  placeholder="Celebrate something you did today..."
                  value={dailyLogForm.todaysWin}
                  onChange={(e) => setDailyLogForm({ ...dailyLogForm, todaysWin: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-20"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowDailyLog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveDailyLog} className="flex-1 bg-primary">
                  Save
                </Button>
              </div>
            </div>
          ) : todayLog ? (
            <div className="space-y-4">
              {todayLog.progressStep && (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Progress</div>
                  <div className="text-foreground">{todayLog.progressStep}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Stress Level</div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded ${
                          i < todayLog.stressLevel ? 'bg-orange-400' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {todayLog.todaysWin && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      Today's Win
                    </div>
                    <div className="text-foreground">{todayLog.todaysWin}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowDailyLog(true)} variant="outline" className="flex-1">
                  Edit Log
                </Button>
                <Button
                  onClick={handleDeleteTodayLog}
                  variant="outline"
                  className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">Log your progress for today</p>
          )}
        </motion.div>

        {/* Pipeline Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-foreground">Pipeline</h2>
            <Button
              onClick={() => setShowNewItem(!showNewItem)}
              className="bg-primary hover:bg-primary/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {showNewItem && (
            <div className="mb-6 space-y-3 bg-white/5 rounded-xl p-4">
              <input
                type="text"
                placeholder="Job title or opportunity..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={newItemStage}
                  onChange={(e) => setNewItemStage(e.target.value as WorkStage)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground"
                >
                  {stages.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddItem} size="sm">
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Pipeline Columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {stages.map((stage) => {
              const items = progress.workItems.filter(item => item.stage === stage.key);
              
              return (
                <div key={stage.key} className="space-y-3">
                  <div 
                    className="text-sm font-medium px-3 py-2 rounded-lg"
                    style={{ backgroundColor: stage.color + '20', color: stage.color }}
                  >
                    {stage.label} ({items.length})
                  </div>
                  
                  <div className="space-y-2 min-h-32">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-move hover:bg-white/10 transition-colors"
                      >
                        <div className="text-sm text-foreground mb-2">{item.title}</div>
                        <div className="flex gap-1">
                          {stages.map((s) => (
                            <button
                              key={s.key}
                              onClick={() => updateWorkItem(item.id, { stage: s.key })}
                              className={`flex-1 h-1 rounded transition-all ${
                                s.key === item.stage ? 'opacity-100' : 'opacity-20 hover:opacity-50'
                              }`}
                              style={{ backgroundColor: s.color }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </SceneShell>
  );
}
