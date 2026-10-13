-- Default directions columns on medicine (safe to run more than once)
ALTER TABLE public.medicine
    ADD COLUMN IF NOT EXISTS dosage text,
    ADD COLUMN IF NOT EXISTS duration text,
    ADD COLUMN IF NOT EXISTS instructions text;
