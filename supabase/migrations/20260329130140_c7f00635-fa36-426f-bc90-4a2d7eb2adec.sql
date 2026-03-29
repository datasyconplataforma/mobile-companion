
-- Skills table
CREATE TABLE public.project_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skills" ON public.project_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skills" ON public.project_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON public.project_skills FOR DELETE USING (auth.uid() = user_id);

-- Business rules table
CREATE TABLE public.project_business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rules" ON public.project_business_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rules" ON public.project_business_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rules" ON public.project_business_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rules" ON public.project_business_rules FOR DELETE USING (auth.uid() = user_id);

-- Add prompt_type column for sub-tabs
ALTER TABLE public.project_prompts ADD COLUMN IF NOT EXISTS prompt_type text NOT NULL DEFAULT 'implementation';
