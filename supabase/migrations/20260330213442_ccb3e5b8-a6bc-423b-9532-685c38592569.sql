
DROP POLICY "Service can insert debates" ON public.project_debates;
CREATE POLICY "Authenticated users can insert debates"
  ON public.project_debates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
