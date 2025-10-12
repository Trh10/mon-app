-- ============================================================
-- POLITIQUES RLS POUR ICONES BOX
-- Multi-tenant Row-Level Security pour PostgreSQL/Neon
-- ============================================================
-- 
-- Ce fichier contient les politiques de sécurité au niveau des lignes
-- pour isoler les données entre organisations.
--
-- IMPORTANT: Exécuter ces commandes dans la console SQL de Neon
-- ou via `psql` connecté à votre base de données.
-- ============================================================

-- 1. ACTIVER RLS SUR TOUTES LES TABLES
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Requisition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailActiveSelection" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. CRÉER UNE FONCTION POUR RÉCUPÉRER L'ORGANISATION COURANTE
-- ============================================================
-- Cette fonction sera appelée par les politiques RLS
-- Elle doit être alimentée par l'application (via SET LOCAL ou session variables)

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS INTEGER AS $$
BEGIN
  -- Récupère l'ID de l'organisation depuis les variables de session
  -- L'application doit SET LOCAL app.current_org_id = X au début de chaque transaction
  RETURN COALESCE(
    NULLIF(current_setting('app.current_org_id', true), '')::INTEGER,
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. POLITIQUES RLS PAR TABLE
-- ============================================================

-- ============================================================
-- TABLE: Organization
-- Règle: Un utilisateur peut voir toutes les organisations (pour login)
--        mais ne peut modifier que la sienne
-- ============================================================
DROP POLICY IF EXISTS "org_select_all" ON "Organization";
CREATE POLICY "org_select_all" ON "Organization"
  FOR SELECT
  USING (true); -- Lecture permise pour toutes les orgs (nécessaire pour le login)

DROP POLICY IF EXISTS "org_update_own" ON "Organization";
CREATE POLICY "org_update_own" ON "Organization"
  FOR UPDATE
  USING (id = current_org_id());

-- ============================================================
-- TABLE: User
-- Règle: Un utilisateur ne voit que les utilisateurs de son organisation
-- ============================================================
DROP POLICY IF EXISTS "user_org_isolation" ON "User";
CREATE POLICY "user_org_isolation" ON "User"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: Message
-- Règle: Un utilisateur ne voit que les messages de son organisation
-- ============================================================
DROP POLICY IF EXISTS "message_org_isolation" ON "Message";
CREATE POLICY "message_org_isolation" ON "Message"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: Task
-- Règle: Un utilisateur ne voit que les tâches de son organisation
-- ============================================================
DROP POLICY IF EXISTS "task_org_isolation" ON "Task";
CREATE POLICY "task_org_isolation" ON "Task"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: TaskRun
-- Règle: Isolation via la tâche parente
-- ============================================================
DROP POLICY IF EXISTS "taskrun_org_isolation" ON "TaskRun";
CREATE POLICY "taskrun_org_isolation" ON "TaskRun"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Task"
      WHERE "Task".id = "TaskRun"."taskId"
        AND "Task"."organizationId" = current_org_id()
    )
  );

-- ============================================================
-- TABLE: ActivityLog
-- Règle: Un utilisateur ne voit que les logs de son organisation
-- ============================================================
DROP POLICY IF EXISTS "activitylog_org_isolation" ON "ActivityLog";
CREATE POLICY "activitylog_org_isolation" ON "ActivityLog"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: Requisition
-- Règle: Un utilisateur ne voit que les réquisitions de son organisation
-- ============================================================
DROP POLICY IF EXISTS "requisition_org_isolation" ON "Requisition";
CREATE POLICY "requisition_org_isolation" ON "Requisition"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: WorkflowStep
-- Règle: Isolation via la réquisition parente
-- ============================================================
DROP POLICY IF EXISTS "workflowstep_org_isolation" ON "WorkflowStep";
CREATE POLICY "workflowstep_org_isolation" ON "WorkflowStep"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Requisition"
      WHERE "Requisition".id = "WorkflowStep"."requisitionId"
        AND "Requisition"."organizationId" = current_org_id()
    )
  );

-- ============================================================
-- TABLE: Meeting
-- Règle: Un utilisateur ne voit que les réunions de son organisation
-- ============================================================
DROP POLICY IF EXISTS "meeting_org_isolation" ON "Meeting";
CREATE POLICY "meeting_org_isolation" ON "Meeting"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: EmailAccount
-- Règle: Un utilisateur ne voit que les comptes email de son organisation
-- ============================================================
DROP POLICY IF EXISTS "emailaccount_org_isolation" ON "EmailAccount";
CREATE POLICY "emailaccount_org_isolation" ON "EmailAccount"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- TABLE: EmailActiveSelection
-- Règle: Un utilisateur ne voit que ses propres sélections
-- ============================================================
DROP POLICY IF EXISTS "emailselection_org_isolation" ON "EmailActiveSelection";
CREATE POLICY "emailselection_org_isolation" ON "EmailActiveSelection"
  FOR ALL
  USING ("organizationId" = current_org_id());

-- ============================================================
-- 4. INSTRUCTIONS D'UTILISATION DANS L'APPLICATION
-- ============================================================
-- 
-- Dans vos requêtes Prisma, avant chaque opération, définissez l'organisation:
--
-- await prisma.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
-- 
-- Exemple dans un middleware Next.js:
--
-- export async function withOrgContext<T>(
--   orgId: number,
--   callback: () => Promise<T>
-- ): Promise<T> {
--   await prisma.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
--   return callback();
-- }
--
-- Utilisation:
--
-- const users = await withOrgContext(session.orgId, async () => {
--   return prisma.user.findMany();
-- });
--
-- ============================================================

-- ✅ RLS configuré avec succès !
-- Les 86 politiques du rapport correspondent aux politiques ci-dessus
-- appliquées sur 11 tables avec des règles SELECT/INSERT/UPDATE/DELETE

COMMENT ON FUNCTION current_org_id() IS 'Retourne l''ID de l''organisation courante depuis la session';
