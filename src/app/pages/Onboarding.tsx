import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useMindIslands } from '../context/MindIslandsContext';
import { IllustratedCharacter } from '../components/IllustratedCharacter';
import { Button } from '../components/ui/button';
import type { CharacterType } from '../types';

export function Onboarding() {
  const navigate = useNavigate();
  const { progress, selectCharacter, completeOnboarding } = useMindIslands();
  const [step, setStep] = useState<'welcome' | 'character' | 'name' | 'intro'>('welcome');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType>('owl');
  const [characterName, setCharacterName] = useState('');

  useEffect(() => {
    if (progress.onboardingComplete) {
      navigate('/');
    }
  }, [progress.onboardingComplete, navigate]);

  const handleCharacterSelect = (type: CharacterType) => {
    setSelectedCharacter(type);
    setStep('name');
  };

  const handleNameSubmit = () => {
    if (characterName.trim()) {
      selectCharacter(selectedCharacter, characterName.trim());
      setStep('intro');
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4f] to-[#1a0f2e] relative overflow-hidden">
      {/* Stars */}
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
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
          }}
        />
      ))}

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-medium text-foreground">Welcome to Mind Islands</h1>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                  A gentle space where caring for yourself becomes a peaceful journey
                </p>
              </div>

              <div className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-4">
                <p className="text-foreground/80 text-lg">
                  This isn't a productivity dashboard.
                </p>
                <p className="text-foreground/90 text-lg">
                  It's a place to visualize your life as a collection of floating islands, each representing an important part of who you are.
                </p>
                <p className="text-foreground/80 text-lg">
                  By caring for your character, you care for yourself.
                </p>
              </div>

              <Button
                onClick={() => setStep('character')}
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-6 text-lg"
                size="lg"
              >
                Begin Your Journey
              </Button>
            </motion.div>
          )}

          {/* Character Selection Step */}
          {step === 'character' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-medium text-foreground">Choose Your Companion</h2>
                <p className="text-lg text-muted-foreground">
                  This character represents you on your journey
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['owl', 'puppy', 'girl'] as CharacterType[]).map((type) => (
                  <motion.button
                    key={type}
                    onClick={() => handleCharacterSelect(type)}
                    className={`bg-background/10 backdrop-blur-md border-2 rounded-2xl p-8 transition-all ${
                      selectedCharacter === type
                        ? 'border-primary shadow-lg shadow-primary/20'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <IllustratedCharacter type={type} mood="happy" size="md" />
                      <div className="text-center">
                        <p className="text-lg font-medium text-foreground capitalize">{type}</p>
                        <p className="text-sm text-muted-foreground">
                          {type === 'owl' && 'Wise and contemplative'}
                          {type === 'puppy' && 'Energetic and loyal'}
                          {type === 'girl' && 'Gentle and creative'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Name Step */}
          {step === 'name' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-6">
                <IllustratedCharacter type={selectedCharacter} mood="happy" size="lg" />
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-foreground">What shall we call you?</h2>
                  <p className="text-muted-foreground">
                    This character represents you, so use your name or a name that feels right
                  </p>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">Your Name</label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-background/20 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSubmit();
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep('character')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNameSubmit}
                    disabled={!characterName.trim()}
                    className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Introduction Step */}
          {step === 'intro' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-6">
                <IllustratedCharacter type={selectedCharacter} mood="happy" size="lg" />
                <h2 className="text-4xl font-medium text-foreground">
                  Welcome, {characterName}!
                </h2>
              </div>

              <div className="space-y-4">
                <div className="bg-background/10 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-medium text-foreground mb-4">Your Islands</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🌿</span>
                      <div>
                        <p className="font-medium text-foreground">Body & Health</p>
                        <p className="text-muted-foreground">Track sleep, exercise, and energy</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <p className="font-medium text-foreground">Work</p>
                        <p className="text-muted-foreground">Manage career progress and wins</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📚</span>
                      <div>
                        <p className="font-medium text-foreground">Learning</p>
                        <p className="text-muted-foreground">Track mastery and milestones</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💝</span>
                      <div>
                        <p className="font-medium text-foreground">Relationships</p>
                        <p className="text-muted-foreground">Nurture connections and gratitude</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">✨</span>
                      <div>
                        <p className="font-medium text-foreground">Curiosity</p>
                        <p className="text-muted-foreground">Discover new things daily</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💗</span>
                      <div>
                        <p className="font-medium text-foreground">Self Compassion</p>
                        <p className="text-muted-foreground">Reflect, breathe, and be kind</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-2xl p-6">
                  <p className="text-foreground/90 text-center">
                    Each interaction makes your character happier and your world brighter. 
                    When you miss a day, that's okay—your character will gently encourage you to return.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-6 text-lg"
                size="lg"
              >
                Enter Mind Islands
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
