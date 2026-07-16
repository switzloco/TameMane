# Task Checklist

## Phase 1 — Client-Side Features

### Text Selectability
- [x] Add `select-text` class to content div in `TaskCard.jsx` (line 48)
- [x] Verify text is selectable on mobile and desktop

### Research Function
- [x] Create `researchTask(task, propertyContext)` in `pmAgent.js`
  - [x] Research-focused system prompt (see `RESEARCH_PROMPT_TEMPLATE` stub)
  - [x] Returns `{ summary, costEstimate, steps, recommendations }`
  - [x] Use `gemini-2.0-flash` model for research calls (cheaper, fast)
  - [x] Integrate attached photo descriptions to make research visually aware
- [x] Add research intent detection to PM system prompt (rule 17-19)
- [x] Add `research_task` action type to PM agent JSON schema

### Research Button on TaskCard
- [x] Add ✨ button to action panel in `TaskCard.jsx`
- [x] Add loading state (shimmer/spinner) while researching
- [x] Add collapsible results section below description
- [x] Read cached results from `task.researchNotes` on render
- [x] On click: call `researchTask()` → save to Firestore via `dbService.saveTask()` → display

### Multimodal Task Photos
- [x] Create resize utility `resizeImage` in `src/utils/imageHelpers.js`
- [x] Add camera capture and library upload buttons inside Edit Task modal
- [x] Generate structured JSON description `describeTaskImage()` via Gemini Vision (saves database size)
- [x] Save `images` (thumbnails) and `imageDescriptions` (JSON details) on the task document
- [x] Render thumbnail preview strip on `TaskCard`
- [x] Feed image descriptions into PM research agent prompt for visual awareness

### Chat Integration
- [x] Handle `research_task` action in `executeAgentAction()` in `ChatPage.jsx`
- [x] Save findings to `task.researchNotes` field
- [x] Display research as rich formatted system message
- [/] Handle `create_subtasks` action (batch subtask creation)

### Discord Notifications
- [x] Create `notificationService.js` with `sendDiscordNotification()`
- [x] Add `VITE_DISCORD_WEBHOOK_URL` to `.env.local`
- [x] Fire notification on task completion when it unblocks other tasks
- [x] Fire notification when research completes (from button)

### PM Agent Prompt Updates
- [x] Rule 17: Research intent detection (see stub)
- [x] Rule 18: Task batching suggestions (see stub)  
- [x] Rule 19: Auto-subtask offers for meta-tasks (see stub)

## Phase 1.5 — Firebase Cloud Functions (Later)

- [ ] Initialize Firebase Functions in project (`firebase init functions`)
- [ ] Create `dailyDigest` scheduled function
- [ ] Create `onTaskStatusChange` Firestore trigger
- [ ] Deploy and test

## Phase 2 — Future
- [ ] Google Calendar API integration
- [ ] Email digest via Firebase Trigger Email
- [ ] Marketplace listing monitoring
