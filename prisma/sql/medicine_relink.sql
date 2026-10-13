-- =====================================================================
-- Re-link case history medicines (prescription_item) after the medex list
-- was renamed to `medicine` (primary key brand_id) and the old medicine
-- table was removed.
--
-- prescription_item."medicineId" still holds the OLD medicine ids. The old
-- list (ids in creation order, from the export of 2026-10-08) is below.
-- Each old medicine is matched to a medex brand by name + strength/form;
-- if there is no match it is added to `medicine` with brand_id 900000001+
-- (only when a case history uses it or a user had added it).
-- The result is kept in medicine_migration_map for review.
-- Runs once: does nothing if medicine_migration_map already exists.
--   preview: psql "<db url>" -f prisma/sql/medicine_relink_preview.sql
--   run:     npm run db:medicine
-- =====================================================================

DO $$
DECLARE
    orphans text;
BEGIN
    IF to_regclass('public.medicine_migration_map') IS NOT NULL THEN
        RAISE NOTICE 'medicine_migration_map exists - relink already done';
        RETURN;
    END IF;

    CREATE TEMP TABLE old_medicine (id INTEGER PRIMARY KEY, name TEXT, strength TEXT, unit TEXT, form TEXT, created_by TEXT) ON COMMIT DROP;
    INSERT INTO old_medicine (id, name, strength, unit, form, created_by) VALUES
        (1, 'Amoxicillin', '125', 'mg/5 mL', 'Suspension', 'seed'),
        (2, 'Amoxicillin', '250', 'mg/5 mL', 'Suspension', 'seed'),
        (3, 'Amoxicillin', '250', 'mg', 'Capsule', 'seed'),
        (4, 'Amoxicillin', '500', 'mg', 'Capsule', 'seed'),
        (5, 'Amoxicillin + Clavulanic Acid', '375', 'mg', 'Tablet', 'seed'),
        (6, 'Amoxicillin + Clavulanic Acid', '625', 'mg', 'Tablet', 'seed'),
        (7, 'Metronidazole', '200', 'mg/5 mL', 'Suspension', 'seed'),
        (8, 'Metronidazole', '400', 'mg', 'Tablet', 'seed'),
        (9, 'Metronidazole', '500', 'mg', 'Tablet', 'seed'),
        (10, 'Chlorhexidine', '0.12', '%', 'Mouthwash', 'seed'),
        (11, 'Chlorhexidine', '0.20', '%', 'Mouthwash', 'seed'),
        (12, 'Chlorhexidine', '1', '%', 'Gel', 'seed'),
        (13, 'Chlorhexidine', '2', '%', 'Gel', 'seed'),
        (14, 'Paracetamol', '120', 'mg/5 mL', 'Syrup', 'seed'),
        (15, 'Paracetamol', '250', 'mg/5 mL', 'Syrup', 'seed'),
        (16, 'Paracetamol', '500', 'mg', 'Tablet', 'seed'),
        (17, 'Ibuprofen', '100', 'mg/5 mL', 'Suspension', 'seed'),
        (18, 'Ibuprofen', '200', 'mg', 'Tablet', 'seed'),
        (19, 'Ibuprofen', '400', 'mg', 'Tablet', 'seed'),
        (20, 'Lidocaine', '2', '%', 'Gel', 'seed'),
        (21, 'Lidocaine', '2', '%', 'Injection', 'seed'),
        (22, 'Benzocaine', '10', '%', 'Gel', 'seed'),
        (23, 'Benzocaine', '20', '%', 'Gel', 'seed'),
        (24, 'Benzydamine', '0.15', '%', 'Mouthwash', 'seed'),
        (25, 'Miconazole', '2', '%', 'Oral Gel', 'seed'),
        (26, 'Nystatin', '100,000', 'IU/mL', 'Oral Suspension', 'seed'),
        (27, 'Triamcinolone Acetonide', '0.1', '%', 'Oral Paste', 'seed'),
        (28, 'Povidone-Iodine', '1', '%', 'Gargle/Solution', 'seed'),
        (29, 'Hydrogen Peroxide', '3', '%', 'Solution', 'seed'),
        (30, 'Sefril 500', NULL, NULL, 'Capsule', 'admin@mohonto.com'),
        (31, 'SEFRIL', '500', 'MG', 'Capsule', 'kdip285@gmail.com'),
        (32, 'WINOP', '10', 'MG', 'Tablet', 'kdip285@gmail.com'),
        (33, 'ESOGAP', '20', 'MG', 'Capsule', 'kdip285@gmail.com'),
        (34, 'ROXICEF', '500', 'MG', 'Capsule', 'kdip285@gmail.com'),
        (35, 'SEFRIL 1 PH', NULL, NULL, 'Suspension', 'kdip285@gmail.com'),
        (36, 'FLAMEX 1 PH', NULL, NULL, 'Suspension', 'kdip285@gmail.com'),
        (37, 'DOPATIC 1PH', NULL, NULL, 'Suspension', 'kdip285@gmail.com'),
        (38, 'CLAVUROX', '250', 'MG', 'Tablet', 'kdip285@gmail.com');

    -- prescription lines pointing at an id that is not in the old list
    SELECT string_agg(DISTINCT pi."medicineId"::text, ', ')
      INTO orphans
      FROM public.prescription_item pi
     WHERE pi."medicineId" NOT IN (SELECT id FROM old_medicine);
    IF orphans IS NOT NULL THEN
        RAISE EXCEPTION 'prescription_item uses medicine ids not in the old list: %. Nothing was changed.', orphans;
    END IF;

    CREATE TABLE public.medicine_migration_map (
        old_id        INTEGER PRIMARY KEY,
        old_name      TEXT,
        old_strength  TEXT,
        old_form      TEXT,
        used_in_cases INTEGER,
        new_id        INTEGER,
        new_name      TEXT,
        new_strength  TEXT,
        new_form      TEXT,
        match_type    TEXT,
        migrated_at   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    );

    WITH old AS (
        SELECT m.id, m.name, m.strength, m.unit, m.form,
               lower(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))                                  AS n_full,
               lower(regexp_replace(regexp_replace(m.name, '\s*[0-9].*$', ''), '[^a-zA-Z0-9]', '', 'g')) AS n_core,
               COALESCE(substring(m.strength FROM '[0-9]+(?:\.[0-9]+)?'),
                        substring(m.name     FROM '[0-9]+(?:\.[0-9]+)?'))                               AS n_str,
               lower(COALESCE(m.form, ''))                                                             AS n_form,
               (SELECT count(*) FROM public.prescription_item pi WHERE pi."medicineId" = m.id)         AS used
          FROM old_medicine m
    ),
    cand AS (
        SELECT o.id AS old_id, n.brand_id AS new_id,
               CASE WHEN lower(regexp_replace(n.brand_name, '[^a-zA-Z0-9]', '', 'g')) = o.n_full THEN 2 ELSE 1 END AS s_name,
               CASE WHEN o.n_str IS NOT NULL AND substring(n.strength FROM '[0-9]+(?:\.[0-9]+)?') = o.n_str THEN 2 ELSE 0 END AS s_str,
               CASE WHEN o.n_form <> '' AND lower(COALESCE(n.dosage_form, '')) = o.n_form THEN 2
                    WHEN o.n_form <> '' AND lower(COALESCE(n.dosage_form, '')) LIKE '%' || o.n_form || '%' THEN 1
                    ELSE 0 END AS s_form
          FROM old o
          JOIN public.medicine n
            ON lower(regexp_replace(n.brand_name, '[^a-zA-Z0-9]', '', 'g')) IN (o.n_full, o.n_core)
           AND o.n_core <> ''
    ),
    best AS (
        -- brand name must match AND strength or dosage form must agree
        SELECT DISTINCT ON (old_id) old_id, new_id, s_str, s_form
          FROM cand
         WHERE s_str > 0 OR s_form > 0
         ORDER BY old_id, s_name + s_str + s_form DESC, new_id
    )
    INSERT INTO public.medicine_migration_map
        (old_id, old_name, old_strength, old_form, used_in_cases, new_id, match_type)
    SELECT o.id, o.name, trim(COALESCE(o.strength, '') || ' ' || COALESCE(o.unit, '')), o.form, o.used,
           b.new_id,
           CASE WHEN b.new_id IS NULL THEN NULL
                WHEN b.s_str > 0 AND b.s_form > 0 THEN 'name + strength + form'
                WHEN b.s_str > 0 THEN 'name + strength'
                ELSE 'name + form' END
      FROM old o
      LEFT JOIN best b ON b.old_id = o.id;

    -- unmatched: add to medicine when used in a case history or added by a user
    WITH todo AS (
        SELECT mm.old_id,
               (SELECT GREATEST(COALESCE(MAX(brand_id), 0), 900000000) FROM public.medicine)
                 + ROW_NUMBER() OVER (ORDER BY mm.old_id) AS new_id
          FROM public.medicine_migration_map mm
          JOIN old_medicine m ON m.id = mm.old_id
         WHERE mm.new_id IS NULL
           AND (mm.used_in_cases > 0 OR COALESCE(m.created_by, 'seed') <> 'seed')
    ),
    ins AS (
        INSERT INTO public.medicine (brand_id, brand_name, strength, dosage_form, url, scraped_at)
        SELECT t.new_id, m.name,
               NULLIF(trim(COALESCE(m.strength, '') || ' ' || COALESCE(m.unit, '')), ''),
               m.form, '', now()
          FROM todo t JOIN old_medicine m ON m.id = t.old_id
        RETURNING brand_id
    )
    UPDATE public.medicine_migration_map mm
       SET new_id = t.new_id, match_type = 'added (no match)'
      FROM todo t
     WHERE t.old_id = mm.old_id
       AND t.new_id IN (SELECT brand_id FROM ins);

    UPDATE public.medicine_migration_map mm
       SET new_name = n.brand_name, new_strength = n.strength, new_form = n.dosage_form
      FROM public.medicine n
     WHERE n.brand_id = mm.new_id;

    UPDATE public.medicine_migration_map SET match_type = 'not needed (unused seed row)' WHERE new_id IS NULL;

    -- move the case history medicines
    ALTER TABLE public.prescription_item DROP CONSTRAINT IF EXISTS "prescription_item_medicineId_fkey";

    UPDATE public.prescription_item pi
       SET "medicineId" = mm.new_id
      FROM public.medicine_migration_map mm
     WHERE mm.old_id = pi."medicineId";

    ALTER TABLE public.prescription_item
        ADD CONSTRAINT "prescription_item_medicineId_fkey"
        FOREIGN KEY ("medicineId") REFERENCES public.medicine(brand_id) ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;
