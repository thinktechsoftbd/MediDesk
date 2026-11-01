// Organization Type options used by the organization form and API routes.
// Values match the OrganizationType enum in prisma/schema.prisma.
export const ORGANIZATION_TYPES = [
  { value: "DOCTOR_CHAMBER", label: "Doctor Chamber" },
  { value: "DENTAL_CHAMBER", label: "Dental Chamber" },
  { value: "CLINIC_MANAGEMENT", label: "Clinic Management" },
  { value: "HOSPITAL_MANAGEMENT", label: "Hospital Management" },
] as const;

export type OrganizationTypeValue = (typeof ORGANIZATION_TYPES)[number]["value"];

export const ORGANIZATION_TYPE_VALUES = ORGANIZATION_TYPES.map((t) => t.value) as readonly string[];

export function isOrganizationType(v: unknown): v is OrganizationTypeValue {
  return typeof v === "string" && ORGANIZATION_TYPE_VALUES.includes(v);
}
