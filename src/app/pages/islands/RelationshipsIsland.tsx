import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Heart, MessageCircle, Phone, Users, Sparkles, Check, X, Pencil, Trash2 } from 'lucide-react';
import { useMindIslands } from '../../context/MindIslandsContext';
import { Button } from '../../components/ui/button';
import { SceneShell } from '../../components/SceneShell';
import type { RelationshipCategory } from '../../types';
import { getDateKey } from '../../lib/time';

export function RelationshipsIsland() {
  const navigate = useNavigate();
  const { progress, addRelationshipLog, updateRelationshipLog, deleteRelationshipLog } = useMindIslands();
  const [selectedCategory, setSelectedCategory] = useState<RelationshipCategory['id'] | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const island = progress.islands.find(i => i.id === 'relationships');
  const today = getDateKey();

  // Category definitions
  const categories: RelationshipCategory[] = [
    {
      id: 'friendship',
      name: 'Friendship',
      icon: '🤝',
      color: '#f59e0b',
      description: 'Friends and close companions',
    },
    {
      id: 'family',
      name: 'Family',
      icon: '🏡',
      color: '#10b981',
      description: 'Family members and relatives',
    },
    {
      id: 'partner',
      name: 'Partner / Intimacy',
      icon: '💕',
      color: '#ec4899',
      description: 'Romantic relationships',
    },
    {
      id: 'colleagues',
      name: 'Colleagues',
      icon: '💼',
      color: '#3b82f6',
      description: 'Work and professional connections',
    },
    {
      id: 'other',
      name: 'Other',
      icon: '✨',
      color: '#a855f7',
      description: 'Other meaningful connections',
    },
  ];

  const [logForm, setLogForm] = useState({
    connectedToday: true,
    interactionType: 'message' as 'message' | 'call' | 'in-person',
    personName: '',
    emotionalResult: 3,
    momentNote: '',
    gratitudeNote: '',
  });

  const resetForm = () => {
    setLogForm({
      connectedToday: true,
      interactionType: 'message',
      personName: '',
      emotionalResult: 3,
      momentNote: '',
      gratitudeNote: '',
    });
  };

  const openCategoryForm = (categoryId: RelationshipCategory['id']) => {
    setSelectedCategory(categoryId);
    setEditingLogId(null);
    resetForm();
    setShowLogForm(true);
  };

  const openEditLog = (logId: string) => {
    const log = progress.relationshipLogs.find((item) => item.id === logId);
    if (!log) return;
    setSelectedCategory(log.category);
    setEditingLogId(logId);
    setLogForm({
      connectedToday: log.connectedToday,
      interactionType: log.interactionType || 'message',
      personName: log.personName || '',
      emotionalResult: log.emotionalResult || 3,
      momentNote: log.momentNote || '',
      gratitudeNote: log.gratitudeNote || '',
    });
    setShowLogForm(true);
  };

  const handleSaveLog = () => {
    if (!selectedCategory) return;

    const payload = {
      category: selectedCategory,
      connectedToday: logForm.connectedToday,
      interactionType: logForm.connectedToday ? logForm.interactionType : undefined,
      personName: logForm.connectedToday ? logForm.personName : undefined,
      emotionalResult: logForm.emotionalResult,
      momentNote: logForm.momentNote,
      gratitudeNote: logForm.gratitudeNote,
    };

    if (editingLogId) {
      updateRelationshipLog(editingLogId, payload);
    } else {
      addRelationshipLog({
        date: today,
        ...payload,
      });
    }

    setShowLogForm(false);
    setSelectedCategory(null);
    setEditingLogId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    resetForm();
  };

  const handleDeleteLog = (logId: string) => {
    if (!window.confirm('Delete this relationship log?')) return;
    deleteRelationshipLog(logId);
    if (editingLogId === logId) {
      setEditingLogId(null);
      setShowLogForm(false);
      setSelectedCategory(null);
      resetForm();
    }
  };

  const getTodayLogsByCategory = () => {
    const todayLogs = progress.relationshipLogs.filter(l => l.date === today);
    const byCategory: Record<string, typeof todayLogs> = {};
    categories.forEach(cat => {
      byCategory[cat.id] = todayLogs.filter(l => l.category === cat.id);
    });
    return byCategory;
  };

  const getWeeklyStats = (categoryId: RelationshipCategory['id']) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const categoryLogs = progress.relationshipLogs.filter(
      l => l.category === categoryId && new Date(l.date) >= weekAgo
    );
    
    const connections = categoryLogs.filter(l => l.connectedToday).length;
    const avgEmotion = categoryLogs.length > 0
      ? categoryLogs.reduce((sum, l) => sum + l.emotionalResult, 0) / categoryLogs.length
      : 0;
    
    return { connections, avgEmotion: Math.round(avgEmotion * 10) / 10 };
  };

  const todayLogsByCategory = getTodayLogsByCategory();
  const interactionTypes = [
    { value: 'message', label: 'Message', icon: MessageCircle, color: '#3b82f6' },
    { value: 'call', label: 'Call', icon: Phone, color: '#10b981' },
    { value: 'in-person', label: 'In Person', icon: Users, color: '#f59e0b' },
  ];

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
              <p className="text-muted-foreground">Nurture meaningful connections, one category at a time</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: island?.color }}>
              {island?.streak} day streak
            </div>
          </div>
        </motion.div>

        {/* Gentle Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#8bb3bc]/12 to-[#6b98a2]/12 backdrop-blur-md border border-[#8bb3bc]/20 rounded-2xl p-4"
        >
          <p className="text-sm text-foreground/90 text-center">
            💝 You don't need to fill every category daily. <span className="font-medium">One meaningful connection is wonderful.</span>
          </p>
        </motion.div>

        {/* Category Selection View */}
        {!selectedCategory && !showLogForm && (
          <>
            {/* Category Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {categories.map((category, index) => {
                const todayLogs = todayLogsByCategory[category.id];
                const hasLog = todayLogs && todayLogs.length > 0;
                const weeklyStats = getWeeklyStats(category.id);
                
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openCategoryForm(category.id)}
                    className="relative bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-left transition-all hover:border-white/20 group"
                    style={{
                      borderColor: hasLog ? category.color + '40' : undefined,
                      background: hasLog
                        ? `linear-gradient(135deg, ${category.color}10, ${category.color}05)`
                        : undefined,
                    }}
                  >
                    {/* Completion Badge */}
                    {hasLog && (
                      <div
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: category.color }}
                      >
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Category Icon & Title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: category.color + '20',
                          boxShadow: hasLog ? `0 0 20px ${category.color}40` : undefined,
                        }}
                      >
                        {category.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-foreground">{category.name}</h3>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    {/* Weekly Stats */}
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">This week</span>
                        <span className="text-foreground font-medium">
                          {weeklyStats.connections} connection{weeklyStats.connections !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {weeklyStats.avgEmotion > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Warmth</span>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-6 h-1.5 rounded-full transition-all"
                                style={{
                                  backgroundColor: i < weeklyStats.avgEmotion ? category.color : '#ffffff20',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Today's Preview */}
                    {hasLog && todayLogs[0].connectedToday && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                          <Heart className="w-4 h-4" style={{ color: category.color }} />
                          <span>Logged today</span>
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Recent Activity Summary */}
            {progress.relationshipLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-xl font-medium text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Recent Connections
                </h2>
                <div className="space-y-2">
                  {progress.relationshipLogs
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((log) => {
                      const category = categories.find(c => c.id === log.category);
                      if (!category) return null;
                      
                      return (
                        <div
                          key={log.id}
                          className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer"
                          onDoubleClick={() => openEditLog(log.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ backgroundColor: category.color + '20' }}
                            >
                              {category.icon}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground">
                                {category.name}
                                {log.personName && ` • ${log.personName}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.date).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {log.momentNote && ` • ${log.momentNote.substring(0, 30)}...`}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-2 h-6 rounded"
                                style={{
                                  backgroundColor: i < log.emotionalResult ? category.color : '#ffffff20',
                                }}
                              />
                            ))}
                          </div>
                          <div className="ml-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditLog(log.id);
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
                      );
                    })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Log Form View */}
        {selectedCategory && showLogForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            {(() => {
              const category = categories.find(c => c.id === selectedCategory);
              if (!category) return null;

              return (
                <>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h2 className="text-2xl font-medium text-foreground">{category.name}</h2>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setShowLogForm(false);
                        setSelectedCategory(null);
                        setEditingLogId(null);
                        resetForm();
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {editingLogId && (
                    <div className="mb-4 text-xs text-muted-foreground">
                      Editing an existing connection log. Changes will update everywhere.
                    </div>
                  )}

                  {/* Log Form */}
                  <div className="space-y-6">
                    {/* Did I interact? */}
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">Did you connect in this category today?</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setLogForm({ ...logForm, connectedToday: true })}
                          className={`py-4 rounded-xl transition-all font-medium ${
                            logForm.connectedToday
                              ? 'text-white border-2'
                              : 'bg-white/5 text-muted-foreground hover:bg-white/10 border-2 border-transparent'
                          }`}
                          style={{
                            backgroundColor: logForm.connectedToday ? category.color : undefined,
                            borderColor: logForm.connectedToday ? category.color : undefined,
                          }}
                        >
                          <Heart className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-sm">Yes, I did!</div>
                        </button>
                        <button
                          onClick={() => setLogForm({ ...logForm, connectedToday: false })}
                          className={`py-4 rounded-xl transition-all font-medium ${
                            !logForm.connectedToday
                              ? 'bg-gray-500 text-white border-2 border-gray-500'
                              : 'bg-white/5 text-muted-foreground hover:bg-white/10 border-2 border-transparent'
                          }`}
                        >
                          <div className="text-sm">Not today</div>
                          <div className="text-xs opacity-75 mt-1">That's okay</div>
                        </button>
                      </div>
                    </div>

                    {logForm.connectedToday && (
                      <>
                        {/* Interaction Type */}
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground">How did you connect?</label>
                          <div className="grid grid-cols-3 gap-3">
                            {interactionTypes.map((type) => {
                              const Icon = type.icon;
                              return (
                                <button
                                  key={type.value}
                                  onClick={() => setLogForm({ ...logForm, interactionType: type.value as any })}
                                  className={`py-4 px-3 rounded-xl transition-all ${
                                    logForm.interactionType === type.value
                                      ? 'border-2'
                                      : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                                  }`}
                                  style={{
                                    backgroundColor: logForm.interactionType === type.value ? type.color + '20' : undefined,
                                    borderColor: logForm.interactionType === type.value ? type.color : undefined,
                                  }}
                                >
                                  <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: type.color }} />
                                  <div className="text-sm text-foreground">{type.label}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Person Name */}
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Who did you connect with? (optional)</label>
                          <input
                            type="text"
                            value={logForm.personName}
                            onChange={(e) => setLogForm({ ...logForm, personName: e.target.value })}
                            placeholder="Their name..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/30"
                          />
                        </div>

                        {/* One-line moment note */}
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">What happened? (optional, one line)</label>
                          <input
                            type="text"
                            value={logForm.momentNote}
                            onChange={(e) => setLogForm({ ...logForm, momentNote: e.target.value })}
                            placeholder="e.g., Had coffee and caught up..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/30"
                          />
                        </div>
                      </>
                    )}

                    {/* Emotional Result */}
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        How do you feel {logForm.connectedToday ? 'after this interaction' : 'about this category today'}?
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => setLogForm({ ...logForm, emotionalResult: level })}
                            className={`flex-1 py-4 rounded-xl transition-all font-medium text-lg ${
                              logForm.emotionalResult === level
                                ? 'text-white border-2'
                                : 'bg-white/5 text-muted-foreground hover:bg-white/10 border-2 border-transparent'
                            }`}
                            style={{
                              backgroundColor: logForm.emotionalResult === level ? category.color : undefined,
                              borderColor: logForm.emotionalResult === level ? category.color : undefined,
                            }}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>Drained</span>
                        <span>Neutral</span>
                        <span>Energized</span>
                      </div>
                    </div>

                    {/* Gratitude Note */}
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        What are you grateful for? (optional)
                      </label>
                      <textarea
                        value={logForm.gratitudeNote}
                        onChange={(e) => setLogForm({ ...logForm, gratitudeNote: e.target.value })}
                        placeholder="Something you appreciate about this relationship..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground min-h-24 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => {
                          setShowLogForm(false);
                          setSelectedCategory(null);
                          setEditingLogId(null);
                          resetForm();
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveLog}
                        className="flex-1 text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        {editingLogId ? 'Update Connection' : 'Save Connection'}
                      </Button>
                      {editingLogId && (
                        <Button
                          onClick={() => handleDeleteLog(editingLogId)}
                          variant="outline"
                          className="border-red-400/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
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
                <Heart className="w-6 h-6" />
                <div>
                  <div className="font-medium">Connection logged! 💝</div>
                  <div className="text-sm opacity-90">You're nurturing meaningful relationships</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneShell>
  );
}
