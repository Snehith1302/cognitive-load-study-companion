/*
  # Cognitive Load Study Companion Database Schema

  ## Overview
  This migration creates the database structure for tracking study sessions,
  cognitive load metrics, and session events (pauses, task switches).

  ## New Tables
  
  ### `study_sessions`
  Main table for storing study session data and cognitive metrics.
  - `id` (uuid, primary key) - Unique session identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `subject` (text) - Subject being studied (e.g., "Mathematics", "Physics")
  - `start_time` (timestamptz) - When the session started
  - `end_time` (timestamptz, nullable) - When the session ended (null if active)
  - `duration_minutes` (integer) - Total duration in minutes
  - `pause_count` (integer) - Number of pauses taken during session
  - `task_switches` (integer) - Number of times user switched subjects/tasks
  - `cognitive_load_score` (numeric) - Calculated cognitive load (0-100 scale)
  - `created_at` (timestamptz) - Record creation timestamp

  ### `session_events`
  Tracks detailed events within study sessions for accurate cognitive load calculation.
  - `id` (uuid, primary key) - Unique event identifier
  - `session_id` (uuid, foreign key) - References study_sessions
  - `event_type` (text) - Type of event: 'pause_start', 'pause_end', 'task_switch'
  - `metadata` (jsonb) - Additional event data (e.g., previous subject, new subject)
  - `timestamp` (timestamptz) - When the event occurred
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  
  Row Level Security (RLS) is enabled on all tables with policies ensuring:
  - Users can only access their own study sessions and events
  - Authenticated users can create, read, update, and delete their own data
  
  ## Indexes
  
  Performance indexes are created on:
  - Foreign key relationships (user_id, session_id)
  - Timestamp fields for efficient date-range queries
  - Query optimization for analytics dashboard
*/

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer DEFAULT 0,
  pause_count integer DEFAULT 0,
  task_switches integer DEFAULT 0,
  cognitive_load_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create session_events table
CREATE TABLE IF NOT EXISTS session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES study_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('pause_start', 'pause_end', 'task_switch')),
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_start ON study_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(timestamp);

-- Enable Row Level Security
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions

-- Users can view their own study sessions
CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own study sessions
CREATE POLICY "Users can create own study sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions
CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own study sessions
CREATE POLICY "Users can delete own study sessions"
  ON study_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for session_events

-- Users can view events for their own sessions
CREATE POLICY "Users can view own session events"
  ON session_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_events.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Users can create events for their own sessions
CREATE POLICY "Users can create own session events"
  ON session_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_events.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Users can update events for their own sessions
CREATE POLICY "Users can update own session events"
  ON session_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_events.session_id
      AND study_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_events.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Users can delete events for their own sessions
CREATE POLICY "Users can delete own session events"
  ON session_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_events.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );