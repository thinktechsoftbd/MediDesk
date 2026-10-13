-- =====================================================================
-- Patient service charge agreements + Bill Collection report procedure
-- Safe to run more than once.
-- Run BEFORE `prisma db push`:
--   npx prisma db execute --file prisma/sql/patient_x_agreement.sql --schema prisma/schema.prisma
-- =====================================================================

-- 1. Agreement table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "patient_x_agreement" (
    "id"                    SERIAL        NOT NULL,
    "patient_id"            INTEGER       NOT NULL,
    "service_charge_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_closed"             CHAR(1)       NOT NULL DEFAULT 'N',
    "open_date"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_date"           TIMESTAMP(3),
    "agreement_details"     VARCHAR(1000),
    "created_date"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"            VARCHAR(150),
    "updated_date"          TIMESTAMP(3),
    "updated_by"            VARCHAR(150),
    CONSTRAINT "patient_x_agreement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "patient_x_agreement_patient_id_is_closed_idx"
    ON "patient_x_agreement" ("patient_id", "is_closed");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_x_agreement_patient_id_fkey') THEN
        ALTER TABLE "patient_x_agreement"
            ADD CONSTRAINT "patient_x_agreement_patient_id_fkey"
            FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 2. Link bill collections to an agreement -----------------------------
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "agreementId" INTEGER;
CREATE INDEX IF NOT EXISTS "Payment_agreementId_idx" ON "Payment" ("agreementId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_agreementId_fkey') THEN
        ALTER TABLE "Payment"
            ADD CONSTRAINT "Payment_agreementId_fkey"
            FOREIGN KEY ("agreementId") REFERENCES "patient_x_agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Move Patient.projectedCharge into agreements (open, from the patient's entry date)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Patient' AND column_name = 'projectedCharge'
    ) THEN
        INSERT INTO "patient_x_agreement"
            ("patient_id", "service_charge_amount", "is_closed", "open_date", "agreement_details", "created_date", "created_by")
        SELECT p."id",
               p."projectedCharge",
               'N',
               COALESCE(p."admissionDate", p."createdAt"),
               'Opening service charge agreement carried over from the patient''s projected charge at registration.',
               CURRENT_TIMESTAMP,
               'System migration'
        FROM "Patient" p
        WHERE p."projectedCharge" > 0
          AND NOT EXISTS (SELECT 1 FROM "patient_x_agreement" a WHERE a."patient_id" = p."id");

        ALTER TABLE "Patient" DROP COLUMN "projectedCharge";
    END IF;
END $$;

-- existing collections go to the patient's running agreement
UPDATE "Payment" pay
SET "agreementId" = a."id"
FROM "patient_x_agreement" a
WHERE pay."agreementId" IS NULL
  AND a."patient_id" = pay."patientId"
  AND a."is_closed" = 'N';

-- 4. Bill Collection report -------------------------------------------
-- One row per collection, with the agreement's service charge and the
-- dues left after that collection (service charge - collected - discount,
-- cumulative inside the agreement; refunds add back to dues).
DROP FUNCTION IF EXISTS sp_bill_collection_report(INTEGER, DATE, DATE, BOOLEAN);

CREATE FUNCTION sp_bill_collection_report(
    p_patient_id   INTEGER DEFAULT NULL,
    p_date_from    DATE    DEFAULT NULL,
    p_date_to      DATE    DEFAULT NULL,
    p_running_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    payment_id           INTEGER,
    collection_date      TIMESTAMP,
    patient_id           INTEGER,
    patient_no           TEXT,
    patient_name         TEXT,
    agreement_id         INTEGER,
    agreement_open_date  TIMESTAMP,
    is_closed            CHAR(1),
    total_service_charge NUMERIC(12,2),
    collected_amount     NUMERIC(12,2),
    discount             NUMERIC(12,2),
    total_dues           NUMERIC(12,2)
)
LANGUAGE sql
STABLE
AS $$
    WITH lines AS (
        SELECT pay."id"                                           AS payment_id,
               pay."paymentDate"                                  AS collection_date,
               p."id"                                             AS patient_id,
               p."patientNo"                                      AS patient_no,
               p."name"                                           AS patient_name,
               a."id"                                             AS agreement_id,
               a."open_date"                                      AS agreement_open_date,
               a."is_closed"                                      AS is_closed,
               a."service_charge_amount"                          AS total_service_charge,
               CASE WHEN pay."type" = 'REFUND' THEN -pay."paidAmount" ELSE pay."paidAmount" END AS collected_amount,
               CASE WHEN pay."type" = 'REFUND' THEN 0::NUMERIC(12,2) ELSE pay."discount" END                AS discount
        FROM "Payment" pay
        JOIN "patient_x_agreement" a ON a."id" = pay."agreementId"
        JOIN "Patient" p             ON p."id" = a."patient_id"
        WHERE (p_patient_id IS NULL OR a."patient_id" = p_patient_id)
          AND (NOT p_running_only OR a."is_closed" = 'N')
    ),
    running AS (
        -- dues are cumulative over the whole agreement, before the date filter
        SELECT l.*,
               l.total_service_charge
                 - SUM(l.collected_amount + l.discount)
                       OVER (PARTITION BY l.agreement_id ORDER BY l.collection_date, l.payment_id) AS total_dues
        FROM lines l
    )
    SELECT r.payment_id, r.collection_date, r.patient_id, r.patient_no, r.patient_name,
           r.agreement_id, r.agreement_open_date, r.is_closed, r.total_service_charge,
           r.collected_amount, r.discount, r.total_dues
    FROM running r
    WHERE (p_date_from IS NULL OR r.collection_date >= p_date_from)
      AND (p_date_to   IS NULL OR r.collection_date <  p_date_to + 1)
    ORDER BY r.collection_date, r.payment_id;
$$;
