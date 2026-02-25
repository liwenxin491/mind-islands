# 🌙 Mind Islands

A cozy, emotionally supportive self-care and life-tracking experience that feels like a warm game, not a productivity dashboard.

## ✨ About

Mind Islands helps you care for yourself by caring for a virtual companion. Build healthy habits across five life areas—Body & Health, Work, Learning, Relationships, and Curiosity—while watching your character and world grow more beautiful with your consistency.

## 🎮 Core Features

### The Hub World
- **Central Character**: Your companion that reflects your self-care state (happy/neutral/tired)
- **5 Floating Islands**: Each representing a life area with unique colors and tracking
- **Animated Environment**: Starry night sky, gentle floating animations, soft glows

### Island Check-Ins
- **Mood Tracking**: Visual slider from struggling to thriving
- **Daily Reflections**: Optional journaling with supportive prompts
- **Quick Actions**: Pre-made habit completions
- **Streak System**: Fire icons showing consecutive days
- **History View**: See past check-ins with mood indicators

### AI Companion Chat
- **Supportive Responses**: Warm, kind, recovery-focused messaging
- **Daily Reflections**: Chat about your day and feelings
- **No Judgment**: Always encouraging, never shaming

### To-Do List Panel
- **Task Management**: Add, complete, delete tasks
- **Progress Tracking**: Visual completion percentage
- **Island Association**: Link tasks to specific life areas
- **Mobile Responsive**: Slide-over panel on mobile

### Progress Insights
- **Weekly Summary**: Stats across all islands
- **Streak Displays**: Individual and total streaks
- **Activity Breakdown**: Island-by-island engagement
- **Encouraging Feedback**: Milestone celebrations and supportive messages

## 🎨 Design System

### Color Palette
- **Background**: Deep purple night sky (`#1a0f2e`)
- **Islands**: Green (Body), Blue (Work), Purple (Learning), Pink (Relationships), Amber (New)
- **Accents**: Gold for success, soft purple for interactive elements
- **Mood Colors**: Golden (happy), purple (neutral), slate (tired)

### Typography
- **Font**: Inter with system fallbacks
- **Style**: Clean, readable, emotionally warm

### Animations
- **Floating**: Islands and character gently bob
- **Glows**: Pulsing halos on success/active states
- **Particles**: Sparkles on achievements
- **Smooth Transitions**: Ease-in-out for calm, organic feel

### Responsive Design
- **Mobile**: Touch-friendly, slide-over panels, adjusted layouts
- **Tablet**: Optimized spacing and component sizing
- **Desktop**: Full sidebar, multi-column layouts

## 🧠 Psychology Foundation

Based on:
- **Self-Determination Theory**: Autonomy, competence, relatedness
- **Habit Formation Research**: Small steps, consistency over perfection
- **Trauma-Informed Design**: Safety, choice, collaboration, empowerment

## 🛠️ Technical Stack

- **Framework**: React 18.3 with TypeScript
- **Routing**: React Router v7 (Data mode)
- **Styling**: Tailwind CSS v4
- **Animations**: Motion (Framer Motion successor)
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State**: React Context + localStorage
- **Notifications**: Sonner toast library

## 📁 Project Structure

```
/src
  /app
    /components       - Reusable UI components
      Character.tsx   - Avatar with mood states
      IslandCard.tsx  - Floating island modules
      TodoPanel.tsx   - Task sidebar
      AIChat.tsx      - Companion chatbot
      StreakDisplay.tsx - Progress visualization
      WeeklySummary.tsx - Stats overview
      ...
    /context         - Global state management
      MindIslandsContext.tsx
    /pages           - Route pages
      Hub.tsx        - Main world view
      IslandDetail.tsx - Check-in forms
      Insights.tsx   - Progress stats
      Onboarding.tsx - Character selection
    /types.ts        - TypeScript definitions
    /routes.tsx      - Router configuration
    App.tsx          - Root component
  /styles
    theme.css        - Color tokens, base styles
    fonts.css        - Font imports
```

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Configure environment in `.env.local` (see `.env.example`):
   - `GEMINI_API_KEY`
   - `DATABASE_URL` (PostgreSQL/RDS)
   - `JWT_SECRET`
3. Start app + local API together: `npm run dev`
4. Open the printed URL (typically `http://localhost:5173` or `http://localhost:5174`)
5. Register an account, sign in, and use Mind Islands with cloud-synced progress

Production run:
- Build frontend: `npm run build`
- Start production server: `npm start`
- AWS deployment guide: `DEPLOY_AWS_EC2.md`
- Personal AWS account guide: `AWS_OWN_ACCOUNT_SETUP.md`

## 🎯 User Flow Examples

### First Visit
1. Character greets you on the hub
2. Click any island to make your first check-in
3. Fill mood slider and optional note
4. Save to see success animation
5. Return to hub with updated streak

### Daily Routine
1. Open app to see your character
2. Check islands with active streaks
3. Add tasks to to-do list
4. Chat with companion about your day
5. Complete check-ins as needed

### Recovery Flow
1. Return after missed days
2. See supportive welcome message
3. No penalty or shame language
4. Continue journey with fresh start

## 💝 Design Philosophy

### What Mind Islands Is:
- ✅ Emotionally safe and supportive
- ✅ Cozy, whimsical, and playful
- ✅ Focused on self-compassion
- ✅ Progress-oriented, not perfection-oriented

### What Mind Islands Is Not:
- ❌ A harsh productivity tracker
- ❌ Shame-inducing or guilt-driven
- ❌ Corporate or clinical feeling
- ❌ One-size-fits-all prescriptive

## 🌱 Future Enhancements

- **Character Evolution**: Visual changes based on progress
- **Custom Themes**: Sunset, ocean, forest color schemes
- **Habit Templates**: Pre-made suggestions per island
- **Data Export**: Download progress as JSON
- **Cloud Sync**: Supabase integration for multi-device
- **Notifications**: Gentle browser reminders

## 📖 Documentation

See [DESIGN_SYSTEM.md](/DESIGN_SYSTEM.md) for comprehensive design guidelines, component APIs, and development patterns.

## 🤝 Contributing

This is a personal project focused on emotional wellbeing and self-care. Contributions should align with the core philosophy of warmth, kindness, and support.

## 📜 License

This project is created as a psychological wellness tool. Please use responsibly and ethically.

---

## 💌 A Note to Users

Remember: This app is a tool to support your journey, not to judge it. Every check-in is an act of self-love. Every break is valid. You're doing great just by being here.

Take care of your islands. Take care of yourself. 🌙✨
