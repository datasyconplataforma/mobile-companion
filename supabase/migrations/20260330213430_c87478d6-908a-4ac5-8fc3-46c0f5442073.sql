
CREATE TABLE public.project_debates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  main_provider text NOT NULL DEFAULT 'lovable',
  main_model text,
  reviewer_provider text NOT NULL DEFAULT 'lovable',
  reviewer_mode text NOT NULL DEFAULT 'lovable',
  initial_output text,
  review_feedback text,
  final_output text,
  debate_happened boolean NOT NULL DEFAULT false,
  duration_ms integer
);

ALTER TABLE public.project_debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project debates"
  ON public.project_debates FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Service can insert debates"
  ON public.project_debates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete project debates"
  ON public.project_debates FOR DELETE
  USING (has_project_access(auth.uid(), project_id));
