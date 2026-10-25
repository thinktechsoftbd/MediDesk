// Fields of the New / Update Patient form (src/app/(protected)/patients/page.tsx), in order
export const PATIENT_FIELDS: { key: string; label: string; type: string }[] = [
    { key: "name", label: "Full Name", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "age", label: "Age", type: "text" },
    { key: "dateOfBirth", label: "Date Of Birth", type: "date" },
    { key: "gender", label: "Gender", type: "radio" },
    { key: "ageGroup", label: "Adult / Child", type: "radio" },
    { key: "bloodGroup", label: "Blood Group", type: "select" },
    { key: "admissionDate", label: "Admission Date", type: "date" },
    { key: "followUpDate", label: "Next Follow-up Date", type: "date" },
    { key: "serviceCharge", label: "Total Agreement Charge", type: "number" },
    { key: "photoUrl", label: "Patient Photo", type: "photo" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "agreementDetails", label: "Agreement Details", type: "textarea" },
    { key: "notes", label: "Remarks", type: "textarea" },
];

// user_hidden_field.form of the patient form
export const PATIENT_FORM = "PATIENT";

// always on the form, whatever is hidden for the user
export const REQUIRED_PATIENT_FIELDS = ["name", "phone"];

// what Security > Users can hide for a user
export const HIDEABLE_PATIENT_FIELDS = PATIENT_FIELDS.filter((f) => !REQUIRED_PATIENT_FIELDS.includes(f.key));

// the hideable keys among a request's list, without repeats
export const cleanHiddenPatientFields = (keys: unknown): string[] =>
    Array.isArray(keys)
        ? HIDEABLE_PATIENT_FIELDS.map((f) => f.key).filter((k) => keys.includes(k))
        : [];
