
ALTER TABLE public.chat_messages ADD COLUMN excluded boolean NOT NULL DEFAULT false;

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
TO public
USING (auth.uid() = user_id);
