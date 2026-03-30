
-- Table to assign skills (global or project) to specific projects
CREATE TABLE public.skill_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL,
  skill_type text NOT NULL CHECK (skill_type IN ('global', 'project')),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to avoid duplicates
ALTER TABLE public.skill_project_assignments ADD CONSTRAINT unique_skill_project UNIQUE (skill_id, project_id);

-- Enable RLS
ALTER TABLE public.skill_project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their skill assignments" ON public.skill_project_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their skill assignments" ON public.skill_project_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their skill assignments" ON public.skill_project_assignments FOR DELETE USING (auth.uid() = user_id);
