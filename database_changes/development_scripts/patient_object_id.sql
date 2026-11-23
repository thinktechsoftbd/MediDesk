-- Run manually on the PostgreSQL database used by MediDesk, before deploying the Patient Visit page.
-- The page opens at /patient/{object_id}/patient-visit, so each patient gets a public id that isn't
-- its sequence number. Existing patients get one from the default.
ALTER TABLE public."Patient"
    ADD COLUMN IF NOT EXISTS object_id UUID NOT NULL DEFAULT gen_random_uuid();

-- name as Prisma's @unique
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_object_id_key"
    ON public."Patient" (object_id);
