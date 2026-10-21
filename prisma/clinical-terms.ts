import { PrismaClient } from "@prisma/client";

// Default chips for the prescription page pickers. A list is filled only while it is
// empty, so terms deleted in Settings stay deleted. Called from seed.ts, or on its own:
//   npx tsx prisma/clinical-terms.ts
const TERMS: Record<string, string[]> = {
    COMPLAINT: [
        "Toothache",
        "Sensitivity to cold",
        "Sensitivity to hot",
        "Pain on chewing",
        "Bleeding gums",
        "Swollen gums",
        "Facial swelling",
        "Bad breath",
        "Food impaction",
        "Mobile tooth",
        "Broken tooth",
        "Decayed tooth",
        "Missing tooth",
        "Discoloured teeth",
        "Pain in wisdom tooth",
        "Mouth ulcer",
        "Burning sensation",
        "Dry mouth",
        "Jaw pain",
        "Difficulty in opening mouth",
        "Loose filling",
        "Denture problem",
        "Routine check-up",
        "Fever",
        "Headache",
    ],
    INVESTIGATION: [
        "IOPA X-ray",
        "OPG",
        "Bitewing X-ray",
        "Occlusal X-ray",
        "CBCT",
        "Pulp vitality test",
        "CBC",
        "RBS",
        "FBS",
        "HbA1c",
        "BT, CT",
        "HBsAg",
        "Anti-HCV",
        "HIV",
        "Serum creatinine",
        "Blood grouping",
        "ECG",
        "Biopsy",
        "Culture & sensitivity",
    ],
    DIAGNOSIS: [
        "Dental caries",
        "Deep caries",
        "Reversible pulpitis",
        "Irreversible pulpitis",
        "Pulp necrosis",
        "Periapical abscess",
        "Apical periodontitis",
        "Gingivitis",
        "Chronic periodontitis",
        "Pericoronitis",
        "Impacted third molar",
        "Dentine hypersensitivity",
        "Attrition",
        "Abrasion",
        "Fractured tooth",
        "Retained root",
        "Malocclusion",
        "Aphthous ulcer",
        "Oral candidiasis",
        "TMJ disorder",
        "Dry socket",
        "Partially edentulous",
        "Completely edentulous",
    ],
    TREATMENT: [
        "Scaling & polishing",
        "Root canal treatment (RCT)",
        "Pulpotomy",
        "Pulpectomy",
        "Composite filling",
        "GIC filling",
        "Temporary filling",
        "Extraction",
        "Surgical extraction",
        "Disimpaction",
        "Incision & drainage",
        "Crown (PFM)",
        "Crown (Zirconia)",
        "Post & core",
        "Bridge",
        "Removable partial denture",
        "Complete denture",
        "Dental implant",
        "Teeth whitening",
        "Orthodontic treatment",
        "Fluoride application",
        "Pit & fissure sealant",
        "Root planing",
        "Splinting",
        "Medication",
    ],
    ADVICE: [
        "পানি বেশি করে খাবেন",
        "দিনে দুইবার দাঁত ব্রাশ করবেন",
        "নরম ব্রাশ ব্যবহার করবেন",
        "খাবারের পরে কুলি করবেন",
        "কুসুম গরম লবণ পানি দিয়ে দিনে ৩-৪ বার কুলি করবেন",
        "ঠান্ডা ও গরম খাবার এড়িয়ে চলবেন",
        "শক্ত খাবার চিবাবেন না",
        "আক্রান্ত পাশে চিবাবেন না",
        "মিষ্টি ও চিনিযুক্ত খাবার কম খাবেন",
        "ধূমপান, পান ও জর্দা পরিহার করবেন",
        "দাঁত তোলার পর তুলা ১ ঘণ্টা কামড়ে রাখবেন",
        "দাঁত তোলার পর ২৪ ঘণ্টা কুলি করবেন না",
        "২৪ ঘণ্টা গরম খাবার খাবেন না",
        "ফোলা জায়গায় বরফ সেঁক দেবেন",
        "ফোলা জায়গায় গরম সেঁক দেবেন",
        "ওষুধ নিয়মিত খাবেন",
        "অ্যান্টিবায়োটিকের কোর্স শেষ করবেন",
        "ডেন্টাল ফ্লস ব্যবহার করবেন",
        "রক্তপাত বা ফোলা বাড়লে যোগাযোগ করবেন",
        "৬ মাস পর পর দাঁত পরীক্ষা করাবেন",
        "পর্যাপ্ত বিশ্রাম নেবেন",
    ],
};

// On Examination chips are the O/E master (oral_exam_disease), filled only when it is empty
const OE = [
    "Caries",
    "Deep caries",
    "Tender on percussion",
    "Calculus",
    "Gingival swelling",
    "Bleeding on probing",
    "Periodontal pocket",
    "Mobility",
    "Pus discharge",
    "Fractured tooth",
    "Retained root",
    "Missing tooth",
    "Impacted tooth",
    "Attrition",
    "Stains",
    "Ulcer",
];

export async function seedClinicalTerms(prisma: PrismaClient) {
    for (const [category, names] of Object.entries(TERMS)) {
        if (await prisma.clinicalTerm.count({ where: { category } })) continue;
        await prisma.clinicalTerm.createMany({
            data: names.map((name, i) => ({ category, name, sortOrder: (i + 1) * 10 })),
            skipDuplicates: true,
        });
        console.log(`Seeded ${names.length} ${category} terms`);
    }
    if (!(await prisma.oralExamDisease.count())) {
        await prisma.oralExamDisease.createMany({ data: OE.map((diseaseName, i) => ({ id: i + 1, diseaseName })) });
        console.log(`Seeded ${OE.length} O/E findings`);
    }
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedClinicalTerms(prisma).finally(() => prisma.$disconnect());
}
