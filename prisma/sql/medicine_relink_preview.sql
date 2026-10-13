-- Dry run of medicine_relink.sql: shows how every case history medicine
-- will be re-linked, then rolls everything back. Nothing is changed.
--   psql "<database url>" -f prisma/sql/medicine_relink_preview.sql
BEGIN;
\i prisma/sql/medicine_relink.sql
\echo ''
\echo '== Medicines used in case histories =='
SELECT old_id, old_name, old_strength, old_form, used_in_cases,
       new_id, new_name, new_strength, new_form, match_type
  FROM medicine_migration_map
 WHERE used_in_cases > 0
 ORDER BY used_in_cases DESC, old_name;
\echo '== Other old medicines =='
SELECT old_id, old_name, old_strength, old_form, new_id, new_name, new_strength, new_form, match_type
  FROM medicine_migration_map
 WHERE used_in_cases = 0
 ORDER BY old_id;
ROLLBACK;
