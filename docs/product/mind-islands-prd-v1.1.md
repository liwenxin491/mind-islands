# Mind Islands PRD v1.1

## 1. Document Info
- Product: Mind Islands
- Version: v1.1
- Date: 2026-05-17
- Status: Draft for partner discussion
- Purpose: Update the product definition using recent user-research learnings, especially around input friction, AI interaction structure, and reflective output.

## 2. Executive Summary
Mind Islands is a mobile-first reflective wellbeing product built around a sea otter avatar, AI-assisted logging, life-island organization, and emotionally supportive reflection.

The current product question is no longer just "what features should we add?"
It is:

**How do we reduce input friction enough that users keep coming back, while still generating output that feels emotionally useful and worth returning for?**

Recent research and product thinking suggest that the most important product challenge is not feature breadth. It is habit formation around input.

This leads to one primary design principle for the next phase:

> **The product should minimize the effort required to begin input, then selectively deepen the interaction only when doing so creates clear value.**

## 3. Core Product Hypothesis
If we make input feel easier, safer, and more rewarding, users will:
- return more often
- provide more input over time
- trust the product more
- receive better summaries, memory organization, and emotional support
- build a durable check-in habit

This means product success depends on two linked systems:

### 3.1 Input system
We must increase:
- **Frequency**: how often users return and check in
- **Depth**: how much useful information users provide per session

### 3.2 Output system
We must ensure output creates value through:
- emotional validation
- practical organization
- continuity and memory
- structured reflection
- visible progress and insight

Input drives future relevance. Output drives future willingness to input again.

## 4. Product Vision
Create a reflective wellbeing companion that helps users externalize their inner life, organize what matters, and receive emotionally supportive, structured feedback that makes it easier to return.

The sea otter is not a pet or an authority. It is the user's externalized self: a gentle intermediary through which the user notices, records, organizes, and supports their own life.

## 5. Strategic Product Principles
### 5.1 Reduce input friction aggressively
The easiest way to lose users is to make the first step feel effortful.

The product should prefer:
- tap-based input before text when appropriate
- quick check-ins before open writing
- one-tap or few-tap starts
- optional depth rather than mandatory depth

### 5.2 AI should hide complexity, not create it
Users should not need to decide where every input belongs.
The AI system should do the categorization work whenever possible.

### 5.3 Structure belongs after input, not before input
Users should usually begin with expression, not classification.
Memories, islands, goals, and cards should organize meaning after the user has already entered something.

### 5.4 Output must reward input
Every input should lead to some visible return:
- emotional support
- organization into the right place
- reflection card
- insight
- progress update
- next step

### 5.5 The product should feel like one world, with layered interaction depth
The app should not feel like disconnected utilities. It should feel like one coherent world with different levels of reflection and support.

## 6. Updated Product Problem Statement
### 6.1 What we now believe
From user research and internal discussion, we now believe the biggest risk is not underpowered AI or missing features.
It is that users may not provide enough input consistently because input still feels too effortful.

### 6.2 Therefore, the next product challenge is:
How do we design an experience where:
- users can check in quickly with almost no friction
- users are gently invited into deeper reflection when useful
- AI organizes and transforms input into something meaningful
- output creates enough positive psychological value to make returning feel natural

## 7. Product Goals
### 7.1 Primary goals
1. Increase low-friction daily input
2. Increase input depth when users are willing
3. Improve the perceived usefulness of summaries, organization, and emotional reflection
4. Make continued usage feel rewarding through insight, memory continuity, and visible progress

### 7.2 Supporting goals
1. Keep organization powerful without making it feel bureaucratic
2. Maintain a clear separation between practical logging and deeper emotional support
3. Create future-friendly surfaces for monetization without harming clarity

## 8. Core Product Loop (Updated)
### 8.1 Loop definition
1. User opens the app
2. User receives an easy check-in or low-friction prompt
3. User gives lightweight or deeper input
4. AI organizes, reflects, and optionally follows up
5. Product returns emotional and/or practical value
6. User feels the product is worth returning to

### 8.2 Product implication
The first 10 seconds of app use matter disproportionately.
The product should not ask too much too early.

## 9. Key User Flows to Prioritize
### 9.1 Quick check-in flow
Goal: make daily entry extremely easy

Example:
1. User opens app
2. App asks lightweight check-in prompts such as:
   - How are you feeling?
   - How did you sleep?
   - What kind of day has this been?
3. User taps one or more preset responses
4. User may stop there or continue into deeper input

Why this matters:
- lowers activation cost
- creates daily habit entry point
- ensures more users give some input, even on low-energy days

### 9.2 Quick Log flow
Goal: main natural-language input channel

Example:
1. User taps otter or Quick Log
2. User speaks or types what happened
3. AI responds supportively
4. AI routes the input to an appropriate memory island
5. If useful, AI suggests a to-do, a reflection, or Harbor

Why this matters:
- captures richer input
- gives AI enough context to be helpful
- preserves low friction while allowing depth

### 9.3 Deep reflection flow
Goal: provide structured emotional support when needed

Example:
1. User begins in Quick Log
2. AI detects emotional strain, conflict, or confusion
3. AI offers a deeper reflective pathway
4. User enters a more guided conversation
5. The system turns the result into a structured card

This should be optional, not default.

### 9.4 Review / insight flow
Goal: create positive reinforcement through structured reflection

Example:
1. User opens daily or weekly review
2. Product highlights patterns, progress, and themes
3. User sees evidence that past input mattered
4. This increases future willingness to input

## 10. Updated Thinking on Key Product Decisions
### 10.1 Quick check-in should become easier
We should support ultra-low-friction check-ins at app entry.

Recommended:
- preset chips
- quick tap-based mood / sleep / day-state selections
- optional expansion into deeper input

Decision:
- **Support this direction**
- Make the first input step lighter than current open-text-heavy flows

### 10.2 Islands should remain, but classification should not burden the user
We should not remove the island structure entirely.
But we also should not force users to choose categories before input.

Decision:
- keep the island model as the organizational backbone
- let AI classify most input behind the scenes
- make categories more visible in review and memory retrieval than in initial input

This means:
- islands stay
- user classification effort goes down

### 10.3 Insights and summaries should be emphasized, but carefully
Insights are important because they create structured positive feedback and show progress.
However, insights without enough input will feel hollow.

Decision:
- emphasize insights as a reward layer
- begin with lightweight, meaningful daily/weekly summaries
- avoid overbuilding dashboard-style analytics too early

Good early examples:
- what theme came up most this week
- what you returned to most often
- what you completed
- where you showed care for yourself

### 10.4 DBT-inspired techniques should be a deeper layer, not the default layer
We want to use DBT-inspired techniques such as ABC cards and emotional reflection cards.
This is promising, but it should not dominate the default user flow.

Decision:
- use DBT-inspired structures as optional or triggered deepening tools
- do not require them in the main fast logging flow
- allow conversations to later generate structured cards such as:
  - ABC card
  - emotion card
  - coping / reflection card

This preserves:
- accessibility
- emotional sophistication
- future product depth

### 10.5 Quick Log and Self-Compassion should not be fully merged, but they also should not feel disconnected
There is a legitimate risk that two separate chat systems may confuse users.
But fully merging them would blur their purpose.

Current product recommendation:
- one shared entry surface
- two internal modes

Suggested framing:
- `Log with me`
- `Sit with me`

This allows:
- lower user confusion
- separate prompt / model behavior
- clearer emotional boundaries
- future monetization separation

Decision:
- do **not** fully merge into one indistinguishable chat
- do **not** keep them as completely unrelated experiences
- prefer **one entry, two distinct modes**

## 11. Product Architecture: Surface Roles
### 11.1 Home
Role:
- emotional entry point
- low-friction check-in surface
- navigation to deeper modes

### 11.2 Quick Log
Role:
- primary natural-language input system
- practical logging and life capture
- optional launch point for deeper reflection

### 11.3 Harbor
Role:
- deeper self-compassion and emotional support surface
- more guided, more explicitly restorative

### 11.4 Memories
Role:
- archive and continuity layer
- post-input organization and retrieval

Second-level islands:
- Health
- Work
- Learning
- Relationship

### 11.5 Inspiration
Role:
- capture sparks, ideas, curiosity, creative directions

### 11.6 To-do
Role:
- practical action layer
- should emerge naturally from life input when relevant
- must not dominate the emotional center of the product

### 11.7 Insights
Role:
- periodic reinforcement layer
- prove that past input generates value

## 12. Input Strategy
### 12.1 Frequency levers
To increase how often users input:
- fast home check-ins
- emotionally safe prompts
- bedtime or day-state nudges
- reminder loops tied to goals and unfinished tasks
- visible continuity and review surfaces

### 12.2 Depth levers
To increase how much users input per session:
- natural language first
- smart follow-up only when useful
- optional expansion from check-in to conversation
- good reflections that make deeper input feel worth it

### 12.3 Input sources
The product should collect input through:
- home check-in
- Quick Log
- goal check-ins
- to-do creation/completion
- Harbor conversations
- memory review/correction
- inspiration capture

## 13. Output Strategy
### 13.1 Output forms
The product can return value through:
- emotional mirroring
- categorization into the right island
- action suggestion
- structured cards
- daily / weekly summaries
- progress visibility
- resurfacing old threads or patterns

### 13.2 Output quality criteria
Output should feel:
- warm
- specific
- grounded in what the user actually said
- not generic
- not overly clinical
- helpful enough to justify future input

## 14. Success Metrics
### 14.1 Primary metrics
- percentage of users who complete at least one input in first session
- weekly active users with at least one input
- average number of inputs per active user per week
- percentage of users who return within 3 days
- average Quick Log turns per session

### 14.2 Secondary metrics
- percentage of users who move from quick check-in to deeper input
- percentage of Quick Log sessions routed into Memories
- percentage of sessions that produce a to-do, card, or summary
- Harbor usage among stress-like sessions
- weekly review open rate

### 14.3 Qualitative metrics
- “I felt understood”
- “It was easy to check in”
- “The summary felt useful”
- “This made me want to come back”

## 15. Priorities for the Next Phase
### P1
- make entry check-ins much easier
- remove user-facing categorization burden from the input stage
- define one shared conversation entry with two modes

### P2
- improve Quick Log → structured memory → useful output loop
- build lightweight daily/weekly summary surfaces

### P3
- introduce DBT-inspired structured cards as optional deepening outputs

## 16. Non-Goals for This Phase
- complex dashboard analytics
- heavy manual classification workflows
- social/community features
- overly clinical therapy framing
- deep customization systems

## 17. Open Questions
- What is the minimum useful first-session input?
- How often should the system ask a follow-up question before it starts feeling tiring?
- How explicit should mode switching between logging and self-compassion be?
- Which summary formats feel rewarding without becoming repetitive?
- When should a structured card be suggested, and when should it stay hidden?

## 18. Summary
Mind Islands should be treated as a behavioral input-output system.

The product wins if:
- users can start input easily
- users are willing to go deeper when needed
- the system transforms input into emotionally and practically useful output
- this output makes users want to return

The most important product principle for the next phase is:

> **Lower the cost of beginning, then earn the right to ask for more.**
