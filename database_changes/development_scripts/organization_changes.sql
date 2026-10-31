-- Add the new column with automatic UUID generation
ALTER TABLE public.organization
ADD COLUMN object_id UUID NOT NULL DEFAULT gen_random_uuid();

-- It identifies the organization in ThinkTech ERP, so it must stay unique (name as Prisma's @unique)
CREATE UNIQUE INDEX IF NOT EXISTS organization_object_id_key
    ON public.organization (object_id);
