import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Calendar, Bell, FileText, Clock3, Archive, ArchiveRestore } from 'lucide-react';
import { useMindIslands } from '../context/MindIslandsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate24, formatTime24 } from '../lib/time';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

export function TodoPanel() {
  const { t } = useLanguage();
  const { progress, addTodo, updateTodo, setTodoImportance, toggleTodo, deleteTodo } = useMindIslands();
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDetails, setNewTodoDetails] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [newTodoRemindAt, setNewTodoRemindAt] = useState('');
  const [newTodoEstimateMinutes, setNewTodoEstimateMinutes] = useState('');
  const [newTodoImportance, setNewTodoImportance] = useState('');
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
        importance: newTodoImportance ? Math.max(1, Math.min(5, Number(newTodoImportance))) : undefined,
      });
      setNewTodoText('');
      setNewTodoDetails('');
      setNewTodoDeadline('');
      setNewTodoRemindAt('');
      setNewTodoEstimateMinutes('');
      setNewTodoImportance('');
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
    if (label === 'high') return 'bg-red-500/20 text-red-200 border-red-400/40';
    if (label === 'medium') return 'bg-amber-500/20 text-amber-200 border-amber-400/40';
    return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
  };
  const priorityLabelText = (label: 'high' | 'medium' | 'low') => {
    if (label === 'high') return t('high', '高');
    if (label === 'medium') return t('medium', '中');
    return t('low', '低');
  };

  return (
    <div
      className="w-80 h-full bg-card/60 backdrop-blur-xl border-l border-border p-6 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-foreground">{t('To-Do List', '待办列表')}</h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchived((prev) => !prev)}
            className="hover:bg-secondary/20"
            title={showArchived ? t('Hide archived tasks', '隐藏已归档任务') : t('Show archived tasks', '显示已归档任务')}
          >
            {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            <span className="ml-1 text-xs">{archivedTodos.length}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(!isAdding)}
            className="hover:bg-primary/20"
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
            <div className="space-y-2">
              <Input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder={t('Add a new task...', '添加新任务...')}
                className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <Input
                value={newTodoDetails}
                onChange={(e) => setNewTodoDetails(e.target.value)}
                placeholder={t('Details (optional)', '详情（可选）')}
                className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  value={newTodoDeadline}
                  onChange={(e) => setNewTodoDeadline(e.target.value)}
                  className="bg-input-background border-border/50 text-foreground"
                />
                <Input
                  type="datetime-local"
                  value={newTodoRemindAt}
                  onChange={(e) => setNewTodoRemindAt(e.target.value)}
                  className="bg-input-background border-border/50 text-foreground"
                />
              </div>
              <Input
                type="number"
                min={5}
                step={5}
                value={newTodoEstimateMinutes}
                onChange={(e) => setNewTodoEstimateMinutes(e.target.value)}
                placeholder={t('Estimated effort (minutes)', '预计耗时（分钟）')}
                className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
              />
              <Input
                type="number"
                min={1}
                max={5}
                step={1}
                value={newTodoImportance}
                onChange={(e) => setNewTodoImportance(e.target.value)}
                placeholder={t('Importance (1-5, optional)', '重要程度（1-5，可选）')}
                className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                onClick={handleAddTodo}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
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
              className="text-center py-12 text-muted-foreground"
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
                className="group rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                onDoubleClick={() => startEditTodo(todo.id)}
                title={t('Double-click to edit', '双击可编辑')}
              >
                {editingTodoId === todo.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTodoText}
                      onChange={(e) => setEditTodoText(e.target.value)}
                      className="bg-input-background border-border/50 text-foreground"
                      autoFocus
                    />
                    <Input
                      value={editTodoDetails}
                      onChange={(e) => setEditTodoDetails(e.target.value)}
                      placeholder={t('Details', '详情')}
                      className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="datetime-local"
                        value={editTodoDeadline}
                        onChange={(e) => setEditTodoDeadline(e.target.value)}
                        className="bg-input-background border-border/50 text-foreground"
                      />
                      <Input
                        type="datetime-local"
                        value={editTodoRemindAt}
                        onChange={(e) => setEditTodoRemindAt(e.target.value)}
                        className="bg-input-background border-border/50 text-foreground"
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
                        className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={1}
                        value={editTodoImportance}
                        onChange={(e) => setEditTodoImportance(e.target.value)}
                        placeholder={t('Importance 1-5', '重要程度 1-5')}
                        className="bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground"
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
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${priorityStyle(todo.priorityLabel)}`}
                        >
                          {priorityLabelText(todo.priorityLabel)} · {todo.priorityScore}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {todo.text}
                      </p>
                      {todo.details && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{todo.details}</span>
                        </div>
                      )}
                      {todo.estimatedMinutes && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="w-3 h-3" />
                          {t('Est.', '预计')} {todo.estimatedMinutes} {t('min', '分钟')}
                        </div>
                      )}
                      {todo.deadline && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate24(todo.deadline)} {formatTime24(todo.deadline)}
                        </div>
                      )}
                      {todo.remindAt && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Bell className="w-3 h-3" />
                          {t('Reminder', '提醒')} {formatDate24(todo.remindAt)} {formatTime24(todo.remindAt)}
                        </div>
                      )}
                      {todo.priorityReason && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {todo.priorityReason}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">{t('Importance:', '重要程度：')}</span>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => setTodoImportance(todo.id, level)}
                            className={`h-6 w-6 rounded-full border text-[11px] transition-colors ${
                              (todo.importance || 3) === level
                                ? 'border-primary/60 bg-primary/30 text-foreground'
                                : 'border-border/60 bg-background/20 text-muted-foreground hover:bg-background/40'
                            }`}
                            title={t(`Set importance ${level}`, `设置重要程度 ${level}`)}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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
            className="mt-5 border-t border-border/50 pt-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
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
                  className="group flex items-start gap-3 rounded-lg bg-muted/20 p-3"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-through text-muted-foreground">{todo.text}</p>
                    {todo.priorityReason && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{todo.priorityReason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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
          className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-xs text-muted-foreground mb-2">{t('Progress', '进度')}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent"
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
            <span className="text-xs font-medium text-foreground">
              {archivedTodos.length}/{progress.todos.length}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
