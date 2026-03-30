
CREATE TABLE public.global_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.global_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own global skills"
  ON public.global_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own global skills"
  ON public.global_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own global skills"
  ON public.global_skills FOR DELETE
  USING (auth.uid() = user_id);
