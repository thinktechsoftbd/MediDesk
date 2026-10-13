import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedOrganization() {
  const count = await prisma.organization.count();
  if (count === 0) {
    await prisma.organization.create({
      data: {
        nameEn: "Mohonto Dental Care",
        nameBn: "Mohonto Dental Care",
        slogan: null,
        code: "MDC-001",
        email: "info@mohontodental.com",
        phone: "01700-000000",
        website: "https://mohontodental.com",
        addressLine1: "Station Road",
        city: "Rajshahi",
        country: "Bangladesh",
        isActive: true,
      },
    });
    console.log("Seeded organization");
  }
}

async function seedChartOfAccounts() {
  const count = await prisma.accAcParentClass.count();
  if (count > 0) return;

  await prisma.accAcParentClass.createMany({
    data: [
      { id: 1, name: "ASSETS", parentCode: "1" },
      { id: 2, name: "LIABILITIES", parentCode: "2" },
      { id: 3, name: "INCOME", parentCode: "4" },
      { id: 4, name: "EXPENDITURE", parentCode: "5" },
      { id: 5, name: "EQUITY", parentCode: "3" },
    ],
  });

  await prisma.accAcClass.createMany({
    data: [
      { id: 1, acCode: "101", className: "NON CURRENT ASSET", acGroup: "1", parentClassId: 1 },
      { id: 2, acCode: "102", className: "CURRENT ASSET", acGroup: "1", parentClassId: 1 },
      { id: 3, acCode: "301", className: "CAPITAL ACCOUNT", acGroup: "3", parentClassId: 5 },
      { id: 4, acCode: "201", className: "NON CURRENT LIABILITIES", acGroup: "2", parentClassId: 2 },
      { id: 5, acCode: "202", className: "CURRENT LIABILITIES", acGroup: "2", parentClassId: 2 },
      { id: 6, acCode: "401", className: "INCOME", acGroup: "4", parentClassId: 3 },
      { id: 7, acCode: "501", className: "EXPENSES", acGroup: "5", parentClassId: 4 },
    ],
  });

  await prisma.accMainClass.createMany({
    data: [
      { id: 2,  acCode: "101", mainCode: "10101", mainName: "Intangible Assets", acClassId: 1 },
      { id: 21, acCode: "101", mainCode: "10102", mainName: "Tangible Fixed Assets", acClassId: 1 },
      { id: 5,  acCode: "102", mainCode: "10201", mainName: "Advances , Deposits & Prepayments", acClassId: 2 },
      { id: 6,  acCode: "102", mainCode: "10202", mainName: "Stock and Store", acClassId: 2 },
      { id: 4,  acCode: "102", mainCode: "10203", mainName: "Accounts Receivables", acClassId: 2 },
      { id: 3,  acCode: "102", mainCode: "10204", mainName: "Cash-in-Hand", acClassId: 2 },
      { id: 18, acCode: "102", mainCode: "10210", mainName: "Bills Receivables", acClassId: 2 },
      { id: 33, acCode: "102", mainCode: "10205", mainName: "Advance Tax", acClassId: 2 },
      { id: 26, acCode: "102", mainCode: "10206", mainName: "Security Deposits - Asset", acClassId: 2 },
      { id: 25, acCode: "102", mainCode: "10207", mainName: "Investments", acClassId: 2 },
      { id: 24, acCode: "102", mainCode: "10208", mainName: "Cash At Bank", acClassId: 2 },
      { id: 23, acCode: "102", mainCode: "10209", mainName: "Intercompany Current Receivables", acClassId: 2 },
      { id: 9,  acCode: "201", mainCode: "20102", mainName: "Non Current Liabilities", acClassId: 4 },
      { id: 22, acCode: "201", mainCode: "20103", mainName: "Loans (Liability)", acClassId: 4 },
      { id: 28, acCode: "201", mainCode: "20101", mainName: "Long Term Loan", acClassId: 4 },
      { id: 20, acCode: "202", mainCode: "20202", mainName: "Accounts Payable - LC", acClassId: 5 },
      { id: 27, acCode: "202", mainCode: "20203", mainName: "Security Received - Liabilities", acClassId: 5 },
      { id: 13, acCode: "202", mainCode: "20207", mainName: "Liabilities for Expenses", acClassId: 5 },
      { id: 19, acCode: "202", mainCode: "20205", mainName: "Bank OD A/c", acClassId: 5 },
      { id: 38, acCode: "202", mainCode: "20209", mainName: "DIRECTORS LOAN.", acClassId: 5 },
      { id: 10, acCode: "202", mainCode: "20204", mainName: "Accounts Payable - Non L/C", acClassId: 5 },
      { id: 11, acCode: "202", mainCode: "20206", mainName: "Bills Payable", acClassId: 5 },
      { id: 36, acCode: "202", mainCode: "20208", mainName: "Intercompany Current Liabilities", acClassId: 5 },
      { id: 14, acCode: "202", mainCode: "20201", mainName: "Short Term Loan", acClassId: 5 },
      { id: 7,  acCode: "301", mainCode: "30101", mainName: "Owners Equity", acClassId: 3 },
      { id: 15, acCode: "401", mainCode: "40101", mainName: "Operating Revenue", acClassId: 6, mcDisplayOrder: 1, acDisplayOrder: 1, acGroupDisplayOrder: 1 },
      { id: 30, acCode: "401", mainCode: "40012", mainName: "Non Operating Revenue", acClassId: 6, mcDisplayOrder: 2, acDisplayOrder: 2, acGroupDisplayOrder: 1 },
      { id: 29, acCode: "501", mainCode: "50102", mainName: "Direct Expenses", acClassId: 7, mcDisplayOrder: 5, acDisplayOrder: 8, acGroupDisplayOrder: 8 },
      { id: 1,  acCode: "501", mainCode: "50103", mainName: "Operating Overhead", acClassId: 7, mcDisplayOrder: 8, acDisplayOrder: 11, acGroupDisplayOrder: 11 },
      { id: 17, acCode: "501", mainCode: "50104", mainName: "Purchase Accounts", acClassId: 7, mcDisplayOrder: 2, acDisplayOrder: 5, acGroupDisplayOrder: 5 },
      { id: 16, acCode: "501", mainCode: "50101", mainName: "Non Operating Overhead", acClassId: 7, mcDisplayOrder: 9, acDisplayOrder: 12, acGroupDisplayOrder: 12 },
      { id: 34, acCode: "501", mainCode: "50105", mainName: "Income Tax", acClassId: 7, mcDisplayOrder: 101, acDisplayOrder: 14, acGroupDisplayOrder: 14 },
    ],
  });

  // explicit ids were used, so move the sequences past them
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('acc_ac_parent_class','acc_ac_parent_class_id'), (SELECT MAX(acc_ac_parent_class_id) FROM acc_ac_parent_class))`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('acc_ac_class','acc_ac_class_id'), (SELECT MAX(acc_ac_class_id) FROM acc_ac_class))`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('acc_main_class','acc_main_class_id'), (SELECT MAX(acc_main_class_id) FROM acc_main_class))`);

  console.log("Seeded chart of accounts");
}

async function seedMedicines() {
  const count = await prisma.medicine.count();
  if (count > 0) return;
  await prisma.medicine.createMany({
    data: [
      { name: "Amoxicillin", strength: "125", unit: "mg/5 mL", dosageForm: "Suspension", manufacturerType: "Local/Imported", treatmentUse: "Pediatric bacterial infection", createdBy: "seed" },
      { name: "Amoxicillin", strength: "250", unit: "mg/5 mL", dosageForm: "Suspension", manufacturerType: "Local/Imported", treatmentUse: "Pediatric bacterial infection", createdBy: "seed" },
      { name: "Amoxicillin", strength: "250", unit: "mg", dosageForm: "Capsule", manufacturerType: "Local/Imported", treatmentUse: "Bacterial infection", createdBy: "seed" },
      { name: "Amoxicillin", strength: "500", unit: "mg", dosageForm: "Capsule", manufacturerType: "Local/Imported", treatmentUse: "Bacterial infection", createdBy: "seed" },
      { name: "Amoxicillin + Clavulanic Acid", strength: "375", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Dental infection", createdBy: "seed" },
      { name: "Amoxicillin + Clavulanic Acid", strength: "625", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Dental infection", createdBy: "seed" },
      { name: "Metronidazole", strength: "200", unit: "mg/5 mL", dosageForm: "Suspension", manufacturerType: "Local/Imported", treatmentUse: "Anaerobic dental infection", createdBy: "seed" },
      { name: "Metronidazole", strength: "400", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Anaerobic dental infection", createdBy: "seed" },
      { name: "Metronidazole", strength: "500", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Anaerobic dental infection", createdBy: "seed" },
      { name: "Chlorhexidine", strength: "0.12", unit: "%", dosageForm: "Mouthwash", manufacturerType: "Local/Imported", treatmentUse: "Gingivitis/plaque control", createdBy: "seed" },
      { name: "Chlorhexidine", strength: "0.20", unit: "%", dosageForm: "Mouthwash", manufacturerType: "Local/Imported", treatmentUse: "Gingivitis/plaque control", createdBy: "seed" },
      { name: "Chlorhexidine", strength: "1", unit: "%", dosageForm: "Gel", manufacturerType: "Local/Imported", treatmentUse: "Oral antiseptic", createdBy: "seed" },
      { name: "Chlorhexidine", strength: "2", unit: "%", dosageForm: "Gel", manufacturerType: "Local/Imported", treatmentUse: "Oral antiseptic", createdBy: "seed" },
      { name: "Paracetamol", strength: "120", unit: "mg/5 mL", dosageForm: "Syrup", manufacturerType: "Local/Imported", treatmentUse: "Dental pain/fever", createdBy: "seed" },
      { name: "Paracetamol", strength: "250", unit: "mg/5 mL", dosageForm: "Syrup", manufacturerType: "Local/Imported", treatmentUse: "Pediatric pain/fever", createdBy: "seed" },
      { name: "Paracetamol", strength: "500", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Dental pain/fever", createdBy: "seed" },
      { name: "Ibuprofen", strength: "100", unit: "mg/5 mL", dosageForm: "Suspension", manufacturerType: "Local/Imported", treatmentUse: "Pediatric pain/inflammation", createdBy: "seed" },
      { name: "Ibuprofen", strength: "200", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Dental pain/inflammation", createdBy: "seed" },
      { name: "Ibuprofen", strength: "400", unit: "mg", dosageForm: "Tablet", manufacturerType: "Local/Imported", treatmentUse: "Dental pain/inflammation", createdBy: "seed" },
      { name: "Lidocaine", strength: "2", unit: "%", dosageForm: "Gel", manufacturerType: "Local/Imported", treatmentUse: "Topical anesthesia", createdBy: "seed" },
      { name: "Lidocaine", strength: "2", unit: "%", dosageForm: "Injection", manufacturerType: "Local/Imported", treatmentUse: "Dental local anesthesia", createdBy: "seed" },
      { name: "Benzocaine", strength: "10", unit: "%", dosageForm: "Gel", manufacturerType: "Local/Imported", treatmentUse: "Oral pain relief", createdBy: "seed" },
      { name: "Benzocaine", strength: "20", unit: "%", dosageForm: "Gel", manufacturerType: "Local/Imported", treatmentUse: "Oral pain relief", createdBy: "seed" },
      { name: "Benzydamine", strength: "0.15", unit: "%", dosageForm: "Mouthwash", manufacturerType: "Local/Imported", treatmentUse: "Oral inflammation/pain", createdBy: "seed" },
      { name: "Miconazole", strength: "2", unit: "%", dosageForm: "Oral Gel", manufacturerType: "Local/Imported", treatmentUse: "Oral candidiasis", createdBy: "seed" },
      { name: "Nystatin", strength: "100,000", unit: "IU/mL", dosageForm: "Oral Suspension", manufacturerType: "Local/Imported", treatmentUse: "Oral candidiasis", createdBy: "seed" },
      { name: "Triamcinolone Acetonide", strength: "0.1", unit: "%", dosageForm: "Oral Paste", manufacturerType: "Local/Imported", treatmentUse: "Oral inflammatory lesions", createdBy: "seed" },
      { name: "Povidone-Iodine", strength: "1", unit: "%", dosageForm: "Gargle/Solution", manufacturerType: "Local/Imported", treatmentUse: "Oral antisepsis", createdBy: "seed" },
      { name: "Hydrogen Peroxide", strength: "3", unit: "%", dosageForm: "Solution", manufacturerType: "Local/Imported", treatmentUse: "Oral cleansing", createdBy: "seed" },
    ],
  });
  console.log("Seeded medicines");
}

async function fixPatientNos() {
  const all = await prisma.patient.findMany({ orderBy: { id: "asc" }, select: { id: true, patientNo: true } });
  const valid = /^P-\d{4}$/;
  let max = 0;
  for (const p of all) {
    if (valid.test(p.patientNo)) {
      const n = Number(p.patientNo.slice(2));
      if (n > max) max = n;
    }
  }
  for (const p of all) {
    if (!valid.test(p.patientNo)) {
      max += 1;
      const newNo = `P-${String(max).padStart(4, "0")}`;
      await prisma.patient.update({ where: { id: p.id }, data: { patientNo: newNo } });
      console.log(`Patient ${p.id}: ${p.patientNo} -> ${newNo}`);
    }
  }
}

async function main() {
  await fixPatientNos();
  await seedMedicines();
  await seedChartOfAccounts();
  await seedOrganization();
  const permissions = [
    ["DASHBOARD.V", "View Dashboard"],
    ["PATIENT.V", "View Patients"], ["PATIENT.C", "Create Patients"], ["PATIENT.E", "Edit Patients"],
    ["CASE.V", "View Case History"], ["CASE.C", "Create Case History"], ["CASE.E", "Edit Case History"],
    ["PRESCRIPTION.V", "View Prescriptions"], ["PRESCRIPTION.C", "Create Prescriptions"],
    ["PAYMENT.V", "View Payments"], ["PAYMENT.C", "Create Payments"],
    ["GREETING.V", "View Greetings"], ["GREETING.C", "Send Greetings"],
    ["SECURITY.V", "View Security"], ["SECURITY.M", "Manage Security"]
  ];
  for (const [code, name] of permissions) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  const admin = await prisma.role.upsert({ where: { name: "Admin" }, update: {}, create: { name: "Admin", description: "Full access" } });
  const doctor = await prisma.role.upsert({ where: { name: "Doctor" }, update: {}, create: { name: "Doctor", description: "Clinical access" } });
  const receptionist = await prisma.role.upsert({ where: { name: "Receptionist" }, update: {}, create: { name: "Receptionist", description: "Front desk access" } });

  const allPermissions = await prisma.permission.findMany();
  for (const role of [admin, doctor, receptionist]) {
    for (const p of allPermissions) {
      if (role.name === "Admin" || (role.name === "Doctor" && !p.code.startsWith("SECURITY")) || (role.name === "Receptionist" && ["DASHBOARD.V","PATIENT.V","PATIENT.C","PATIENT.E","CASE.V","CASE.C","CASE.E","PRESCRIPTION.V","PAYMENT.V","PAYMENT.C","GREETING.V"].includes(p.code))) {
        await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, update: {}, create: { roleId: role.id, permissionId: p.id } });
      }
    }
  }

  // const menus = [
  //   ["Dashboard","/dashboard","layout-dashboard",1],
  //   ["Patients","/patients","users",2],
  //   ["Case History","/cases","file-text",3],
  //   ["Prescriptions","/prescriptions","pill",4],
  //   ["Payments & Accounting","/payments","wallet",5],
  //   ["Greetings","/greetings","send",6],
  //   ["Security","/security","shield",7]
  // ];
  // for (const [title,path,icon,sortOrder] of menus) {
  //   await prisma.menu.upsert({ where: { id: Number(sortOrder) }, update: { title: String(title), path: String(path), icon: String(icon), sortOrder: Number(sortOrder) }, create: { id: Number(sortOrder), title: String(title), path: String(path), icon: String(icon), sortOrder: Number(sortOrder) } });
  // }
  const menus = [
  ["Dashboard", "/dashboard", "layout-dashboard", 1],
  ["Patients", "/patients", "users", 2],
  ["Case History", "/cases", "file-text", 3],
  ["Prescriptions", "/prescriptions", "pill", 4],
  ["Payments & Accounting", "/payments", "wallet", 5],
  ["Greetings", "/greetings", "send", 6],
];

for (const [title, path, icon, sortOrder] of menus) {
  await prisma.menu.upsert({
    where: { id: Number(sortOrder) },
    update: {
      title: String(title),
      path: String(path),
      icon: String(icon),
      sortOrder: Number(sortOrder),
    },
    create: {
      id: Number(sortOrder),
      title: String(title),
      path: String(path),
      icon: String(icon),
      sortOrder: Number(sortOrder),
    },
  });
}

// Security parent menu
const security = await prisma.menu.upsert({
  where: { id: 7 },
  update: {
    title: "Security",
    path: "#",
    icon: "shield",
    sortOrder: 7,
  },
  create: {
    id: 7,
    title: "Security",
    path: "#",
    icon: "shield",
    sortOrder: 7,
  },
});

// Security sub menus
await prisma.menu.upsert({
  where: { id: 8 },
  update: {
    title: "User",
    path: "/security/users",
    icon: "users",
    parentId: security.id,
    sortOrder: 1,
  },
  create: {
    id: 8,
    title: "User",
    path: "/security/users",
    icon: "users",
    parentId: security.id,
    sortOrder: 1,
  },
});

await prisma.menu.upsert({
  where: { id: 9 },
  update: {
    title: "Role",
    path: "/security/roles",
    icon: "shield-check",
    parentId: security.id,
    sortOrder: 2,
  },
  create: {
    id: 9,
    title: "Role",
    path: "/security/roles",
    icon: "shield-check",
    parentId: security.id,
    sortOrder: 2,
  },
});

await prisma.menu.upsert({
  where: { id: 10 },
  update: {
    title: "Permission",
    path: "/security/permissions",
    icon: "key-round",
    parentId: security.id,
    sortOrder: 3,
  },
  create: {
    id: 10,
    title: "Permission",
    path: "/security/permissions",
    icon: "key-round",
    parentId: security.id,
    sortOrder: 3,
  },
});

  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const user = await prisma.user.upsert({ where: { email: "admin@mohonto.com" }, update: {}, create: { name: "System Administrator", email: "admin@mohonto.com", passwordHash } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: admin.id } }, update: {}, create: { userId: user.id, roleId: admin.id } });

  const birthday = await prisma.greetingTemplate.findFirst({ where: { name: "Birthday Greeting" } });
  if (!birthday) await prisma.greetingTemplate.create({
    data: { name: "Birthday Greeting", subject: "Happy Birthday from Mohonto Dental Care", channel: "EMAIL", body: "Dear {{patientName}}, wishing you a very happy birthday from Mohonto Dental Care!" }
  });

  console.log("Seed complete. Admin: admin@mohonto.com / Admin@123");
}

main().finally(() => prisma.$disconnect());
