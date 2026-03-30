
-- Table for project sharing
CREATE TABLE public.project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  shared_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, shared_with_user_id)
);

ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has access to a project (owner or shared)
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares WHERE project_id = _project_id AND shared_with_user_id = _user_id
  )
$$;

-- RLS for project_shares: owner can manage, shared user can view
CREATE POLICY "Project owner can manage shares"
  ON public.project_shares FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Shared users can view their shares"
  ON public.project_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Update projects RLS to include shared users
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), id));

-- Update chat_messages RLS
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
CREATE POLICY "Users can view project messages"
  ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
CREATE POLICY "Users can insert project messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

-- Update project_tasks RLS
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.project_tasks;
CREATE POLICY "Users can view project tasks"
  ON public.project_tasks FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create their own tasks" ON public.project_tasks;
CREATE POLICY "Users can create project tasks"
  ON public.project_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.project_tasks;
CREATE POLICY "Users can update project tasks"
  ON public.project_tasks FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.project_tasks;
CREATE POLICY "Users can delete project tasks"
  ON public.project_tasks FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Update project_prompts RLS
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.project_prompts;
CREATE POLICY "Users can view project prompts"
  ON public.project_prompts FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create their own prompts" ON public.project_prompts;
CREATE POLICY "Users can create project prompts"
  ON public.project_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their own prompts" ON public.project_prompts;
CREATE POLICY "Users can update project prompts"
  ON public.project_prompts FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.project_prompts;
CREATE POLICY "Users can delete project prompts"
  ON public.project_prompts FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Update project_documents RLS
DROP POLICY IF EXISTS "Users can view their own documents" ON public.project_documents;
CREATE POLICY "Users can view project documents"
  ON public.project_documents FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.project_documents;
CREATE POLICY "Users can insert project documents"
  ON public.project_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.project_documents;
CREATE POLICY "Users can delete project documents"
  ON public.project_documents FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Update project_business_rules RLS
DROP POLICY IF EXISTS "Users can view their own rules" ON public.project_business_rules;
CREATE POLICY "Users can view project rules"
  ON public.project_business_rules FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert their own rules" ON public.project_business_rules;
CREATE POLICY "Users can insert project rules"
  ON public.project_business_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their own rules" ON public.project_business_rules;
CREATE POLICY "Users can update project rules"
  ON public.project_business_rules FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their own rules" ON public.project_business_rules;
CREATE POLICY "Users can delete project rules"
  ON public.project_business_rules FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Update project_skills RLS
DROP POLICY IF EXISTS "Users can view their own skills" ON public.project_skills;
CREATE POLICY "Users can view project skills"
  ON public.project_skills FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert their own skills" ON public.project_skills;
CREATE POLICY "Users can insert project skills"
  ON public.project_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their own skills" ON public.project_skills;
CREATE POLICY "Users can delete project skills"
  ON public.project_skills FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Update project_llm_settings RLS
DROP POLICY IF EXISTS "Users can view their own llm settings" ON public.project_llm_settings;
CREATE POLICY "Users can view project llm settings"
  ON public.project_llm_settings FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), project_id));

-- Update projects UPDATE policy to allow shared users to edit
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update accessible projects"
  ON public.projects FOR UPDATE
  USING (user_id = auth.uid() OR public.has_project_access(auth.uid(), id));
