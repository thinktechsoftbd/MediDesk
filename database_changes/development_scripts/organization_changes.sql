-- Add the new column with automatic UUID generation
ALTER TABLE public.organization
ADD COLUMN object_id UUID NOT NULL DEFAULT gen_random_uuid();
