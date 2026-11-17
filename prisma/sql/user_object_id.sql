-- =====================================================================
-- "User".object_id: the user's public id, as organization.object_id. Used in links that name
-- a user, e.g. the Finance Desk: /finance-desk/{organization object_id}/{user object_id}.
-- Same column as User.objectId in prisma/schema.prisma (`prisma db push` creates it too).
-- Safe to run more than once; every existing user gets an id of their own.
--   npx prisma db execute --file prisma/sql/user_object_id.sql --schema prisma/schema.prisma
-- =====================================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "object_id" UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "User_object_id_key" ON "User"("object_id");
