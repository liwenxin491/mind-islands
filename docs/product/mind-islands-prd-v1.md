# Mind Islands PRD v1

## 1. Document Info
- Product: Mind Islands
- Version: v1.0 (draft)
- Date: 2026-05-17
- Purpose: Provide a structured product definition for user-flow redesign, feature prioritization, and future iteration decisions.

## 2. Executive Summary
Mind Islands is a mobile-first reflective wellbeing product built around a sea otter avatar, island-based organization, and AI-assisted journaling. The product's long-term value depends on one foundational condition: users must keep giving us meaningful input over time. Without sustained input, the system cannot understand users well enough to generate relevant, emotionally supportive output.

This PRD reframes product design around one central question:

**How do we increase both the frequency and depth of user input, while ensuring the product returns emotionally useful output that reinforces continued use?**

The product should not be designed as a collection of isolated features. It should be designed as a behavioral system with a clear loop:

1. User notices or experiences something
2. User is invited into low-friction input
3. Product organizes and reflects that input back meaningfully
4. User feels understood, supported, or more clear
5. User becomes more willing to return and input again

That loop is the true product.

## 3. Background and Problem Statement
### 3.1 Current situation
The current product has several promising ingredients:
- A strong emotional metaphor: sea otter as self-externalization
- A meaningful spatial model: islands as life areas / memory organization
- Multiple interaction surfaces: Quick Log, Memories, To-do, Inspiration, Harbor
- AI assistance for transforming natural-language input into structured records

However, product discussions and implementation have often happened at the feature level rather than the system level. This creates a pattern where:
- we identify one pain point
- solve that pain point in isolation
- but do not always improve the total user loop

### 3.2 Core product problem
The product fundamentally depends on user input.

We need enough input along at least two dimensions:
- **Frequency**: users return often enough to build a durable habit
- **Depth / volume per session**: users provide enough content in each interaction for the system to understand context and return value

At the same time, output must do more than summarize. It must create a psychologically positive effect such as:
- feeling accompanied
- feeling understood
- feeling less overwhelmed
- feeling more self-compassionate
- feeling clearer about what happened and what matters next

### 3.3 Product design challenge
We are not simply optimizing a journaling app, and we are not building a generic chatbot. We are building a reflective behavior system in which:
- input quality determines future relevance
- output quality determines future willingness to input again

Therefore the product must be designed around **input reinforcement loops** and **emotionally useful output loops**.

## 4. Product Vision
Create a reflective wellbeing companion that helps users continuously externalize their inner experience, organize their life into meaningful domains, and receive emotionally supportive feedback that makes returning feel natural.

The sea otter is not a pet and not a mascot assistant. It is the user's externalized self: a gentle intermediary that helps the user notice, record, interpret, and support their own life.

## 5. Product Principles
### 5.1 Self-externalization, not AI authority
The product should not feel like an external system evaluating the user. The sea otter speaks in a first-person or self-supportive voice and helps the user practice self-compassion and self-clarity.

### 5.2 Input must feel easy, safe, and worthwhile
Users should feel that input is:
- low-friction to start
- emotionally safe
- never judged
- worth doing because it produces meaningful return value

### 5.3 Output must earn the next input
The product should not merely store information. It should turn input into value that increases the likelihood of future input.

### 5.4 Structure should support reflection, not bureaucracy
The product needs enough structure to organize life patterns, but not so much that it feels like administrative overhead.

### 5.5 One world, multiple interaction modes
Quick Log, Memories, Inspiration, Harbor, To-do, and insights should feel like parts of one emotional world rather than separate utilities.

## 6. Target User
### 6.1 Primary user
A Gen Z or young millennial user who:
- wants to track their life more meaningfully
- is emotionally aware or trying to become more emotionally aware
- benefits from self-compassion and reflective support
- may find traditional productivity tools too cold or too rigid
- may not consistently journal without a stronger interaction loop

### 6.2 Core motivations
- “I want an easier way to log what is happening in my life.”
- “I want to feel less alone with what I am carrying.”
- “I want to understand my patterns.”
- “I want a tool that feels gentle, not punishing.”
- “I want AI help, but I do not want it to feel generic or sterile.”

## 7. Jobs To Be Done
### 7.1 Functional jobs
- Quickly record what happened today
- Capture memories or events into appropriate life domains
- Track progress toward work and learning goals
- Review what has been happening over time
- Maintain and prioritize practical to-dos

### 7.2 Emotional jobs
- Feel accompanied in daily life
- Feel less overwhelmed by unprocessed experience
- Feel encouraged without feeling patronized
- Practice supportive self-talk
- Feel that their internal life is being held and organized

### 7.3 Social / identity jobs
- Feel like “I am someone who checks in with myself”
- Build a self-image of consistency, reflection, and care

## 8. Core Product Loop
### 8.1 Loop definition
1. **Trigger**
   - internal: stress, accomplishment, confusion, inspiration, unfinished tasks
   - external: reminder, streak prompt, bedtime cue, goal check-in need

2. **Input action**
   - Quick Log via natural language
   - goal check-in
   - to-do capture
   - memory add / edit
   - Harbor interaction

3. **System processing**
   - AI categorizes, summarizes, or routes input
   - system updates memories / goals / to-do / streaks
   - system produces tailored reflective response

4. **Output value**
   - emotional validation
   - clearer organization
   - reduced ambiguity
   - surfaced pattern or next step
   - felt progress / continuity

5. **Return motivation**
   - user feels the product is useful enough to revisit
   - habit loop strengthens

### 8.2 Loop quality criteria
A good loop should:
- minimize start friction
- encourage more than one sentence of input when possible
- make system value legible
- reinforce user trust and safety
- create continuity over time

## 9. Key Product Goals
### 9.1 Input goals
#### Goal A: Increase input frequency
Users should build a recurring habit of checking in.

Design implications:
- easier entry points
- emotionally safe reminders
- quick-start language prompts
- low commitment initial actions
- visible continuity (e.g. gentle streaks, memory accumulation)

#### Goal B: Increase input depth per session
Users should give enough information per interaction for the system to understand and help.

Design implications:
- natural language first
- follow-up prompts that feel helpful, not interrogative
- contextual nudges that invite elaboration
- “one thing leads to another” rather than hard forms upfront

### 9.2 Output goals
#### Goal C: Increase perceived understanding
Users should feel the system “gets” what they meant.

#### Goal D: Increase emotional helpfulness
Users should leave interactions feeling calmer, clearer, more supported, or more compassionate toward themselves.

#### Goal E: Increase continuity value
Users should feel that past input matters because it shapes future product behavior and insight.

## 10. Success Metrics
### 10.1 Primary metrics
- Weekly active users who input at least once
- Average input sessions per active user per week
- Average meaningful input length per Quick Log session
- Percentage of users who return within 3 days after first meaningful input
- Percentage of users who receive AI-organized memory output after Quick Log

### 10.2 Secondary metrics
- Average number of follow-up turns in Quick Log
- Goal check-in frequency per active goal
- To-do creation to completion ratio
- Harbor usage among users after stress-related input
- Percentage of users who revisit Memories within 7 days

### 10.3 Quality metrics
- User-reported feeling understood
- User-reported emotional usefulness
- AI routing accuracy to correct memory island
- Manual corrections after AI categorization

## 11. Product Scope: System Roles
### 11.1 Home
Purpose:
- emotional anchor
- low-friction starting point
- world map and re-entry surface

Home should answer:
- What can I do right now?
- Why should I check in?
- Where should I go if I want to log, reflect, or review?

### 11.2 Quick Log
Purpose:
- primary natural-language input channel
- lowest-friction capture mode
- main mechanism for increasing input frequency and depth

Quick Log should:
- feel faster than manual entry
- invite user storytelling
- generate structured memory outputs
- optionally create or update to-dos
- support light follow-up when more clarity is useful

### 11.3 Memories
Purpose:
- organized archive of life input
- main continuity system

Structure:
- top-level “Memories” entry
- second-level islands:
  - Health
  - Work
  - Learning
  - Relationship

Memories should help users feel:
- “my life is being held somewhere meaningful”
- “what I logged does not disappear”

### 11.4 Inspiration
Purpose:
- capture sparks, curiosity, ideas, and future-facing thoughts
- less about emotional processing, more about open-ended mental expansion

### 11.5 Harbor
Purpose:
- emotional rest
- self-compassion
- decompression
- recovery from overwhelm

Harbor is not just another category. It is the clearest emotional intervention surface in the product.

### 11.6 To-do
Purpose:
- transform reflected life input into practical action
- reduce cognitive load
- support consistency in work / learning / personal life

To-do should not dominate the emotional experience, but it should connect to real-life follow-through.

### 11.7 Insights / Review
Purpose:
- make patterns visible
- create meaning from accumulated input
- reinforce the value of continued use

## 12. Input Strategy Design
### 12.1 Frequency levers
To increase how often users return to input:
- Home should offer emotionally relevant re-entry prompts
- the sea otter should frame input as low-pressure and valuable
- reminders should be gentle and contextual
- streaks should encourage continuity without shame
- unfinished loops should create natural return reasons

Examples:
- bedtime soft prompt
- “one short log still counts” framing
- goal check-in reminders
- surfacing unresolved tasks or recent emotional threads

### 12.2 Depth levers
To increase how much users give in a single flow:
- Quick Log should begin easy, then deepen naturally
- AI follow-up should be selective and high-value
- responses should reward specificity by reflecting it back well
- users should see that longer or richer input leads to better outputs

Examples:
- “What happened?” → “What part stayed with you most?”
- after a concrete event → optional emotional reflection follow-up
- after stress → optional Harbor bridge

### 12.3 Cross-surface input reinforcement
Input should not only come from Quick Log.
It should also come from:
- goal check-ins
- to-do completions
- Harbor sessions
- idea captures
- memory edits and reviews

Each of these can become another entry point into the reflective system.

## 13. Output Strategy Design
### 13.1 Output types
The product can return value through:
- emotional mirroring
- summarization
- categorization
- continuity / recall
- pattern surfacing
- encouragement
- action framing

### 13.2 Output quality standard
Output should feel:
- warm
- specific
- non-judgmental
- grounded in the user's actual input
- useful enough to justify future input

### 13.3 Output should close loops
Good output should help the user feel one of the following:
- “That captured what I meant.”
- “That helped me understand what happened.”
- “That made it easier to keep going.”
- “That turned a vague feeling into something manageable.”

## 14. Proposed User Flows
### 14.1 Primary daily flow: Quick Log first
1. User opens Home
2. User taps sea otter or Quick Log
3. User shares what happened in natural language
4. AI responds supportively and organizes the input
5. System routes the memory to one island
6. If relevant, system suggests a to-do or Harbor bridge
7. User leaves feeling seen and more organized

### 14.2 Stress / overwhelm flow
1. User opens app while distressed
2. Home or Quick Log detects stress-like language
3. AI responds with support and offers Harbor
4. User enters Harbor for self-compassion or calming interaction
5. Optional later bridge back to Memories or To-do

### 14.3 Goal progress flow
1. User enters Work or Learning
2. User checks progress, updates goal, or checks in
3. Check-in becomes part of daily record
4. Product reinforces continuity and visible progress
5. User returns later because the goal history is accumulating meaningfully

### 14.4 Reflection / review flow
1. User opens Memories or Insights
2. User sees accumulated entries and patterns
3. Review creates meaning and recognition
4. User feels more motivated to continue inputting in the future

## 15. Functional Requirements
### 15.1 Quick Log
Must:
- support natural-language input
- create structured memory outputs
- optionally generate to-dos
- maintain emotional tone quality
- support selective follow-up questions

### 15.2 Memories
Must:
- preserve categorized inputs
- expose four memory islands
- allow users to navigate and review stored content
- maintain continuity between Quick Log and archive

### 15.3 Goal systems (Work / Learning)
Must:
- allow user-defined goals
- support check-in models
- support visible progress
- feed goal activity into daily log history

### 15.4 To-do
Must:
- allow capture, editing, prioritization, and completion
- optionally emerge from Quick Log
- support user correction when AI priority is imperfect
- remain useful but not emotionally dominant

### 15.5 Harbor
Must:
- support self-compassion use cases
- feel emotionally distinct from standard logging
- offer de-escalation, reflection, or soothing interactions

## 16. Non-Goals (for this phase)
This phase is not primarily about:
- social sharing
- multiplayer or community features
- gamified rewards economy
- heavy analytics dashboards
- highly detailed customization systems
- medical or clinical claims

## 17. Open Questions
- What is the minimum amount of input needed for users to feel “understood”?
- When does follow-up questioning help vs. reduce willingness to continue?
- Should Harbor be explicitly suggested by the system, or mostly user-initiated?
- How much manual correction should users be able to do after AI routing?
- What is the right relationship between Quick Log and To-do generation?
- Which metrics best predict eventual retention: frequency, depth, or perceived usefulness?

## 18. Risks
### 18.1 Input fatigue
If the product asks too much too often, users may stop engaging.

### 18.2 Generic AI output
If outputs feel generic, users will not believe that input matters.

### 18.3 Over-structuring
If too many forms or categories appear too early, the product may feel bureaucratic.

### 18.4 Under-structuring
If everything stays too open-ended, accumulated input may not feel useful or retrievable.

### 18.5 Emotional mismatch
If language sounds too clinical, too cheerful, or too obviously machine-generated, trust will drop.

## 19. Suggested Product Development Process
To avoid feature-by-feature drift, future iteration should follow this order:

1. Define the user loop being improved
2. Define which metric it should move
3. Define what behavior change is expected
4. Only then define UI / feature changes
5. After implementation, review whether the loop actually improved

Every major feature proposal should answer:
- Which part of the input-output loop does this improve?
- Does it increase frequency, depth, output usefulness, or continuity?
- If removed, what product outcome becomes worse?

## 20. Recommended Next Product Decisions
### Priority 1
Clarify the primary daily loop around Quick Log:
- what the opening prompt is
- when follow-up happens
- how memories are reflected back
- when Harbor is suggested

### Priority 2
Define the relationship between Memories and review value:
- what users should feel when entering a memory island
- what kinds of summarization or resurfacing are helpful

### Priority 3
Define the role of To-do more precisely:
- practical action support
- not a standalone productivity engine
- when and how tasks should emerge from reflective input

### Priority 4
Formalize emotional output principles:
- tone guide
- response quality rubric
- what “helpful” means in this product context

## 21. Summary
Mind Islands should be developed as a behavior loop product, not a collection of isolated features.

The system succeeds when:
- users input often enough
- users input deeply enough
- output feels emotionally and practically useful enough to bring them back

The central product challenge is not only “what features exist,” but “how input and output continuously reinforce each other.”

This PRD should be used as the basis for future user-flow design, feature prioritization, and iteration review.
