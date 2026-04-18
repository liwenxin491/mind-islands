import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Heart, Check, Sparkles } from 'lucide-react';
import { useMindIslands } from '../context/MindIslandsContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { StreakDisplay } from '../components/StreakDisplay';
import { SceneShell } from '../components/SceneShell';
import type { IslandType, CheckIn } from '../types';
import { toast } from 'sonner';

export function IslandDetail() {
  const { islandId } = useParams<{ islandId: IslandType }>();
  const navigate = useNavigate();
  const { progress, addCheckIn, updateIslandStreak } = useMindIslands();

  const island = progress.islands.find((i) => i.id === islandId);
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  if (!island) {
    return <div>Island not found</div>;
  }

  const handleSave = () => {
    const checkIn: CheckIn = {
      id: Date.now().toString(),
      islandId: island.id,
      date: new Date().toISOString(),
      mood,
      note,
      habits: [],
    };

    addCheckIn(checkIn);
    updateIslandStreak(island.id);

    setShowSuccess(true);
    toast.success('Check-in saved! 🎉', {
      description: 'Great job taking care of yourself!',
    });

    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <SceneShell>
        <div className="flex min-h-full items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1,
              ease: 'easeInOut',
            }}
            className="text-8xl mb-6"
          >
            ✨
          </motion.div>
          <h2 className="text-3xl font-medium text-foreground mb-4">
            Wonderful!
          </h2>
          <p className="text-lg text-muted-foreground">
            Your {island.name} island is glowing with care 💫
          </p>
        </motion.div>
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell>
      <div className="relative z-10 mx-auto max-w-4xl p-6 md:p-12">
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

          <div className="flex items-start gap-6 mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-5xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${island.color}40, ${island.color}20)`,
                boxShadow: `0 0 40px ${island.color}40`,
              }}
            >
              {island.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-medium text-foreground mb-2">
                {island.name}
              </h1>
              <p className="text-muted-foreground">{island.description}</p>
            </div>
            <div className="hidden md:block">
              <StreakDisplay streak={island.streak} size="sm" />
            </div>
          </div>

          {/* Mobile streak display */}
          <div className="md:hidden mb-6">
            <StreakDisplay streak={island.streak} size="sm" />
          </div>
        </motion.div>

        {/* Check-in Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 space-y-8"
        >
          {/* Mood slider */}
          <div className="space-y-4">
            <label className="block text-foreground">
              <Heart className="w-5 h-5 inline mr-2 text-accent" />
              How are you feeling about this area today?
            </label>
            <div className="space-y-4">
              <Slider
                value={[mood]}
                onValueChange={(value) => setMood(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>😔 Struggling</span>
                <span>😊 Neutral</span>
                <span>🌟 Thriving</span>
              </div>
            </div>
          </div>

          {/* Note textarea */}
          <div className="space-y-4">
            <label className="block text-foreground">
              Today's reflections (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did things go today? What are you grateful for? What would you like to improve?"
              className="min-h-[150px] bg-input-background border-border/50 text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <label className="block text-foreground">Quick actions</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                '✅ Completed daily goal',
                '📖 Learned something new',
                '💪 Pushed my limits',
                '🙏 Practiced gratitude',
              ].map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-6 text-lg"
          >
            <Check className="w-5 h-5 mr-2" />
            Save Check-in
          </Button>
        </motion.div>

        {/* Recent check-ins */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <h3 className="text-lg font-medium text-foreground mb-4">
            Recent Check-ins
          </h3>
          <div className="space-y-3">
            {progress.checkIns
              .filter((c) => c.islandId === island.id)
              .slice(0, 5)
              .map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="bg-card/40 backdrop-blur-xl border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(checkIn.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="flex gap-1">
                      {[...Array(checkIn.mood)].map((_, i) => (
                        <Heart
                          key={i}
                          className="w-4 h-4 fill-accent text-accent"
                        />
                      ))}
                    </div>
                  </div>
                  {checkIn.note && (
                    <p className="text-sm text-foreground/80">{checkIn.note}</p>
                  )}
                </div>
              ))}

            {progress.checkIns.filter((c) => c.islandId === island.id).length ===
              0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No check-ins yet. Start your journey today! 🌱
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </SceneShell>
  );
}
