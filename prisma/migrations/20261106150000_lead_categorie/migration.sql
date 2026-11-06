-- Toate tipurile de lead-uri stau în aceeași tabelă "Lead", diferențiate prin coloana "category".
-- Lead-urile existente (unitățile de cazare) primesc categoria HOTELURI. Nu se șterge și nu se mută niciun rând.

-- Copie de siguranță a tabelei Lead înainte de modificare, în schema separată "backup"
-- (nu e expusă prin API-ul Supabase și nu e atinsă de Prisma).
CREATE SCHEMA IF NOT EXISTS "backup";
CREATE TABLE IF NOT EXISTS "backup"."Lead_inainte_de_categorii" AS TABLE "Lead";

-- CreateEnum
CREATE TYPE "LeadCategory" AS ENUM ('HOTELURI', 'BARBERSHOPURI', 'RESTAURANTE', 'ACTIVITATI', 'SALOANE_BEAUTY');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "category" "LeadCategory" NOT NULL DEFAULT 'HOTELURI';

-- CreateIndex
CREATE INDEX "Lead_category_priority_idx" ON "Lead"("category", "priority");
