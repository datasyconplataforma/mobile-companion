
-- Add UPDATE RLS policies for global_skills and project_skills
CREATE POLICY "Users can update their own global skills"
ON public.global_skills FOR UPDATE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can update project skills"
ON public.project_skills FOR UPDATE
TO public
USING (has_project_access(auth.uid(), project_id));

-- Create skill_attachments table
CREATE TABLE public.skill_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL,
  skill_type text NOT NULL, -- 'global' or 'project'
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill attachments"
ON public.skill_attachments FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill attachments"
ON public.skill_attachments FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill attachments"
ON public.skill_attachments FOR DELETE TO public
USING (auth.uid() = user_id);

-- Add github_url column to skills tables
ALTER TABLE public.global_skills ADD COLUMN github_url text;
ALTER TABLE public.project_skills ADD COLUMN github_url text;

-- Create storage bucket for skill attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-attachments', 'skill-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload skill attachments"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'skill-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their skill attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'skill-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their skill attachments"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'skill-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
