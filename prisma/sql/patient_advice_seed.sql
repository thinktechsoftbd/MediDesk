-- =====================================================================
-- Patient advice (Bangla) by treatment type: one patient_advice_type row per type, and one
-- patient_advice row under it (title = the type name, advice = its lines, one per line).
-- Tables: public.patient_advice_type, public.patient_advice (they must exist already).
-- Safe to run more than once: types already there (same name) and advice already there
-- (same type + title) are skipped.
--   node psql.js dentalcaredb prisma/sql/patient_advice_seed.sql
--   or: npx prisma db execute --file prisma/sql/patient_advice_seed.sql --schema prisma/schema.prisma
-- =====================================================================
BEGIN;

CREATE TEMP TABLE advice_seed (sort INT, name VARCHAR(150), advice TEXT);

INSERT INTO advice_seed (sort, name, advice) VALUES
(1, 'General Dental Advice', $a$প্রতিদিন সকালে ও রাতে অন্তত ২ বার নরম ব্রাশ দিয়ে দাঁত পরিষ্কার করুন।
প্রতিবার খাবারের পর ভালোভাবে কুলি করুন।
প্রতিদিন ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার করুন।
দাঁতের ফাঁক পরিষ্কারের জন্য নিয়মিত ডেন্টাল ফ্লস ব্যবহার করুন।
অতিরিক্ত মিষ্টি, চকলেট ও চিনিযুক্ত খাবার পরিহার করুন।
অতিরিক্ত গরম বা ঠান্ডা খাবার গ্রহণ থেকে বিরত থাকুন, বিশেষত দাঁতে সংবেদনশীলতা থাকলে।
ধূমপান, জর্দা, গুল ও তামাকজাতীয় দ্রব্য পরিহার করুন।
প্রতি ৬ মাস অন্তর নিয়মিত ডেন্টাল চেকআপ করান।
চিকিৎসকের পরামর্শ অনুযায়ী নির্ধারিত সময়ে ফলোআপে আসুন।
দাঁতে ব্যথা, ফোলা বা অস্বাভাবিক সমস্যা দেখা দিলে দ্রুত যোগাযোগ করুন।$a$),

(2, 'Scaling & Polishing', $a$চিকিৎসার পর সাময়িক দাঁতের শিরশিরানি হতে পারে।
২৪ ঘণ্টা অতিরিক্ত গরম ও ঠান্ডা খাবার এড়িয়ে চলুন, যদি সংবেদনশীলতা থাকে।
নরম ব্রাশ দিয়ে নিয়মিত দাঁত পরিষ্কার করুন।
প্রতিদিন ডেন্টাল ফ্লস ব্যবহার করুন।
মাড়ি থেকে সামান্য রক্তপাত হলে নিয়মিত পরিষ্কার রাখুন; রক্তপাত অব্যাহত থাকলে যোগাযোগ করুন।
ধূমপান ও তামাকজাতীয় দ্রব্য পরিহার করুন।$a$),

(3, 'Root Canal Treatment (RCT)', $a$অবশভাব সম্পূর্ণ না কাটা পর্যন্ত খাবার চিবানো থেকে বিরত থাকুন।
চিকিৎসাকৃত দাঁত দিয়ে শক্ত বা চটচটে খাবার চিবাবেন না।
দাঁতে স্থায়ী ক্রাউন না বসানো পর্যন্ত দাঁতটির ওপর অতিরিক্ত চাপ দেবেন না।
নির্ধারিত সময়ে পরবর্তী চিকিৎসার জন্য আসুন।
চিকিৎসকের নির্দেশ অনুযায়ী ওষুধ সেবন করুন।
ব্যথা বা ফোলা ক্রমশ বাড়লে দ্রুত যোগাযোগ করুন।
নির্ধারিত সময়ে স্থায়ী ক্রাউন সম্পন্ন করুন।$a$),

(4, 'Tooth Extraction', $a$প্রথম ৩০–৬০ মিনিট গজে হালকা চাপ দিয়ে কামড় দিয়ে রাখুন।
প্রথম ২৪ ঘণ্টা জোরে কুলি বা থুতু ফেলবেন না।
প্রথম ২৪ ঘণ্টা স্ট্র ব্যবহার করবেন না।
প্রথম ২৪ ঘণ্টা ধূমপান ও অ্যালকোহল পরিহার করুন।
প্রথম দিন নরম ও ঠান্ডা বা স্বাভাবিক তাপমাত্রার খাবার গ্রহণ করুন।
ক্ষতস্থানে আঙুল বা জিহ্বা দিয়ে স্পর্শ করবেন না।
প্রথম ২৪ ঘণ্টা ভারী ব্যায়াম ও অতিরিক্ত পরিশ্রম এড়িয়ে চলুন।
অতিরিক্ত রক্তপাত, জ্বর বা ক্রমবর্ধমান ফোলা হলে দ্রুত যোগাযোগ করুন।$a$),

(5, 'Dental Filling', $a$অবশভাব না কাটা পর্যন্ত খাবার চিবাবেন না।
প্রথম দিকে দাঁতে সামান্য শিরশিরানি হতে পারে।
অতিরিক্ত শক্ত খাবার এড়িয়ে চলুন।
ফিলিং করার পর কামড়ে উঁচু বা অস্বস্তি অনুভূত হলে চিকিৎসকের সঙ্গে যোগাযোগ করুন।
নিয়মিত ব্রাশ ও ফ্লস ব্যবহার করুন।$a$),

(6, 'Crown & Bridge', $a$প্রথম কয়েক দিন শক্ত ও চটচটে খাবার এড়িয়ে চলুন।
নিয়মিত ব্রাশ ও ডেন্টাল ফ্লস ব্যবহার করুন।
ব্রিজের নিচের অংশ বিশেষ ফ্লস বা ইন্টারডেন্টাল ব্রাশ দিয়ে পরিষ্কার করুন।
ক্রাউন বা ব্রিজ নড়ে গেলে বা খুলে গেলে দ্রুত যোগাযোগ করুন।
কামড়ে অস্বাভাবিক চাপ অনুভূত হলে চিকিৎসককে জানান।$a$),

(7, 'Gum Treatment', $a$নরম ব্রাশ দিয়ে আলতোভাবে দাঁত পরিষ্কার করুন।
চিকিৎসকের নির্দেশ ছাড়া মাড়িতে কোনো ওষুধ বা মলম ব্যবহার করবেন না।
ধূমপান ও তামাকজাতীয় দ্রব্য পরিহার করুন।
নিয়মিত ফলোআপ করুন।
মাড়ি ফুলে গেলে বা পুঁজ বের হলে দ্রুত যোগাযোগ করুন।$a$);

-- 1. the types, in the order above
INSERT INTO public.patient_advice_type (name)
SELECT name FROM advice_seed ORDER BY sort
ON CONFLICT (name) DO NOTHING;

-- 2. one advice per type: title = the type name, advice = its lines
INSERT INTO public.patient_advice (advice_type_id, title, advice)
SELECT t.id, s.name, s.advice
FROM advice_seed s
JOIN public.patient_advice_type t ON t.name = s.name
WHERE NOT EXISTS (
    SELECT 1 FROM public.patient_advice a WHERE a.advice_type_id = t.id AND a.title = s.name
)
ORDER BY s.sort;

DROP TABLE advice_seed;

COMMIT;
