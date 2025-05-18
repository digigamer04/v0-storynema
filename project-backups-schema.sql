-- Create table for project backups
CREATE TABLE IF NOT EXISTS project_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for project_backups
ALTER TABLE project_backups ENABLE ROW LEVEL SECURITY;

-- Users can only see their own backups
CREATE POLICY "Users can view their own backups"
ON project_backups FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create backups for their own projects
CREATE POLICY "Users can create backups for their own projects"
ON project_backups FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own backups
CREATE POLICY "Users can delete their own backups"
ON project_backups FOR DELETE
USING (auth.uid() = user_id);
