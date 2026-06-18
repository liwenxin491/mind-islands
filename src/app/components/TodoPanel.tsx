import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Calendar, Bell, FileText, Clock3, Archive, ArchiveRestore } from 'lucide-react';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate24, formatTime24 } from '../lib/time';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

export function TodoPanel({ variant = 'sidebar' }: { variant?: 'sidebar' | 'overlay' }) {
  const { t } = useLanguage();
  const { progress, addTodo, updateTodo, setTodoPriorityScore, toggleTodo, deleteTodo } = useMindIslands();
  const isOverlay = variant === 'overlay';
  const skipPriorityBlurRef = useRef(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingPriorityTodoId, setEditingPriorityTodoId] = useState<string | null>(null);
  const [priorityDraft, setPriorityDraft] = useState('');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDetails, setNewTodoDetails] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [newTodoRemindAt, setNewTodoRemindAt] = useState('');
  const [newTodoEstimateMinutes, setNewTodoEstimateMinutes] = useState('');
  const [newTodoUrgencyPreset, setNewTodoUrgencyPreset] = useState<'' | 'low' | 'medium' | 'high'>('');
  const [editTodoText, setEditTodoText] = useState('');
  const [editTodoDetails, setEditTodoDetails] = useState('');
  const [editTodoDeadline, setEditTodoDeadline] = useState('');
  const [editTodoRemindAt, setEditTodoRemindAt] = useState('');
  const [editTodoEstimateMinutes, setEditTodoEstimateMinutes] = useState('');
  const [editTodoImportance, setEditTodoImportance] = useState('');

  const sortedTodos = useMemo(() => {
    return [...progress.todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [progress.todos]);
  const activeTodos = sortedTodos.filter((todo) => !todo.completed);
  const archivedTodos = sortedTodos.filter((todo) => todo.completed);

  const toDateTimeLocal = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo({
        text: newTodoText,
        completed: false,
        details: newTodoDetails.trim() || undefined,
        deadline: newTodoDeadline ? new Date(newTodoDeadline).toISOString() : undefined,
        remindAt: newTodoRemindAt ? new Date(newTodoRemindAt).toISOString() : undefined,
        estimatedMinutes: newTodoEstimateMinutes ? Math.max(5, Number(newTodoEstimateMinutes)) : undefined,
        manualPriorityPreset: newTodoUrgencyPreset || undefined,
      });
      setNewTodoText('');
      setNewTodoDetails('');
      setNewTodoDeadline('');
      setNewTodoRemindAt('');
      setNewTodoEstimateMinutes('');
      setNewTodoUrgencyPreset('');
      setIsAdding(false);
    }
  };

  const startEditTodo = (todoId: string) => {
    const todo = progress.todos.find((item) => item.id === todoId);
    if (!todo) return;
    setEditingTodoId(todoId);
    setEditTodoText(todo.text || '');
    setEditTodoDetails(todo.details || '');
    setEditTodoDeadline(toDateTimeLocal(todo.deadline));
    setEditTodoRemindAt(toDateTimeLocal(todo.remindAt));
    setEditTodoEstimateMinutes(todo.estimatedMinutes ? String(todo.estimatedMinutes) : '');
    setEditTodoImportance(todo.importance ? String(todo.importance) : '');
  };

  const cancelEditTodo = () => {
    setEditingTodoId(null);
    setEditTodoText('');
    setEditTodoDetails('');
    setEditTodoDeadline('');
    setEditTodoRemindAt('');
    setEditTodoEstimateMinutes('');
    setEditTodoImportance('');
  };

  const saveEditTodo = () => {
    if (!editingTodoId || !editTodoText.trim()) return;
    updateTodo(editingTodoId, {
      text: editTodoText.trim(),
      details: editTodoDetails.trim() || undefined,
      deadline: editTodoDeadline ? new Date(editTodoDeadline).toISOString() : undefined,
      remindAt: editTodoRemindAt ? new Date(editTodoRemindAt).toISOString() : undefined,
      estimatedMinutes: editTodoEstimateMinutes ? Math.max(5, Number(editTodoEstimateMinutes)) : undefined,
      importance: editTodoImportance ? Math.max(1, Math.min(5, Number(editTodoImportance))) : undefined,
    });
    cancelEditTodo();
  };

  const priorityStyle = (label: 'high' | 'medium' | 'low') => {
    if (label === 'high') {
      return isOverlay
        ? 'bg-red-50 text-red-700 border-red-300'
        : 'bg-red-500/20 text-red-200 border-red-400/40';
    }
    if (label === 'medium') {
      return isOverlay
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : 'bg-amber-500/20 text-amber-200 border-amber-400/40';
    }
    return isOverlay
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
  };
  const priorityLabelText = (label: 'high' | 'medium' | 'low') => {
    if (label === 'high') return t('high', '高');
    if (label === 'medium') return t('medium', '中');
    return t('low', '低');
  };

  const urgencyOptions: Array<{ value: 'low' | 'medium' | 'high'; label: string }> = [
    { value: 'low', label: t('Low', '低') },
    { value: 'medium', label: t('Medium', '中') },
    { value: 'high', label: t('High', '高') },
  ];

  const clampPriorityDraft = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const startPriorityEdit = (todoId: string, score: number) => {
    setEditingPriorityTodoId(todoId);
    setPriorityDraft(String(clampPriorityDraft(score)));
  };

  const cancelPriorityEdit = () => {
    skipPriorityBlurRef.current = true;
    setEditingPriorityTodoId(null);
    setPriorityDraft('');
  };

  const handlePriorityBlur = (todoId: string) => {
    if (skipPriorityBlurRef.current) {
      skipPriorityBlurRef.current = false;
      return;
    }
    savePriorityEdit(todoId);
  };

  const savePriorityEdit = (todoId: string) => {
    const trimmed = priorityDraft.trim();
    if (!trimmed) {
      setEditingPriorityTodoId(null);
      setPriorityDraft('');
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setEditingPriorityTodoId(null);
      setPriorityDraft('');
      return;
    }
    setTodoPriorityScore(todoId, clampPriorityDraft(parsed));
    setEditingPriorityTodoId(null);
    setPriorityDraft('');
  };

  const shellClass =
    variant === 'overlay'
      ? 'h-full overflow-y-auto hide-scrollbar px-2 py-2'
      : 'w-80 h-full overflow-y-auto hide-scrollbar border-l border-border bg-card/60 p-6 backdrop-blur-xl';

  const itemClass =
    variant === 'overlay'
      ? 'group rounded-[24px] bg-[rgba(249,252,253,0.94)] p-4 shadow-[0_10px_24px_rgba(20,52,64,0.1)] transition-colors hover:bg-[rgba(252,253,254,0.98)]'
      : 'group rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50';

  const archivedItemClass =
    variant === 'overlay'
      ? 'group flex items-start gap-3 rounded-[20px] bg-[rgba(243,247,249,0.86)] p-4'
      : 'group flex items-start gap-3 rounded-lg bg-muted/20 p-3';

  return (
    <div className={shellClass}>
      <div className={`mb-5 flex items-center justify-between ${isOverlay ? 'pt-1' : ''}`}>
        {!isOverlay && <h2 className="text-xl font-medium text-foreground">{t('To-Do List', '待办列表')}</h2>}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchived((prev) => !prev)}
            className={isOverlay ? 'text-slate-600 hover:bg-white/30' : 'hover:bg-secondary/20'}
            title={showArchived ? t('Hide archived tasks', '隐藏已归档任务') : t('Show archived tasks', '显示已归档任务')}
          >
            {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            <span className="ml-1 text-xs">{archivedTodos.length}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(!isAdding)}
            className={isOverlay ? 'text-slate-600 hover:bg-white/30' : 'hover:bg-primary/20'}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className={`space-y-2 ${isOverlay ? 'rounded-[24px] bg-[rgba(241,247,249,0.86)] p-4 shadow-[0_8px_20px_rgba(20,52,64,0.08)]' : ''}`}>
              <Input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder={t('Add a new task...', '添加新任务...')}
                className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
                autoFocus
              />
              <Input
                value={newTodoDetails}
                onChange={(e) => setNewTodoDetails(e.target.value)}
                placeholder={t('Details (optional)', '详情（可选）')}
                className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
              />
              <div className="space-y-2">
                <DateTimeDropdownField
                  label={t('Deadline', '截止时间')}
                  value={newTodoDeadline}
                  onChange={setNewTodoDeadline}
                  placeholder={t('Add deadline', '添加截止时间')}
                  isOverlay={isOverlay}
                />
                <DateTimeDropdownField
                  label={t('Reminder', '提醒时间')}
                  value={newTodoRemindAt}
                  onChange={setNewTodoRemindAt}
                  placeholder={t('Add reminder', '添加提醒')}
                  isOverlay={isOverlay}
                  icon="bell"
                />
              </div>
              <Input
                type="number"
                min={5}
                step={5}
                value={newTodoEstimateMinutes}
                onChange={(e) => setNewTodoEstimateMinutes(e.target.value)}
                placeholder={t('Estimated effort (minutes)', '预计耗时（分钟）')}
                className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
              />
              <div>
                <p className={`mb-1 text-[11px] font-semibold ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>
                  {t('Urgency (optional)', '紧急程度（可选）')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {urgencyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewTodoUrgencyPreset((current) => (current === option.value ? '' : option.value))}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                        newTodoUrgencyPreset === option.value
                          ? isOverlay
                            ? 'border-[#6b98a2] bg-[#d9eaee] text-[#355965] shadow-sm'
                            : 'border-primary/60 bg-primary/30 text-foreground'
                          : isOverlay
                            ? 'border-slate-300 bg-white text-slate-600 hover:border-[#6b98a2]/60 hover:bg-[#eef5f7]'
                            : 'border-border/60 bg-background/20 text-muted-foreground hover:bg-background/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddTodo}
                className={isOverlay ? 'w-full bg-[#6b98a2] text-white hover:bg-[#5a8791]' : 'w-full bg-primary hover:bg-primary/80 text-primary-foreground'}
              >
                {t('Add', '添加')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {activeTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={isOverlay ? 'py-12 text-center text-slate-500' : 'text-center py-12 text-muted-foreground'}
            >
              <p className="text-sm">{t('No active tasks', '暂无进行中的任务')}</p>
              <p className="text-xs mt-2">{t('Completed tasks are archived automatically', '已完成任务会自动归档')}</p>
            </motion.div>
          ) : (
            activeTodos.map((todo, index) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={itemClass}
                onDoubleClick={() => startEditTodo(todo.id)}
                title={t('Double-click to edit', '双击可编辑')}
              >
                {editingTodoId === todo.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTodoText}
                      onChange={(e) => setEditTodoText(e.target.value)}
                      className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700' : 'bg-input-background border-border/50 text-foreground'}
                      autoFocus
                    />
                    <Input
                      value={editTodoDetails}
                      onChange={(e) => setEditTodoDetails(e.target.value)}
                      placeholder={t('Details', '详情')}
                      className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
                    />
                    <div className="space-y-2">
                      <DateTimeDropdownField
                        label={t('Deadline', '截止时间')}
                        value={editTodoDeadline}
                        onChange={setEditTodoDeadline}
                        placeholder={t('Add deadline', '添加截止时间')}
                        isOverlay={isOverlay}
                      />
                      <DateTimeDropdownField
                        label={t('Reminder', '提醒时间')}
                        value={editTodoRemindAt}
                        onChange={setEditTodoRemindAt}
                        placeholder={t('Add reminder', '添加提醒')}
                        isOverlay={isOverlay}
                        icon="bell"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={5}
                        step={5}
                        value={editTodoEstimateMinutes}
                        onChange={(e) => setEditTodoEstimateMinutes(e.target.value)}
                        placeholder={t('Est. minutes', '预计分钟')}
                        className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
                      />
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={1}
                        value={editTodoImportance}
                        onChange={(e) => setEditTodoImportance(e.target.value)}
                        placeholder={t('Importance 1-5', '重要程度 1-5')}
                        className={isOverlay ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400' : 'bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground'}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-500"
                        onClick={saveEditTodo}
                      >
                        {t('Save', '保存')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={cancelEditTodo}
                      >
                        {t('Cancel', '取消')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id)}
                      className={`mt-1 ${isOverlay ? 'border-slate-400 bg-white shadow-none data-[state=checked]:border-[#6b98a2] data-[state=checked]:bg-[#6b98a2]' : ''}`}
                    />
	                    <div className="flex-1 min-w-0">
	                      <div className="mb-2 flex items-center gap-2">
	                        {editingPriorityTodoId === todo.id ? (
	                          <input
	                            value={priorityDraft}
	                            onChange={(event) => setPriorityDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
	                            onBlur={() => handlePriorityBlur(todo.id)}
	                            onClick={(event) => event.stopPropagation()}
	                            onDoubleClick={(event) => event.stopPropagation()}
	                            onKeyDown={(event) => {
	                              if (event.key === 'Enter') savePriorityEdit(todo.id);
	                              if (event.key === 'Escape') cancelPriorityEdit();
	                            }}
	                            autoFocus
	                            inputMode="numeric"
	                            className={`h-8 w-20 rounded-full border px-3 text-center text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#6b98a2]/30 ${
	                              isOverlay ? 'border-[#6b98a2]/45 bg-white text-slate-700' : 'border-border/60 bg-background/20 text-foreground'
	                            }`}
	                            aria-label={t('Priority score', '优先级分数')}
	                          />
	                        ) : (
	                          <button
	                            type="button"
	                            onDoubleClick={(event) => {
	                              event.stopPropagation();
	                              startPriorityEdit(todo.id, todo.priorityScore);
	                            }}
	                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-transform active:scale-[0.98] ${priorityStyle(todo.priorityLabel)}`}
	                            title={t('Double-click to edit priority score', '双击编辑优先级分数')}
	                          >
	                            {priorityLabelText(todo.priorityLabel)} · {todo.priorityScore}
	                          </button>
	                        )}
	                      </div>
	                      <p
                        className={`text-sm ${
                          todo.completed
                            ? 'line-through text-slate-400'
                            : isOverlay
                              ? 'text-slate-700'
                              : 'text-foreground'
                        }`}
                      >
                        {todo.text}
                      </p>
                      {todo.details && (
                        <div className={`mt-2 flex items-center gap-1 text-xs ${isOverlay ? 'text-slate-600' : 'text-muted-foreground'}`}>
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{todo.details}</span>
                        </div>
                      )}
                      {todo.estimatedMinutes && (
                        <div className={`mt-2 flex items-center gap-1 text-xs ${isOverlay ? 'text-slate-600' : 'text-muted-foreground'}`}>
                          <Clock3 className="w-3 h-3" />
                          {t('Est.', '预计')} {todo.estimatedMinutes} {t('min', '分钟')}
                        </div>
                      )}
                      {todo.deadline && (
                        <div className={`mt-2 flex items-center gap-1 text-xs ${isOverlay ? 'text-slate-600' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3 h-3" />
                          {formatDate24(todo.deadline)} {formatTime24(todo.deadline)}
                        </div>
                      )}
                      {todo.remindAt && (
                        <div className={`mt-2 flex items-center gap-1 text-xs ${isOverlay ? 'text-slate-600' : 'text-muted-foreground'}`}>
                          <Bell className="w-3 h-3" />
                          {t('Reminder', '提醒')} {formatDate24(todo.remindAt)} {formatTime24(todo.remindAt)}
                        </div>
                      )}
	                      {todo.priorityReason && (
	                        <div className={`mt-2 text-[12px] font-medium ${isOverlay ? 'text-slate-600' : 'text-muted-foreground'}`}>
	                          {todo.priorityReason}
	                        </div>
	                      )}
	                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTodo(todo.id)}
                      className={isOverlay ? 'text-slate-500 opacity-90 transition-opacity hover:bg-red-50 hover:text-red-500' : 'opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showArchived && archivedTodos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-5 pt-4 ${isOverlay ? 'border-t border-slate-300/40' : 'border-t border-border/50'}`}
          >
            <div className={`mb-2 flex items-center gap-2 text-xs ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>
              <Archive className="w-3 h-3" />
              {t('Archived (Completed)', '已归档（已完成）')}
            </div>
            <div className="space-y-2">
              {archivedTodos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={archivedItemClass}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className={`mt-1 ${isOverlay ? 'border-slate-400 bg-white shadow-none data-[state=checked]:border-[#6b98a2] data-[state=checked]:bg-[#6b98a2]' : ''}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm line-through ${isOverlay ? 'text-slate-400' : 'text-muted-foreground'}`}>{todo.text}</p>
                    {todo.priorityReason && (
                      <p className={`mt-1 text-[11px] ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>{todo.priorityReason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTodo(todo.id)}
                    className={isOverlay ? 'text-slate-400 opacity-70 transition-opacity hover:text-red-500' : 'opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion stats */}
      {progress.todos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={isOverlay ? 'mt-6 rounded-[22px] bg-[rgba(238,243,246,0.88)] p-4 shadow-[0_8px_20px_rgba(20,52,64,0.08)]' : 'mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20'}
        >
          <p className={`mb-2 text-xs ${isOverlay ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('Progress', '进度')}</p>
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 overflow-hidden rounded-full ${isOverlay ? 'bg-slate-300/35' : 'bg-muted'}`}>
              <motion.div
                className={`h-full ${isOverlay ? 'bg-[#6b98a2]' : 'bg-accent'}`}
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    (archivedTodos.length /
                      progress.todos.length) *
                    100
                  }%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className={`text-xs font-medium ${isOverlay ? 'text-slate-700' : 'text-foreground'}`}>
              {archivedTodos.length}/{progress.todos.length}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DateTimeDropdownField({
  label,
  value,
  onChange,
  placeholder,
  isOverlay,
  icon = 'calendar',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isOverlay: boolean;
  icon?: 'calendar' | 'bell';
}) {
  const { t } = useLanguage();
  const fieldId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const parsedValue = parseLocalDateTime(value);
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(() => formatLocalDateTimeText(value));
  const [timeValue, setTimeValue] = useState(() => parsedValue?.time ?? '09:00');
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parsedValue?.date ?? new Date()));
  const Icon = icon === 'bell' ? Bell : Calendar;

  useEffect(() => {
    const nextParsed = parseLocalDateTime(value);
    setTextValue(formatLocalDateTimeText(value));
    setTimeValue(nextParsed?.time ?? '09:00');
    if (nextParsed) setVisibleMonth(startOfMonth(nextParsed.date));
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (fieldRef.current?.contains(event.target as Node)) return;
      commitTextOrReset();
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  });

  const selectedDateKey = parsedValue ? dateKeyFromDate(parsedValue.date) : '';
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const commitValue = (nextValue: string) => {
    onChange(nextValue);
    setTextValue(formatLocalDateTimeText(nextValue));
    const nextParsed = parseLocalDateTime(nextValue);
    if (nextParsed) {
      setTimeValue(nextParsed.time);
      setVisibleMonth(startOfMonth(nextParsed.date));
    }
  };

  function commitTextOrReset() {
    const trimmed = textValue.trim();
    if (!trimmed) {
      onChange('');
      setTextValue('');
      setTimeValue('09:00');
      return;
    }
    const parsedText = parseDateTimeText(trimmed, timeValue);
    if (parsedText) {
      commitValue(parsedText);
    } else {
      setTextValue(formatLocalDateTimeText(value));
      setTimeValue(parsedValue?.time ?? '09:00');
    }
  }

  const handleTextChange = (nextText: string) => {
    const nextValue = nextText.slice(0, 16);
    setTextValue(nextValue);
    const parsedText = parseDateTimeText(nextValue, timeValue);
    if (parsedText) commitValue(parsedText);
  };

  const handleTimeChange = (nextTime: string) => {
    const cleaned = nextTime.replace(/[^\d:]/g, '').slice(0, 5);
    setTimeValue(cleaned);
    const normalized = normalizeClockTime(cleaned);
    if (!normalized) return;
    const dateKey = selectedDateKey || dateKeyFromDate(new Date());
    commitValue(`${dateKey}T${normalized}`);
  };

  const selectDate = (dateKey: string) => {
    const normalizedTime = normalizeClockTime(timeValue) || parsedValue?.time || '09:00';
    commitValue(`${dateKey}T${normalizedTime}`);
  };

  const inputClass = isOverlay
    ? 'border-slate-200/70 bg-white/90 text-slate-700 placeholder:text-slate-400'
    : 'border-border/50 bg-input-background text-foreground placeholder:text-muted-foreground';

  return (
    <div ref={fieldRef} className={`relative ${open ? 'z-50' : 'z-10'}`}>
      <label htmlFor={fieldId} className="mb-1 block text-[11px] font-semibold text-slate-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type="text"
          value={textValue}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitTextOrReset();
              setOpen(false);
            }
            if (event.key === 'Escape') {
              setTextValue(formatLocalDateTimeText(value));
              setTimeValue(parsedValue?.time ?? '09:00');
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          inputMode="numeric"
          aria-expanded={open}
          className={`h-10 w-full rounded-xl border py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#6b98a2]/30 ${inputClass}`}
        />
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#527a84]" />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-[22px] border border-[#d5e3e6] bg-white/96 p-3 text-slate-800 shadow-[0_14px_32px_rgba(10,42,52,0.16)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="h-8 w-8 rounded-full text-slate-500 transition-colors hover:bg-[#edf4f5]"
              aria-label={t('Previous month', '上个月')}
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-700">{formatMonthLabel(visibleMonth)}</span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="h-8 w-8 rounded-full text-slate-500 transition-colors hover:bg-[#edf4f5]"
              aria-label={t('Next month', '下个月')}
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day, index) =>
              day ? (
                <button
                  key={day.key}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectDate(day.key)}
                  className={`flex h-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    day.key === selectedDateKey
                      ? 'bg-[#6b98a2] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#edf4f5]'
                  }`}
                >
                  {day.label}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              ),
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#edf4f5] p-2">
            <Clock3 className="h-4 w-4 text-[#527a84]" />
            <input
              value={timeValue}
              onChange={(event) => handleTimeChange(event.target.value)}
              onMouseDown={(event) => event.stopPropagation()}
              inputMode="numeric"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
              aria-label={t('Time', '时间')}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectDate(dateKeyFromDate(new Date()))}
              className="flex-1 rounded-full bg-[#edf4f5] py-2 text-xs font-semibold text-[#527a84]"
            >
              {t('Today', '今天')}
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectDate(dateKeyFromDate(addDays(new Date(), 1)))}
              className="flex-1 rounded-full bg-[#edf4f5] py-2 text-xs font-semibold text-[#527a84]"
            >
              {t('Tomorrow', '明天')}
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange('');
                setTextValue('');
                setTimeValue('09:00');
                setOpen(false);
              }}
              className="flex-1 rounded-full bg-white py-2 text-xs font-semibold text-slate-500 shadow-sm"
            >
              {t('Clear', '清除')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const padDatePart = (value: number) => String(value).padStart(2, '0');

const dateKeyFromDate = (date: Date) => {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

const formatMonthLabel = (date: Date) => `${date.getFullYear()} / ${padDatePart(date.getMonth() + 1)}`;

const buildCalendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay.getDay() }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
    return {
      key: dateKeyFromDate(date),
      label: String(index + 1),
    };
  });
  return [...blanks, ...days];
};

const formatLocalDateTimeText = (value: string) => {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return '';
  return `${dateKeyFromDate(parsed.date)} ${parsed.time}`;
};

const parseLocalDateTime = (value: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = parseDateKey(match[1]);
  const time = normalizeClockTime(match[2]);
  if (!date || !time) return null;
  return { date, time };
};

const parseDateTimeText = (value: string, fallbackTime: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:?\d{0,2}))?$/.exec(value.trim());
  if (!match) return null;
  const date = parseDateKey(match[1]);
  if (!date) return null;
  const time = match[2] ? normalizeClockTime(match[2]) : normalizeClockTime(fallbackTime) || '09:00';
  if (!time) return null;
  return `${dateKeyFromDate(date)}T${time}`;
};

const parseDateKey = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const normalizeClockTime = (value: string) => {
  const trimmed = value.trim();
  const colonMatch = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${padDatePart(hour)}:${padDatePart(minute)}`;
    }
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 1 || digits.length === 2) {
    const hour = Number(digits);
    if (hour >= 0 && hour <= 23) {
      return `${padDatePart(hour)}:00`;
    }
  }
  if (digits.length === 3 || digits.length === 4) {
    const hour = Number(digits.slice(0, -2));
    const minute = Number(digits.slice(-2));
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${padDatePart(hour)}:${padDatePart(minute)}`;
    }
  }
  return null;
};
