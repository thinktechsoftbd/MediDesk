-- Organization Type: Doctor Chamber | Dental Chamber | Clinic Management | Hospital Management.
-- Apply this before `npx prisma db push`: the column is required, so existing rows are
-- backfilled to DENTAL_CHAMBER before it is made NOT NULL.
CREATE TYPE "OrganizationType" AS ENUM
    ('DOCTOR_CHAMBER', 'DENTAL_CHAMBER', 'CLINIC_MANAGEMENT', 'HOSPITAL_MANAGEMENT');

ALTER TABLE public.organization
    ADD COLUMN organization_type "OrganizationType";

UPDATE public.organization
    SET organization_type = 'DENTAL_CHAMBER'
    WHERE organization_type IS NULL;

ALTER TABLE public.organization
    ALTER COLUMN organization_type SET NOT NULL;
