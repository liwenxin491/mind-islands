# Mind Islands Design System

## Overview
Mind Islands is a cozy, emotionally supportive self-care tracking experience designed to feel like a warm, whimsical game rather than a productivity dashboard. This document outlines the complete design system.

## Design Philosophy

### Core Principles
1. **Emotional Safety**: No harsh colors, no shame-inducing language, gentle feedback
2. **Cozy & Whimsical**: Night sky theme, floating islands, soft glows, playful animations
3. **Supportive Tone**: Warm, kind, observant, recovery-focused messaging
4. **Meaningful Progress**: Visible character states, island growth, streak celebrations

---

## Color System

### Base Colors
```css
--background: #1a0f2e           /* Deep purple night sky */
--foreground: #f5f3ff           /* Soft white text */
--card: rgba(45, 27, 79, 0.6)  /* Translucent card backgrounds */
--border: rgba(155, 135, 245, 0.2) /* Subtle purple borders */
```

### Island Colors
Each island has its own thematic color:
- **Body & Health**: `#10b981` (Emerald green)
- **Work**: `#3b82f6` (Sky blue)
- **Learning**: `#a855f7` (Purple)
- **Relationships**: `#ec4899` (Pink)
- **Curiosity**: `#f59e0b` (Amber)

### Character Mood Colors
- **Happy**: `#fbbf24` (Golden yellow)
- **Neutral**: `#9b87f5` (Soft purple)
- **Tired**: `#94a3b8` (Muted slate)

### Accent Colors
- **Primary**: `#9b87f5` (Soft purple - main interactive elements)
- **Secondary**: `#d946ef` (Magenta - emphasis)
- **Accent**: `#fbbf24` (Gold - success, achievements)

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Hierarchy
- **H1**: 2xl, medium weight - Page titles
- **H2**: xl, medium weight - Section headers
- **H3**: lg, medium weight - Subsection headers
- **Body**: base, normal weight - Default text
- **Small**: sm - Supporting text

---

## Spacing & Layout

### Grid System
- **Hub Layout**: Centered character with floating islands in circular positions
- **Detail Pages**: Max-width 4xl (56rem) for comfortable reading
- **Panels**: 320px (20rem) fixed width for side panels

### Padding Scale
- **xs**: 0.5rem (8px)
- **sm**: 0.75rem (12px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

---

## Components

### Character Component
**Purpose**: Central avatar that reflects user's self-care state

**States**:
- `happy`: Glowing, floating animation, particles
- `neutral`: Gentle float, soft glow
- `tired`: Subdued colors, slower animation

**Props**:
```typescript
{
  mood: 'happy' | 'neutral' | 'tired';
  name: string;
  size: 'sm' | 'md' | 'lg';
}
```

---

### Island Card Component
**Purpose**: Clickable module representing life area

**Features**:
- Floating animation (staggered timing)
- Hover scale effect
- Streak indicator
- Completion badge
- Island-specific color glow

**States**:
- Default: Soft glow, idle float
- Hover: Increased scale, brighter glow
- Completed: Active indicator dot
- Streak active: Flame icon with number

---

### Feedback Components

#### FeedbackMessage
Types:
- `success`: Gold glow, sparkles icon
- `encouragement`: Purple glow, heart icon
- `recovery`: Magenta glow, moon icon

#### StreakDisplay
Visualizes consistency with:
- Flame icon animation
- Number display
- Milestone celebrations (every 7 days)
- Empty state for zero streaks

---

### AI Chat Component
**Purpose**: Supportive companion for reflection and log updates

**Features**:
- Warm, empathetic responses
- Message bubbles (user right, assistant left)
- Typing indicator animation
- Timestamp display
- Auto-scroll to latest

**Tone Guidelines**:
- Use "I'm here for you" language
- Celebrate progress without pressure
- Offer gentle recovery support
- Ask reflective questions

---

### Todo Panel
**Purpose**: Task management with gentle reminders

**Features**:
- Add/complete/delete tasks
- Progress bar visualization
- Deadline indicators
- Island association (optional)
- Completion statistics

---

## Animations

### Motion Principles
1. **Gentle & Organic**: Ease-in-out timing, natural curves
2. **Meaningful**: Every animation serves emotional purpose
3. **Performance**: Use transform/opacity for smooth 60fps

### Standard Animations

#### Float (Islands, Character)
```javascript
animate: { y: [0, -10, 0] }
duration: 3s
repeat: Infinity
ease: 'easeInOut'
```

#### Glow Pulse
```javascript
animate: { opacity: [0.3, 0.6, 0.3] }
duration: 2s
repeat: Infinity
```

#### Success Celebration
```javascript
animate: { scale: [1, 1.2, 1], rotate: [0, 360] }
duration: 1s
ease: 'easeInOut'
```

---

## Interactive States

### Buttons
- **Hover**: Slight scale increase (1.02), background opacity change
- **Active**: Scale decrease (0.98)
- **Focus**: Outline ring in primary color
- **Disabled**: Reduced opacity (0.5), no interaction

### Cards
- **Hover**: Border glow, subtle scale (1.02)
- **Active**: Pressed state, shadow reduction
- **Completed**: Checkmark badge, softer colors

---

## Responsive Breakpoints

```css
/* Mobile First */
default: 0-768px

/* Tablet */
md: 768px+

/* Desktop */
lg: 1024px+

/* Large Desktop */
xl: 1280px+
```

### Mobile Adaptations
- Floating islands adjust to smaller viewport
- Todo panel becomes slide-over overlay
- Character size reduces
- Touch-friendly button sizes (min 44px)
- Single column layouts

---

## Accessibility

### Color Contrast
- Text on background: 7:1 minimum
- Interactive elements: Clear focus states
- Color not sole indicator (icons + text)

### Motion
- Respect `prefers-reduced-motion`
- Provide static alternatives
- No flashing/strobing effects

### Screen Readers
- Semantic HTML structure
- ARIA labels for icon-only buttons
- Live regions for dynamic updates

---

## Page Flows

### Hub → Island → Feedback → Hub
1. User clicks island from hub
2. Island detail page loads with form
3. User completes check-in
4. Success animation displays
5. Auto-redirect to hub (2s delay)
6. Island shows updated streak/glow

### Reminder Flow
1. Todo/deadline approaches
2. Character displays gentle notification
3. User can acknowledge or postpone
4. No shame for dismissing

### Recovery Flow
1. User returns after missed days
2. Recovery message displays automatically
3. Supportive language, no guilt
4. Option to continue journey
5. Fresh start, no penalty

---

## Theming

### Dark Mode (Default)
Mind Islands uses dark mode by default for cozy night-sky aesthetic.

### Light Mode Considerations
If implementing light mode:
- Maintain soft, muted palette
- Preserve emotional warmth
- Keep character glow effects
- Test all color combinations

---

## Development Guidelines

### Component Structure
```
/components
  /Character.tsx         - Avatar system
  /IslandCard.tsx       - Island modules
  /TodoPanel.tsx        - Task sidebar
  /AIChat.tsx           - Companion chat
  /FeedbackMessage.tsx  - Status feedback
  /StreakDisplay.tsx    - Progress visualization
  /WeeklySummary.tsx    - Stats overview
  /EmptyState.tsx       - First-time UX
  /RecoveryMessage.tsx  - Comeback support
```

### State Management
- Uses React Context for global state
- localStorage for persistence
- No backend required for MVP

### Data Models
See `/src/app/types.ts` for:
- Character states
- Island configuration
- Check-in structure
- Todo items
- Chat messages

---

## Voice & Tone

### Writing Guidelines

#### ✅ DO
- "Welcome back, friend 🌙"
- "You're doing wonderfully!"
- "Every small step matters"
- "It's okay to take breaks"
- "Let's make today count"

#### ❌ DON'T
- "You missed X days!" (shaming)
- "Get back on track" (pressure)
- "Failure to complete" (harsh)
- Corporate/clinical language
- Productivity jargon

### Emoji Usage
Use sparingly and meaningfully:
- 🌙 Night/rest
- ✨ Success/magic
- 🌱 Growth/beginning
- 💜 Care/support
- 🌟 Achievement

---

## Future Enhancements

### Planned Features
1. **Character Evolution**: Visual changes based on overall progress
2. **Island Customization**: User can personalize colors/icons
3. **Habit Templates**: Pre-made habit suggestions per island
4. **Weekly Reflections**: Guided journaling prompts
5. **Reminder Notifications**: Gentle browser notifications
6. **Export Data**: Download progress as JSON/CSV
7. **Themes**: Additional color schemes (sunset, ocean, forest)

### Technical Roadmap
1. Supabase integration for cloud sync
2. Progressive Web App (offline support)
3. Social features (optional friend accountability)
4. AI-powered insights (trend detection)

---

## Credits & Inspiration

**Design Influences**:
- Monument Valley (whimsical puzzle aesthetic)
- Finch (self-care companion app)
- Habitica (gamified habits)
- Calm/Headspace (emotionally safe UX)

**Psychology Foundation**:
Based on self-determination theory, habit formation research, and trauma-informed design principles.

---

## Questions?

For implementation questions or design clarifications, refer to:
- Component source code in `/src/app/components`
- Theme tokens in `/src/styles/theme.css`
- Page examples in `/src/app/pages`