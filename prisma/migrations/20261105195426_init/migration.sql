-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'AGENT_VANZARI');

-- CreateEnum
CREATE TYPE "public"."PropertyType" AS ENUM ('HOTEL', 'PENSIUNE_VILA', 'APARTAMENT_REGIM_HOTELIER', 'HOSTEL', 'MOTEL', 'CASA_DE_VACANTA', 'CAMPING', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."Zone" AS ENUM ('CONSTANTA', 'MAMAIA', 'MAMAIA_NORD_NAVODARI', 'EFORIE_NORD', 'EFORIE_SUD', 'AGIGEA', 'ALTA');

-- CreateEnum
CREATE TYPE "public"."WebsiteStatus" AS ENUM ('ARE_SITE_PROPRIU', 'DOAR_PLATFORME', 'FARA_SITE', 'NECUNOSCUT');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "public"."PipelineStage" AS ENUM ('NOU', 'DE_VERIFICAT', 'CONTACTAT', 'INTERESAT', 'DEMO_PROGRAMAT', 'OFERTA_TRIMISA', 'NEGOCIERE', 'CASTIGAT', 'PIERDUT', 'REVINO_MAI_TARZIU');

-- CreateEnum
CREATE TYPE "public"."LostReason" AS ENUM ('ARE_DEJA_SITE', 'NU_VREA', 'PRET', 'NU_RASPUNDE', 'INCHIS', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."LeadSource" AS ENUM ('OSM', 'MINISTER', 'OSM_SI_MINISTER', 'GOOGLE_MAPS', 'GOOGLE_PLACES', 'BOOKING', 'FACEBOOK_INSTAGRAM', 'PLATFORMA_LOCALA', 'RECOMANDARE', 'TEREN', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."ContactRole" AS ENUM ('PROPRIETAR', 'ADMINISTRATOR', 'MANAGER', 'RECEPTIE', 'CONTABIL', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."ContactChannel" AS ENUM ('TELEFON', 'WHATSAPP', 'EMAIL', 'VIZITA');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('APEL', 'WHATSAPP', 'EMAIL', 'VIZITA', 'DEMO', 'NOTA');

-- CreateEnum
CREATE TYPE "public"."InteractionDirection" AS ENUM ('IESIRE', 'INTRARE');

-- CreateEnum
CREATE TYPE "public"."InteractionOutcome" AS ENUM ('FARA_RASPUNS', 'NUMAR_GRESIT', 'DISCUTIE_POZITIVA', 'DISCUTIE_NEUTRA', 'CERE_REVENIRE', 'CERE_OFERTA', 'DEMO_STABILIT', 'REFUZ', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('APEL', 'WHATSAPP', 'EMAIL', 'VIZITA', 'DEMO', 'TRIMITE_OFERTA', 'VERIFICARE', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('DESCHISA', 'FINALIZATA', 'ANULATA');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('NORMALA', 'RIDICATA');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('CIORNA', 'TRIMISA', 'ACCEPTATA', 'RESPINSA', 'EXPIRATA');

-- CreateEnum
CREATE TYPE "public"."ClientStatus" AS ENUM ('IN_IMPLEMENTARE', 'ACTIV', 'SUSPENDAT', 'REZILIAT');

-- CreateEnum
CREATE TYPE "public"."ImplementationStatus" AS ENUM ('NEINCEPUT', 'IN_LUCRU', 'GATA', 'NU_SE_APLICA');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIV', 'IN_PAUZA', 'ANULAT');

-- CreateEnum
CREATE TYPE "public"."PaymentKind" AS ENUM ('SETUP', 'ABONAMENT', 'ALTUL');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('NEPLATIT', 'PARTIAL', 'PLATIT', 'ANULAT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('TRANSFER_BANCAR', 'CARD', 'NUMERAR', 'ALTA');

-- CreateEnum
CREATE TYPE "public"."ImportStatus" AS ENUM ('PREVIZUALIZARE', 'IN_CURS', 'FINALIZAT', 'ESUAT', 'ANULAT');

-- CreateEnum
CREATE TYPE "public"."ImportRowAction" AS ENUM ('CREAT', 'ACTUALIZAT', 'NESCHIMBAT', 'IGNORAT', 'EROARE');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREARE', 'ACTUALIZARE', 'STERGERE', 'RESTAURARE', 'SCHIMBARE_ETAPA', 'IMPORT', 'EXPORT', 'OPT_OUT', 'LOGIN');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'AGENT_VANZARI',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "type" "public"."PropertyType" NOT NULL DEFAULT 'PENSIUNE_VILA',
    "zone" "public"."Zone" NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "email" TEXT,
    "starsOsm" INTEGER,
    "categoryMinistry" TEXT,
    "roomsCount" INTEGER,
    "placesCount" INTEGER,
    "websiteStatus" "public"."WebsiteStatus" NOT NULL DEFAULT 'NECUNOSCUT',
    "websiteUrl" TEXT,
    "bookingUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "otherLinks" TEXT[],
    "googleMapsUrl" TEXT,
    "osmUrl" TEXT,
    "osmId" TEXT,
    "ratingGoogle" DECIMAL(2,1),
    "ratingBooking" DECIMAL(3,1),
    "operatorName" TEXT,
    "operatorCui" TEXT,
    "inMinistryList" BOOLEAN NOT NULL DEFAULT false,
    "ministryRecordId" TEXT,
    "source" "public"."LeadSource" NOT NULL DEFAULT 'MANUAL',
    "priority" "public"."Priority" NOT NULL DEFAULT 'B',
    "stage" "public"."PipelineStage" NOT NULL DEFAULT 'NOU',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageOrder" INTEGER NOT NULL DEFAULT 0,
    "lostReason" "public"."LostReason",
    "lostReasonNote" TEXT,
    "followUpAt" TIMESTAMP(3),
    "manualCheckNote" TEXT,
    "notes" TEXT,
    "estimatedAnnualRevenue" DECIMAL(12,2),
    "lastInteractionAt" TIMESTAMP(3),
    "nextTaskAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdById" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContactAt" TIMESTAMP(3),
    "doNotContactReason" TEXT,
    "doNotContactById" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "dedupeKey" TEXT,
    "firstImportBatchId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."ContactRole" NOT NULL DEFAULT 'PROPRIETAR',
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "preferredChannel" "public"."ContactChannel" NOT NULL DEFAULT 'TELEFON',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interaction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "type" "public"."InteractionType" NOT NULL,
    "direction" "public"."InteractionDirection" NOT NULL DEFAULT 'IESIRE',
    "outcome" "public"."InteractionOutcome",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER,
    "summary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."TaskType" NOT NULL DEFAULT 'APEL',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'NORMALA',
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'DESCHISA',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "hasTime" BOOLEAN NOT NULL DEFAULT false,
    "remindAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdById" TEXT,
    "interactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PipelineStageChange" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStage" "public"."PipelineStage",
    "toStage" "public"."PipelineStage" NOT NULL,
    "lostReason" "public"."LostReason",
    "followUpAt" TIMESTAMP(3),
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "PipelineStageChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#178582',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeadTag" (
    "leadId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "public"."SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "filters" JSONB NOT NULL,
    "sort" JSONB,
    "columns" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfferTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "setupPrice" DECIMAL(12,2) NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "includedFeatures" TEXT[],
    "introText" TEXT,
    "termsText" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'CIORNA',
    "planName" TEXT NOT NULL,
    "setupPrice" DECIMAL(12,2) NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "features" TEXT[],
    "customText" TEXT,
    "validUntil" TIMESTAMP(3),
    "annualRevenue" DECIMAL(12,2) NOT NULL,
    "bookingCommissionPct" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "bookingSharePct" DECIMAL(5,2) NOT NULL DEFAULT 70,
    "directSharePct" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "commissionSavedYear" DECIMAL(12,2) NOT NULL,
    "ourCostYear1" DECIMAL(12,2) NOT NULL,
    "ourCostYearN" DECIMAL(12,2) NOT NULL,
    "netBenefitYear1" DECIMAL(12,2) NOT NULL,
    "paybackMonths" DECIMAL(5,1),
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerId" TEXT,
    "status" "public"."ClientStatus" NOT NULL DEFAULT 'IN_IMPLEMENTARE',
    "planName" TEXT NOT NULL,
    "setupPrice" DECIMAL(12,2) NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "domain" TEXT,
    "tenantSlug" TEXT,
    "billingName" TEXT,
    "billingCui" TEXT,
    "billingRegCom" TEXT,
    "billingAddress" TEXT,
    "billingEmail" TEXT,
    "vatPayer" BOOLEAN,
    "siteStatus" "public"."ImplementationStatus" NOT NULL DEFAULT 'NEINCEPUT',
    "bookingEngineStatus" "public"."ImplementationStatus" NOT NULL DEFAULT 'NEINCEPUT',
    "icalStatus" "public"."ImplementationStatus" NOT NULL DEFAULT 'NEINCEPUT',
    "paymentsStatus" "public"."ImplementationStatus" NOT NULL DEFAULT 'NEINCEPUT',
    "goLiveAt" TIMESTAMP(3),
    "accountManagerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIV',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "kind" "public"."PaymentKind" NOT NULL DEFAULT 'ABONAMENT',
    "periodMonth" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'NEPLATIT',
    "method" "public"."PaymentMethod",
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sheetName" TEXT,
    "status" "public"."ImportStatus" NOT NULL DEFAULT 'PREVIZUALIZARE',
    "columnMap" JSONB NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "unchangedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "defaultOwnerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "action" "public"."ImportRowAction",
    "leadId" TEXT,
    "matchedBy" TEXT,
    "updatedFields" TEXT[],
    "error" TEXT,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_osmId_key" ON "public"."Lead"("osmId");

-- CreateIndex
CREATE INDEX "Lead_zone_priority_idx" ON "public"."Lead"("zone", "priority");

-- CreateIndex
CREATE INDEX "Lead_stage_stageOrder_idx" ON "public"."Lead"("stage", "stageOrder");

-- CreateIndex
CREATE INDEX "Lead_ownerId_stage_idx" ON "public"."Lead"("ownerId", "stage");

-- CreateIndex
CREATE INDEX "Lead_websiteStatus_idx" ON "public"."Lead"("websiteStatus");

-- CreateIndex
CREATE INDEX "Lead_lastInteractionAt_idx" ON "public"."Lead"("lastInteractionAt");

-- CreateIndex
CREATE INDEX "Lead_nameNormalized_zone_idx" ON "public"."Lead"("nameNormalized", "zone");

-- CreateIndex
CREATE INDEX "Lead_phoneNormalized_idx" ON "public"."Lead"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Lead_dedupeKey_idx" ON "public"."Lead"("dedupeKey");

-- CreateIndex
CREATE INDEX "Lead_operatorCui_idx" ON "public"."Lead"("operatorCui");

-- CreateIndex
CREATE INDEX "Lead_archivedAt_idx" ON "public"."Lead"("archivedAt");

-- CreateIndex
CREATE INDEX "Lead_searchText_trgm_idx" ON "public"."Lead" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lead_nameNormalized_trgm_idx" ON "public"."Lead" USING GIN ("nameNormalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Contact_leadId_idx" ON "public"."Contact"("leadId");

-- CreateIndex
CREATE INDEX "Contact_phoneNormalized_idx" ON "public"."Contact"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Interaction_leadId_occurredAt_idx" ON "public"."Interaction"("leadId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Interaction_userId_occurredAt_idx" ON "public"."Interaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_type_occurredAt_idx" ON "public"."Interaction"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_dueAt_idx" ON "public"."Task"("assigneeId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_leadId_status_idx" ON "public"."Task"("leadId", "status");

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "public"."Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "PipelineStageChange_leadId_changedAt_idx" ON "public"."PipelineStageChange"("leadId", "changedAt");

-- CreateIndex
CREATE INDEX "PipelineStageChange_toStage_changedAt_idx" ON "public"."PipelineStageChange"("toStage", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE INDEX "LeadTag_tagId_idx" ON "public"."LeadTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_name_key" ON "public"."SavedView"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_number_key" ON "public"."Offer"("number");

-- CreateIndex
CREATE INDEX "Offer_leadId_createdAt_idx" ON "public"."Offer"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "public"."Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Client_leadId_key" ON "public"."Client"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_offerId_key" ON "public"."Client"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantSlug_key" ON "public"."Client"("tenantSlug");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "public"."Client"("status");

-- CreateIndex
CREATE INDEX "Subscription_clientId_status_idx" ON "public"."Subscription"("clientId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_dueDate_idx" ON "public"."Payment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_clientId_dueDate_idx" ON "public"."Payment"("clientId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_subscriptionId_periodMonth_key" ON "public"."Payment"("subscriptionId", "periodMonth");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "public"."ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_leadId_idx" ON "public"."ImportRow"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_batchId_rowNumber_key" ON "public"."ImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "public"."AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_doNotContactById_fkey" FOREIGN KEY ("doNotContactById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_firstImportBatchId_fkey" FOREIGN KEY ("firstImportBatchId") REFERENCES "public"."ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "public"."Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PipelineStageChange" ADD CONSTRAINT "PipelineStageChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PipelineStageChange" ADD CONSTRAINT "PipelineStageChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeadTag" ADD CONSTRAINT "LeadTag_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeadTag" ADD CONSTRAINT "LeadTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferTemplate" ADD CONSTRAINT "OfferTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."OfferTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportRow" ADD CONSTRAINT "ImportRow_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
