-- Run manually on the PostgreSQL database used by MediDesk.
-- Stores the optional tooth count when Cup is checked on a case prescription.
ALTER TABLE "CaseHistory"
ADD COLUMN IF NOT EXISTS cup_teeth INTEGER;
