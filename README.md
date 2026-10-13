# Mohonto Dental Care

A full-stack dental clinic management starter based on the supplied module sketch.

## Stack
- Next.js 14 App Router + TypeScript
- PostgreSQL + Prisma
- NextAuth credentials authentication
- Tailwind CSS with shadcn/ui-style reusable components
- `@react-pdf/renderer` for prescription PDFs
- Nodemailer for email
- Twilio for SMS
- Configurable WhatsApp provider

## Modules
1. Patient registration/search/update
2. Case History 01–04 linked to patients
3. Prescriptions linked to case histories, medicine rows and PDF
4. Payments, advance payment, discount, invoice number and due calculation
5. Greeting templates and email/SMS/WhatsApp dispatch
6. Appointment storage for reminder automation
7. Users, roles, permissions, user permissions, menus and user menus
8. Dashboard statistics

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL and NEXTAUTH_SECRET
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

Demo:
- Email: `admin@mohonto.com`
- Password: `Admin@123`

## Production notes
- Change the seeded admin password immediately.
- Configure SMTP, Twilio and WhatsApp provider variables before enabling messaging.
- Add permission checks to each API handler beyond authentication for production RBAC.
- Put uploaded patient photos in object storage (S3/Cloudinary/etc.) rather than the database.
- Add a scheduled worker/cron that checks `appointments` and patient birthdays and creates/sends notifications.
- Add audit logging for security-sensitive actions.
- Add database migrations (`prisma migrate deploy`) in CI/CD.

## API map

### Clinical
- `GET/POST /api/patients`
- `GET/PATCH/DELETE /api/patients/:id`
- `GET/POST /api/cases`
- `PATCH/DELETE /api/cases/:id`
- `GET/POST /api/prescriptions`
- `GET/DELETE /api/prescriptions/:id`
- `GET /api/prescriptions/:id/pdf`

### Accounting
- `GET/POST /api/payments`
- `GET /api/payments/:id`

### Greetings
- `GET/POST /api/greetings/templates`
- `PATCH/DELETE /api/greetings/templates/:id`
- `POST /api/greetings/send`
- `GET /api/notifications`
- `GET/POST /api/appointments`

### Security
- `GET/POST /api/security/users`
- `GET/POST /api/security/roles`
- `GET/POST /api/security/permissions`
- `GET/POST /api/security/menus`
- `GET/POST/DELETE /api/security/user-permissions`
- `GET/POST /api/security/user-menus`

### Dashboard
- `GET /api/dashboard`

## Suggested next production additions
- Tooth-chart / odontogram UI
- Treatment/service catalog
- Invoice line items and tax
- Appointment calendar
- Automated birthday/appointment reminder worker
- Patient photo upload endpoint
- Fine-grained server-side permission middleware
- Audit trail and reporting/export
