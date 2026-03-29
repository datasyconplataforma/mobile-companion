
CREATE TABLE public.project_llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'lovable',
  api_key text,
  base_url text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own llm settings"
ON public.project_llm_settings FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own llm settings"
ON public.project_llm_settings FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own llm settings"
ON public.project_llm_settings FOR UPDATE TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own llm settings"
ON public.project_llm_settings FOR DELETE TO public
USING (auth.uid() = user_id);

CREATE TRIGGER update_llm_settings_updated_at
  BEFORE UPDATE ON public.project_llm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
