import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Check,
  Moon,
  Sun,
  Activity,
  Zap,
  UtensilsCrossed,
  Dumbbell,
  Trash2,
} from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import type { HealthCheckIn } from '../../types';
import { getDateKey } from '../../lib/time';

const TIME_ZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
];

export function BodyHealthIsland() {
  const navigate = useNavigate();
  const {
    progress,
    addHealthCheckIn,
    updateHealthCheckIn,
    deleteHealthCheckIn,
    updateRoutineSettings,
  } = useMindIslands();
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  const island = progress.islands.find(i => i.id === 'body');
  const routine = progress.routineSettings;
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get check-in for selected date
  const existingCheckIn = [...progress.healthCheckIns]
    .reverse()
    .find(c => c.date === selectedDate);

  // Get current month's dates
  const getCurrentMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const dates = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      dates.push(getDateKey(new Date(d)));
    }
    return dates;
  };

  const monthDates = getCurrentMonthDates();

  const getFormDataFromCheckIn = (checkIn?: HealthCheckIn): Partial<HealthCheckIn> => ({
    sleepTime: checkIn?.sleepTime || '',
    wakeTime: checkIn?.wakeTime || '',
    workoutCompleted: checkIn?.workoutCompleted || false,
    workoutType: checkIn?.workoutType || '',
    workoutDuration: checkIn?.workoutDuration || 0,
    workoutIntensity: checkIn?.workoutIntensity || 'moderate',
    energyLevel: checkIn?.energyLevel || 3,
    notes: checkIn?.notes || '',
  });

  // Check-in form state
  const [formData, setFormData] = useState<Partial<HealthCheckIn>>(() =>
    getFormDataFromCheckIn(existingCheckIn),
  );

  useEffect(() => {
    if (!showCheckInForm) return;
    setFormData(getFormDataFromCheckIn(existingCheckIn));
  }, [showCheckInForm, existingCheckIn?.id, selectedDate]);

  const handleSubmit = () => {
    const payload = {
      sleepTime: formData.sleepTime,
      wakeTime: formData.wakeTime,
      workoutCompleted: formData.workoutCompleted || false,
      workoutType: formData.workoutType,
      workoutDuration: formData.workoutDuration,
      workoutIntensity: formData.workoutIntensity,
      energyLevel: formData.energyLevel || 3,
      notes: formData.notes,
    };

    if (existingCheckIn) {
      updateHealthCheckIn(existingCheckIn.id, payload);
    } else {
      addHealthCheckIn({
        date: selectedDate,
        ...payload,
      });
    }
    setShowCheckInForm(false);
  };

  const handleDeleteCheckIn = () => {
    if (!existingCheckIn) return;
    if (!window.confirm('Delete this check-in?')) return;
    deleteHealthCheckIn(existingCheckIn.id);
    setShowCheckInForm(false);
  };

  const updateWorkoutDay = (
    dayOfWeek: number,
    patch: Partial<{ enabled: boolean; time: string; label: string }>,
  ) => {
    const next = routine.workoutSchedule.map((item) =>
      item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item,
    );
    updateRoutineSettings({ workoutSchedule: next });
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
              <p className="text-muted-foreground">Track your physical wellbeing and energy</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: island?.color }}>
              {island?.streak} day streak
            </div>
          </div>
        </motion.div>

        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm text-muted-foreground font-medium p-2">
                {day}
              </div>
            ))}
            
            {monthDates.map((date) => {
              const dateNum = new Date(date).getDate();
              const hasCheckIn = progress.healthCheckIns.some(c => c.date === date);
              const isSelected = date === selectedDate;
              const isToday = date === getDateKey();
              
              return (
                <motion.button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setShowCheckInForm(false);
                  }}
                  className={`aspect-square rounded-xl p-2 relative transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : hasCheckIn
                      ? 'bg-green-500/20 text-foreground border border-green-500/50'
                      : isToday
                      ? 'bg-white/5 text-foreground border border-white/20'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-lg font-medium">{dateNum}</div>
                  {hasCheckIn && (
                    <Check className="w-4 h-4 absolute bottom-1 right-1 text-green-500" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Check-in Details/Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium text-foreground">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            {!showCheckInForm && !existingCheckIn && (
              <Button
                onClick={() => setShowCheckInForm(true)}
                className="bg-primary hover:bg-primary/80"
              >
                Add Check-in
              </Button>
            )}
          </div>

          {existingCheckIn && !showCheckInForm ? (
            // Display existing check-in
            <div className="space-y-6" onDoubleClick={() => setShowCheckInForm(true)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                  <Moon className="w-6 h-6 text-[#6b98a2]" />
                  <div>
                    <div className="text-sm text-muted-foreground">Sleep</div>
                    <div className="text-lg text-foreground">
                      {existingCheckIn.sleepTime} - {existingCheckIn.wakeTime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-sm text-muted-foreground">Energy Level</div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded ${
                            i < existingCheckIn.energyLevel ? 'bg-yellow-400' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {existingCheckIn.workoutCompleted && (
                  <>
                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                      <Activity className="w-6 h-6 text-green-400" />
                      <div>
                        <div className="text-sm text-muted-foreground">Workout</div>
                        <div className="text-lg text-foreground">{existingCheckIn.workoutType}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                      <div className="w-6 h-6 flex items-center justify-center text-green-400 font-bold">
                        {existingCheckIn.workoutDuration}m
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Duration & Intensity</div>
                        <div className="text-lg text-foreground capitalize">
                          {existingCheckIn.workoutIntensity}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {existingCheckIn.notes && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-2">Notes</div>
                  <div className="text-foreground">{existingCheckIn.notes}</div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCheckInForm(true)}
                  variant="outline"
                  className="flex-1"
                >
                  Edit Check-in
                </Button>
                <Button
                  onClick={handleDeleteCheckIn}
                  variant="outline"
                  className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : showCheckInForm ? (
            // Check-in form
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Sleep Time
                  </label>
                  <input
                    type="time"
                    lang="en-GB"
                    value={formData.sleepTime}
                    onChange={(e) => setFormData({ ...formData, sleepTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Wake Time
                  </label>
                  <input
                    type="time"
                    lang="en-GB"
                    value={formData.wakeTime}
                    onChange={(e) => setFormData({ ...formData, wakeTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Energy Level
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData({ ...formData, energyLevel: level })}
                      className={`flex-1 py-3 rounded-xl transition-all ${
                        formData.energyLevel === level
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workoutCompleted}
                    onChange={(e) => setFormData({ ...formData, workoutCompleted: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-foreground">I worked out today</span>
                </label>

                {formData.workoutCompleted && (
                  <div className="space-y-4 pl-8 pt-2">
                    <input
                      type="text"
                      placeholder="Workout type (e.g., Running, Yoga)"
                      value={formData.workoutType}
                      onChange={(e) => setFormData({ ...formData, workoutType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Duration (minutes)"
                        value={formData.workoutDuration || ''}
                        onChange={(e) => setFormData({ ...formData, workoutDuration: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground"
                      />
                      
                      <select
                        value={formData.workoutIntensity}
                        onChange={(e) => setFormData({ ...formData, workoutIntensity: e.target.value as any })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground"
                      >
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="intense">Intense</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How are you feeling today?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-24"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCheckInForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-primary hover:bg-primary/80"
                >
                  Save Check-in
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No check-in for this day yet</p>
            </div>
          )}
        </motion.div>

        {/* Routine Settings - drives avatar real-time reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
        >
          <div className="mb-6">
            <h3 className="text-xl font-medium text-foreground">Routine Settings</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Avatar reminders are based on these defaults. You can personalize all trigger times.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Target Sleep / Wake
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    lang="en-GB"
                    value={routine.sleepTargetTime}
                    onChange={(e) => updateRoutineSettings({ sleepTargetTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground"
                  />
                  <input
                    type="time"
                    lang="en-GB"
                    value={routine.wakeTargetTime}
                    onChange={(e) => updateRoutineSettings({ wakeTargetTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  Meal Reminder Times
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Breakfast</p>
                    <input
                      type="time"
                      lang="en-GB"
                      value={routine.mealTimes.breakfast}
                      onChange={(e) =>
                        updateRoutineSettings({
                          mealTimes: { ...routine.mealTimes, breakfast: e.target.value },
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Lunch</p>
                    <input
                      type="time"
                      lang="en-GB"
                      value={routine.mealTimes.lunch}
                      onChange={(e) =>
                        updateRoutineSettings({
                          mealTimes: { ...routine.mealTimes, lunch: e.target.value },
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Dinner</p>
                    <input
                      type="time"
                      lang="en-GB"
                      value={routine.mealTimes.dinner}
                      onChange={(e) =>
                        updateRoutineSettings({
                          mealTimes: { ...routine.mealTimes, dinner: e.target.value },
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Time Zone</label>
                <select
                  value={routine.timeZone}
                  onChange={(e) => updateRoutineSettings({ timeZone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground"
                >
                  {TIME_ZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">
                  Reminder Lead Time (minutes before target)
                </label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={routine.reminderLeadMinutes}
                  onChange={(e) =>
                    updateRoutineSettings({
                      reminderLeadMinutes: Math.max(0, Math.min(180, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routine.avatarRemindersEnabled}
                  onChange={(e) => updateRoutineSettings({ avatarRemindersEnabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-foreground">Enable avatar real-time reminders</span>
              </label>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Weekly Workout Schedule
              </label>

              <div className="space-y-2">
                {weekDays.map((dayLabel, dayOfWeek) => {
                  const plan = routine.workoutSchedule.find((item) => item.dayOfWeek === dayOfWeek);
                  if (!plan) return null;
                  return (
                    <div key={dayLabel} className="grid grid-cols-[56px_1fr_100px] gap-2 items-center bg-white/5 rounded-xl p-2">
                      <span className="text-sm text-foreground">{dayLabel}</span>
                      <input
                        type="text"
                        value={plan.label || ''}
                        onChange={(e) => updateWorkoutDay(dayOfWeek, { label: e.target.value })}
                        placeholder="Workout plan (optional)"
                        className="w-full bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <input
                          type="time"
                          lang="en-GB"
                          value={plan.time}
                          onChange={(e) => updateWorkoutDay(dayOfWeek, { time: e.target.value })}
                          className="w-20 bg-transparent border border-white/10 rounded-lg px-1.5 py-1 text-sm text-foreground"
                        />
                        <input
                          type="checkbox"
                          checked={plan.enabled}
                          onChange={(e) => updateWorkoutDay(dayOfWeek, { enabled: e.target.checked })}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SceneShell>
  );
}
