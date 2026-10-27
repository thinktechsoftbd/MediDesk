-- =====================================================================
-- Per-user show / hide of form input fields (Security > Users, "Hide on Patient Form")
-- Same table as the UserHiddenField model in prisma/schema.prisma (`prisma db push` creates it too).
-- Safe to run more than once:
--   npx prisma db execute --file prisma/sql/user_hidden_field.sql --schema prisma/schema.prisma
-- =====================================================================

-- 1. Hidden field table --------------------------------------------------
-- One row per field NOT shown to the user. No row = the field is shown.
--   user_id : "User"."id"
--   form    : 'PATIENT' = New / Update Patient form (/patients)
--   field   : a key of PATIENT_FIELDS in src/lib/patient-fields.ts:
--             email, age, dateOfBirth, gender, ageGroup, bloodGroup, admissionDate,
--             followUpDate, serviceCharge, photoUrl, address, agreementDetails, notes
--             (name and phone are always shown; the app never stores them here)
CREATE TABLE IF NOT EXISTS "user_hidden_field" (
    "user_id" INTEGER     NOT NULL,
    "form"    VARCHAR(30) NOT NULL,
    "field"   VARCHAR(50) NOT NULL,
    CONSTRAINT "user_hidden_field_pkey" PRIMARY KEY ("user_id", "form", "field")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_hidden_field_user_id_fkey') THEN
        ALTER TABLE "user_hidden_field"
            ADD CONSTRAINT "user_hidden_field_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 2. Examples (not run) --------------------------------------------------
-- Hide Date Of Birth, Blood Group, Address, Agreement Details for user Mahanta:
--   INSERT INTO "user_hidden_field" ("user_id", "form", "field")
--   SELECT u."id", 'PATIENT', f."field"
--   FROM "User" u
--   CROSS JOIN (VALUES ('dateOfBirth'), ('bloodGroup'), ('address'), ('agreementDetails')) AS f("field")
--   WHERE u."name" = 'Mahanta'
--   ON CONFLICT DO NOTHING;
--
-- Show a field again (here Address for Mahanta):
--   DELETE FROM "user_hidden_field" h USING "User" u
--   WHERE h."user_id" = u."id" AND u."name" = 'Mahanta' AND h."form" = 'PATIENT' AND h."field" = 'address';
--
-- Show every field again for a user:
--   DELETE FROM "user_hidden_field" h USING "User" u
--   WHERE h."user_id" = u."id" AND u."name" = 'Mahanta' AND h."form" = 'PATIENT';
--
-- Who has what hidden:
--   SELECT u."name", u."email", h."form", h."field"
--   FROM "user_hidden_field" h JOIN "User" u ON u."id" = h."user_id"
--   ORDER BY u."name", h."form", h."field";
