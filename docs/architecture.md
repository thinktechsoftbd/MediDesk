# Architecture

The supplied design sketch is implemented as six bounded areas:

Patient -> Case History 01..04 -> Prescription
                         -> Payment / Accounting
Greeting Templates -> Email / SMS / WhatsApp
Security -> Users -> Roles -> Permissions -> User Permissions
Security -> Menus -> User Menus

Patient and case records are the clinical source of truth. Prescriptions reference both
the patient and exact case history. Payments reference the patient and calculate a
transaction-level due as `amount - discount - paidAmount`.

The database also includes Appointment because automated appointment reminders need a
first-class scheduled date/time.

For production, keep messaging provider credentials server-side and run reminder
automation through a protected cron/worker endpoint rather than from the browser.
