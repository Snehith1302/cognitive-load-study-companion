# Cognitive Load-Aware Study Companion

A full-stack web application that helps students study smarter by measuring cognitive effort and providing AI-driven recommendations to prevent burnout and improve retention.


## Problem Statement

Students often study for extended hours without understanding their mental fatigue levels. This leads to:
- Cognitive burnout and reduced learning efficiency
- Poor information retention despite long study hours
- Lack of awareness about optimal break timing
- Ineffective study patterns that harm long-term performance

Existing study apps only track time, but **time spent does not equal effective learning**. This application measures cognitive effort and provides intelligent recommendations.

---

## Core Features

### 1. User Authentication
- Secure email/password authentication powered by Supabase Auth
- Protected routes and user-specific data
- Session management with automatic token refresh

### 2. Study Session Tracker
- **Start/Stop Sessions**: Begin tracking with one click
- **Subject Selection**: Categorize study sessions by subject
- **Real-time Duration Tracking**: Live timer showing elapsed study time
- **Pause Functionality**: Track breaks and pauses during sessions
- **Task Switching Detection**: Monitor when you switch between subjects

### 3. Cognitive Load Scoring Engine

The application calculates a cognitive load score (0-100) using a weighted formula:

```
Cognitive Load Score = (D × 0.45) + (P × 0.30) + (S × 0.25) + Adjustments

Where:
  D = Duration Score (based on session length vs optimal 45-minute sessions)
  P = Pause Score (frequency of breaks taken)
  S = Switch Score (task switching frequency)

Adjustments:
  - Sessions > 120 minutes receive penalty: +0.5 per excess minute
  - Score capped at maximum of 100
```

**Scoring Breakdown:**

| Component | Weight | Calculation | Rationale |
|-----------|--------|-------------|-----------|
| **Duration** | 45% | `min((minutes / 45) × 50, 100)` | Longer sessions increase cognitive load exponentially |
| **Pauses** | 30% | `min(pause_count × 8, 100)` | More pauses indicate fatigue or difficulty concentrating |
| **Task Switches** | 25% | `min(task_switches × 15, 100)` | Context switching has high cognitive cost |

**Load Levels:**
- **0-29**: Low (Optimal focus state)
- **30-49**: Moderate (Building mental fatigue)
- **50-74**: High (Break recommended)
- **75-100**: Critical (Immediate rest required)

### 4. AI Recommendation Engine

Real-time recommendations based on cognitive load:

- **Low Load (<30)**: "You are in an optimal focus state. Keep up the great work!"
- **Moderate Load (30-49)**: "Your cognitive load is building up. Consider a short 3-5 minute break soon."
- **High Load (50-74)**: "High mental load detected. Take a 7-10 minute break to refresh."
- **Critical Load (75-100)**: "Critical cognitive fatigue detected! Take a 15-20 minute break or switch to a lighter task."

**Additional Smart Recommendations:**
- Warns against excessive task switching (>3 per session)
- Alerts when session duration exceeds 120 minutes
- Suggests optimal break intervals based on patterns

### 5. Analytics Dashboard

**Overview Cards:**
- Total study time (last 7 days)
- Average cognitive load score
- Top studied subject

**Weekly Focus Trends:**
- Bar chart showing daily study duration
- Cognitive load indicators per day
- Visual comparison across the week

**Focus Heatmap:**
- 7-day grid visualization
- Color-coded by session count (0, 1, 2, 3+ sessions)
- Quick glance at study consistency

**Recent Sessions Log:**
- Detailed list of past study sessions
- Subject, duration, cognitive load, pauses, and task switches
- Sortable and filterable

### 6. Weekly Productivity Reports

Downloadable text reports containing:
- Overall statistics (total time, sessions, avg cognitive load)
- Subject-wise breakdown with time allocation
- Cognitive load insights and analysis
- Personalized recommendations for improvement
- Detailed session-by-session log
- Study pattern analysis

Reports can be saved and tracked over time to measure progress.

---

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, utility-first styling
- **Lucide React** for beautiful, consistent iconography

### Backend Stack
- **Supabase** for backend-as-a-service
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in authentication and session management
  - Real-time subscriptions (future enhancement)
  - Edge Functions for serverless compute

### Database Schema

#### Table: `study_sessions`
Stores all study session data and computed metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users |
| `subject` | text | Subject being studied |
| `start_time` | timestamptz | Session start timestamp |
| `end_time` | timestamptz | Session end timestamp (null if active) |
| `duration_minutes` | integer | Total effective study time |
| `pause_count` | integer | Number of pauses taken |
| `task_switches` | integer | Number of subject switches |
| `cognitive_load_score` | numeric(5,2) | Calculated cognitive load (0-100) |
| `created_at` | timestamptz | Record creation time |

**Indexes:**
- `user_id` for user-specific queries
- `start_time DESC` for chronological sorting
- Composite index on `(user_id, start_time)` for analytics

#### Table: `session_events`
Tracks granular events within sessions for detailed analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `session_id` | uuid | Foreign key to study_sessions |
| `event_type` | text | 'pause_start', 'pause_end', 'task_switch' |
| `metadata` | jsonb | Additional event data (flexible schema) |
| `timestamp` | timestamptz | When the event occurred |
| `created_at` | timestamptz | Record creation time |

**Indexes:**
- `session_id` for session-specific queries
- `timestamp` for chronological analysis

### Security

**Row Level Security (RLS) Policies:**

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- INSERT/UPDATE/DELETE operations restricted to data owners
- Authentication required for all database operations

**Authentication Security:**
- Passwords hashed using bcrypt via Supabase
- JWT tokens for stateless session management
- Automatic token refresh and expiration handling
- No sensitive data exposed in client-side code

### Application Structure

```
src/
├── components/           # React components
│   ├── Auth.tsx         # Login/signup forms
│   ├── Dashboard.tsx    # Main app layout with tabs
│   ├── ActiveSession.tsx # Session tracking UI
│   ├── Analytics.tsx    # Charts and visualizations
│   └── WeeklyReport.tsx # Report generation
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── lib/                 # Utility libraries
│   ├── supabase.ts     # Supabase client configuration
│   └── cognitiveLoad.ts # Cognitive load calculation engine
├── App.tsx             # Root component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

---

## Cognitive Load Formula Deep Dive

### Scientific Background

The cognitive load formula is inspired by Cognitive Load Theory (CLT), which identifies three types of load:

1. **Intrinsic Load**: Inherent difficulty of the material
2. **Extraneous Load**: Inefficiencies in how information is presented
3. **Germane Load**: Mental effort dedicated to processing and understanding

Our formula approximates these through observable metrics:

### Duration Component (45% weight)

**Formula:** `min((duration_minutes / 45) × 50, 100)`

**Reasoning:**
- Research shows optimal focus duration is 25-50 minutes (Pomodoro technique)
- We use 45 minutes as the sweet spot
- Sessions approaching 45 min score ~50/100 (moderate load)
- Sessions exceeding 90+ minutes score near maximum
- Non-linear relationship: longer sessions have diminishing returns

### Pause Component (30% weight)

**Formula:** `min(pause_count × 8, 100)`

**Reasoning:**
- Frequent pauses indicate difficulty maintaining focus
- Each pause adds 8 points to cognitive load
- 3-4 pauses (24-32 points) is normal for a 60-min session
- 8+ pauses (64+ points) indicates high fatigue or difficult material
- Pauses are good for recovery but also signal cognitive strain

### Task Switch Component (25% weight)

**Formula:** `min(task_switches × 15, 100)`

**Reasoning:**
- Context switching has been proven costly in cognitive science
- Each switch requires mental recalibration
- 15 points per switch reflects high cognitive penalty
- 2-3 switches (30-45 points) significantly impacts focus
- Frequent switching prevents deep work states

### Adjustment Factors

**Excessive Duration Penalty:**
```
if duration > 120 minutes:
    score += (duration - 120) × 0.5
```

Sessions exceeding 2 hours receive additional penalties because:
- Attention quality degrades significantly after 90-120 minutes
- Retention drops despite continued "studying"
- Risk of burnout and diminishing returns

### Example Calculations

**Example 1: Ideal Session**
- Duration: 40 minutes
- Pauses: 2
- Task Switches: 0

```
Duration Score: (40/45) × 50 = 44.4
Pause Score: 2 × 8 = 16
Switch Score: 0 × 15 = 0

Final Score: (44.4 × 0.45) + (16 × 0.30) + (0 × 0.25)
           = 19.98 + 4.8 + 0
           = 25 (Low - Optimal)
```

**Example 2: High Load Session**
- Duration: 90 minutes
- Pauses: 7
- Task Switches: 3

```
Duration Score: (90/45) × 50 = 100
Pause Score: 7 × 8 = 56
Switch Score: 3 × 15 = 45

Final Score: (100 × 0.45) + (56 × 0.30) + (45 × 0.25)
           = 45 + 16.8 + 11.25
           = 73 (High - Break needed)
```

**Example 3: Critical Overload**
- Duration: 150 minutes
- Pauses: 10
- Task Switches: 5

```
Duration Score: 100 (capped)
Pause Score: 80
Switch Score: 75

Base Score: (100 × 0.45) + (80 × 0.30) + (75 × 0.25)
          = 45 + 24 + 18.75 = 87.75

Excess Penalty: (150 - 120) × 0.5 = 15

Final Score: min(87.75 + 15, 100) = 100 (Critical - Stop immediately!)
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cognitive-load-study-companion
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**

   The `.env` file should already contain your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run database migrations**

   The database schema is automatically created via Supabase migrations. The migration includes:
   - Table creation for study_sessions and session_events
   - Row Level Security policies
   - Performance indexes

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

### First-Time Setup

1. Open the application in your browser
2. Click "Sign Up" and create an account
3. Log in with your credentials
4. Start your first study session
5. Explore the analytics after completing a few sessions

---

## Usage Guide

### Starting a Study Session

1. Navigate to the "Study Session" tab
2. Enter the subject you're studying (e.g., "Calculus", "Biology")
3. Click "Start Session"
4. The timer begins tracking your study time

### During a Session

- **Pause**: Click "Pause" when taking a break (tracked for cognitive load)
- **Resume**: Click "Resume" to continue studying
- **Switch Subject**: Type a new subject in the input field and press Enter
- **Monitor Recommendations**: Watch for AI suggestions in the colored alert boxes
- **End Session**: Click "End Session" when done

### Viewing Analytics

1. Go to the "Analytics" tab
2. Review your:
   - Total study time (last 7 days)
   - Average cognitive load
   - Top subject
   - Weekly trends chart
   - Focus heatmap
   - Recent session history

### Generating Reports

1. Navigate to the "Weekly Report" tab
2. Click "Download Weekly Report"
3. A text file is downloaded with comprehensive analysis
4. Review recommendations and insights
5. Track progress over multiple weeks

---

## Future Enhancements

### Phase 1: Enhanced Analytics
- Monthly and yearly trend analysis
- Comparative analytics (week-over-week, month-over-month)
- Goal setting and tracking
- Study streak tracking

### Phase 2: Advanced AI Features
- Machine learning-based personalized recommendations
- Predictive analytics for optimal study times
- Subject difficulty estimation based on cognitive load patterns
- Smart scheduling suggestions

### Phase 3: Collaboration & Social
- Study groups and shared sessions
- Leaderboards and gamification
- Study buddy matching based on patterns
- Shared goals and accountability

### Phase 4: Integration & Expansion
- Calendar integration (Google Calendar, Outlook)
- Browser extension for seamless tracking
- Mobile app (React Native)
- Integration with note-taking apps (Notion, Obsidian)
- Pomodoro timer integration

### Phase 5: Advanced Features
- Voice commands for hands-free control
- Biometric integration (heart rate, focus indicators)
- Content-aware tracking (detect what you're studying)
- AI-generated study plans
- Spaced repetition recommendations

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain component modularity
- Write meaningful commit messages
- Add comments for complex logic
- Test edge cases thoroughly
- Ensure mobile responsiveness

---

## License

This project is open source and available under the MIT License.

---

## Acknowledgments

- Cognitive Load Theory research by John Sweller
- Pomodoro Technique by Francesco Cirillo
- Icon set by Lucide React
- Styled with Tailwind CSS
- Powered by Supabase

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Session  │  │Analytics │  │  Report  │   │
│  │Component │  │ Tracker  │  │Dashboard │  │Generator │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │            │              │             │          │
│         └────────────┴──────────────┴─────────────┘          │
│                            │                                  │
│                   ┌────────▼────────┐                        │
│                   │  Supabase Client │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │    Backend      │
                    ├─────────────────┤
                    │  Auth Service   │
                    │  PostgreSQL DB  │
                    │  RLS Policies   │
                    │  Edge Functions │
                    └─────────────────┘
```

---

Built with focus, powered by intelligence.
