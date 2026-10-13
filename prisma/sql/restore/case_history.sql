-- Restore case histories from the export of 2026-10-08 15:23.
-- Patients were lost too, so each case's patient is re-created as a placeholder
-- ("Restored Patient <id>", phone "-") with the SAME id, so you can edit the
-- name and phone on the Patients page and everything stays linked.
-- Safe to run once on an empty CaseHistory table.
--   psql "postgresql://postgres:PASSWORD@localhost:5432/dentalcaredb" -f restore_case_history.sql

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public."CaseHistory") THEN
        RAISE EXCEPTION 'CaseHistory already has rows - not restoring twice';
    END IF;
END $$;

INSERT INTO public."Patient" (id, "patientNo", name, phone, "admissionDate", "updatedAt") VALUES
    (3, 'P-0003', 'Restored Patient 3', '-', '2026-09-12', now()),
    (4, 'P-0004', 'Restored Patient 4', '-', '2026-09-12', now()),
    (5, 'P-0005', 'Restored Patient 5', '-', '2026-09-30', now()),
    (6, 'P-0006', 'Restored Patient 6', '-', '2026-09-12', now()),
    (7, 'P-0007', 'Restored Patient 7', '-', '2026-09-19', now()),
    (11, 'P-0011', 'Restored Patient 11', '-', '2026-09-12', now()),
    (12, 'P-0012', 'Restored Patient 12', '-', '2026-09-30', now()),
    (13, 'P-0013', 'Restored Patient 13', '-', '2026-10-01', now()),
    (15, 'P-0015', 'Restored Patient 15', '-', '2026-10-01', now()),
    (16, 'P-0016', 'Restored Patient 16', '-', '2026-10-01', now()),
    (17, 'P-0017', 'Restored Patient 17', '-', '2026-10-01', now()),
    (20, 'P-0020', 'Restored Patient 20', '-', '2026-10-03', now()),
    (21, 'P-0021', 'Restored Patient 21', '-', '2026-10-03', now()),
    (22, 'P-0022', 'Restored Patient 22', '-', '2026-10-03', now()),
    (23, 'P-0023', 'Restored Patient 23', '-', '2026-10-03', now()),
    (24, 'P-0024', 'Restored Patient 24', '-', '2026-10-03', now()),
    (36, 'P-0036', 'Restored Patient 36', '-', '2026-10-07', now()),
    (41, 'P-0041', 'Restored Patient 41', '-', '2026-10-07', now()),
    (42, 'P-0042', 'Restored Patient 42', '-', '2026-10-07', now()),
    (43, 'P-0043', 'Restored Patient 43', '-', '2026-10-07', now())
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public."Patient"', 'id'), GREATEST((SELECT MAX(id) FROM public."Patient"), 1));

INSERT INTO public."CaseHistory" ("patientId","caseNo","toothNumber",problem,treatment,details,"caseDate",status,"createdAt","updatedAt",bp,"followUpDate",oe,"followUpSmsSentAt") VALUES
	 (11,2,'11','Dental Caries','Composite Filling','Small cavity on the upper right central incisor.','2026-09-12 00:00:00','OPEN'::public."CaseStatus",'2026-09-13 07:12:52.302','2026-09-13 07:12:52.302',NULL,NULL,NULL,NULL),
	 (6,4,'16','Dental Caries','Root Canal Treatment','Moderate cavity on the upper left first molar.','2026-09-12 00:00:00','OPEN'::public."CaseStatus",'2026-09-13 07:13:48.158','2026-09-13 07:13:48.158',NULL,NULL,NULL,NULL),
	 (7,3,'31','Chipped Tooth','Composite Restoration','Minor fracture caused by accidental trauma.','2026-09-19 00:00:00','OPEN'::public."CaseStatus",'2026-09-13 07:14:24.683','2026-09-13 07:14:24.683',NULL,NULL,NULL,NULL),
	 (4,4,'16','Tooth Pain','Root Canal Treatment','Small cavity on the upper right central incisor.','2026-09-12 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-13 07:13:32.745','2026-09-30 06:14:49.388','160/70',NULL,NULL,NULL),
	 (5,1,'5','Tooth Pain','Composite Restoration','','2026-09-30 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-30 04:42:34.925','2026-09-30 06:31:21.592','110/80',NULL,NULL,NULL),
	 (12,1,'6','Tooth Pain','Root Canal Treatment','Small cavity on the upper right central incisor.','2026-09-30 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-30 07:07:35.033','2026-09-30 12:58:14.185','140/70','2026-10-03 00:00:00','Oral Hygiene Good',NULL),
	 (12,2,'8','Pulpits ','Rct','Ghhhh','2026-09-30 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-30 15:33:51.709','2026-09-30 15:33:51.709',NULL,NULL,NULL,NULL),
	 (13,1,'6','Pain 8','Operculectomy',NULL,'2026-10-01 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-30 19:44:34.877','2026-09-30 19:44:34.877',NULL,NULL,NULL,NULL),
	 (3,2,'16','Tooth Pain','Root Canal Treatment','Small cavity on the upper right central incisor.','2026-09-12 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-09-13 07:13:24.082','2026-10-01 03:37:12.867',NULL,'2026-10-04 00:00:00',NULL,NULL),
	 (15,1,'8','Pain lower 8','Ext lower 8','After meal','2026-10-01 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-01 06:52:31.576','2026-10-01 06:52:31.576',NULL,'2026-10-04 00:00:00','Wisdom pain',NULL);
INSERT INTO public."CaseHistory" ("patientId","caseNo","toothNumber",problem,treatment,details,"caseDate",status,"createdAt","updatedAt",bp,"followUpDate",oe,"followUpSmsSentAt") VALUES
	 (16,1,'7','Pain','Rct',NULL,'2026-10-01 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-01 11:25:40.686','2026-10-01 11:25:40.686',NULL,NULL,'Pulpitis',NULL),
	 (17,1,'2112','Pain +water sensation ','Rct +crown','','2026-10-01 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-01 11:37:55.893','2026-10-02 15:11:21.065',NULL,NULL,'G caries',NULL),
	 (20,1,'All tooth','Mobility','Scaling',NULL,'2026-10-03 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-03 06:18:28.412','2026-10-03 06:18:28.412',NULL,'2026-10-05 00:00:00','Mobility',NULL),
	 (21,1,'Lower left 6','Swaling','Rct 6',NULL,'2026-10-03 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-03 07:23:48.992','2026-10-03 07:23:48.992',NULL,'2026-10-05 00:00:00','Pulpitis non vital',NULL),
	 (22,1,'Right 6','Pain lower rt 6',NULL,NULL,'2026-10-03 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-03 07:45:19.571','2026-10-03 07:45:19.571',NULL,NULL,'Pulpitis',NULL),
	 (23,1,'Right 6','Pain','Rct +crown',NULL,'2026-10-03 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-03 08:01:40.941','2026-10-03 08:01:40.941',NULL,'2026-10-05 00:00:00','Pulpitis lower right 6',NULL),
	 (24,1,'Lower left 6','Pain','Rct',NULL,'2026-10-03 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-03 08:06:21.71','2026-10-05 09:18:05.34',NULL,'2026-10-05 00:00:00','Pulpitis','2026-10-05 09:18:05.328'),
	 (36,1,'Lower left 7','Pain','Ext 7',NULL,'2026-10-07 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-07 10:30:43.327','2026-10-07 10:30:43.327',NULL,'2026-10-09 00:00:00','Bdr',NULL),
	 (41,1,'Upper left 6','Pain','Rct +crown',NULL,'2026-10-07 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-07 12:33:27.872','2026-10-07 12:33:27.872',NULL,'2026-10-09 00:00:00','Pulpits ',NULL),
	 (43,1,'6','pain','rct',NULL,'2026-10-07 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-07 14:39:28.342','2026-10-07 14:39:28.342',NULL,'2026-10-09 00:00:00','pulpitis',NULL);
INSERT INTO public."CaseHistory" ("patientId","caseNo","toothNumber",problem,treatment,details,"caseDate",status,"createdAt","updatedAt",bp,"followUpDate",oe,"followUpSmsSentAt") VALUES
	 (42,1,'7','pain','rct+cap','','2026-10-07 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-07 14:45:24.963','2026-10-07 14:47:03.885','120/80',NULL,'pulpitis',NULL),
	 (43,2,NULL,NULL,NULL,NULL,'2026-10-08 00:00:00','IN_PROGRESS'::public."CaseStatus",'2026-10-07 18:26:55.069','2026-10-07 18:26:55.069','120/80',NULL,'G caries',NULL);

COMMIT;
