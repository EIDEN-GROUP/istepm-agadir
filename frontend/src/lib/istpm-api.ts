import { api } from "@/lib/api";
import type {
  Etudiant,
  Formateur,
  Examen,
  Bulletin,
  Stage,
  PaiementLigne,
  LignePaiement,
  Seance,
  Filiere,
} from "@/lib/istpm-data";

/* ------------------------------------------------------------------ */
/*  Étudiants                                                          */
/* ------------------------------------------------------------------ */

export function fetchEtudiants(params?: {
  search?: string;
  filiere?: string;
  niveau?: string;
  statut?: string;
}) {
  return api.get<Etudiant[]>("/etudiants", params as Record<string, string | undefined>);
}

export function fetchEtudiant(id: string) {
  return api.get<Etudiant & { notes: any[]; historique: any[]; stageEnCours: any | null }>(
    `/etudiants/${id}`,
  );
}

export function createEtudiant(data: Record<string, unknown>) {
  return api.post<Etudiant>("/etudiants", data);
}

export function updateEtudiant(id: string, data: Record<string, unknown>) {
  return api.put<Etudiant>(`/etudiants/${id}`, data);
}

export function deleteEtudiant(id: string) {
  return api.delete<{ ok: boolean }>(`/etudiants/${id}`);
}

/* ------------------------------------------------------------------ */
/*  Formateurs                                                         */
/* ------------------------------------------------------------------ */

export function fetchFormateurs(params?: {
  search?: string;
  departement?: string;
  grade?: string;
}) {
  return api.get<Formateur[]>("/formateurs", params as Record<string, string | undefined>);
}

export function fetchFormateur(id: string) {
  return api.get<Formateur>(`/formateurs/${id}`);
}

export function createFormateur(data: Record<string, unknown>) {
  return api.post<Formateur>("/formateurs", data);
}

export function updateFormateur(id: string, data: Record<string, unknown>) {
  return api.put<Formateur>(`/formateurs/${id}`, data);
}

export function deleteFormateur(id: string) {
  return api.delete<{ ok: boolean }>(`/formateurs/${id}`);
}

/* ------------------------------------------------------------------ */
/*  Examens                                                            */
/* ------------------------------------------------------------------ */

export function fetchExamens(params?: {
  filiere?: string;
  niveau?: string;
  statut?: string;
  module?: string;
}) {
  return api.get<Examen[]>("/examens", params as Record<string, string | undefined>);
}

export function fetchExamen(id: string) {
  return api.get<Examen & { notes: any[] }>(`/examens/${id}`);
}

export function createExamen(data: Record<string, unknown>) {
  return api.post<Examen>("/examens", data);
}

export function updateExamen(id: string, data: Record<string, unknown>) {
  return api.put<Examen>(`/examens/${id}`, data);
}

export function deleteExamen(id: string) {
  return api.delete<{ ok: boolean }>(`/examens/${id}`);
}

export function saveNotesExamenApi(
  examenId: string,
  saisies: { etudiantId: string; theorique?: number; pratique?: number }[],
) {
  return api.post<{ ok: boolean }>(`/examens/${examenId}/notes`, { saisies });
}

/* ------------------------------------------------------------------ */
/*  Notes (grades)                                                      */
/* ------------------------------------------------------------------ */

export function createNote(data: {
  etudiantId: string;
  module: string;
  note: number;
  coef?: number;
  credits?: number;
  examen?: string;
}) {
  return api.post<{ id: string; etudiantId: string; module: string; note: string; coef: string; credits: string; examen: string }>("/notes", data);
}

export function deleteNote(id: string) {
  return api.delete<{ ok: boolean }>(`/notes/${id}`);
}

export function fetchStudentSemestres(id: string) {
  return api.get<{
    semestre: string;
    modules: { module: string; note: number }[];
    moyenne: number;
    resultat: string;
  }[]>(`/etudiants/${id}/semestres`);
}

/* ------------------------------------------------------------------ */
/*  Bulletins                                                          */
/* ------------------------------------------------------------------ */

export function fetchBulletins(params?: {
  filiere?: string;
  niveau?: string;
  statut?: string;
  session?: string;
  search?: string;
}) {
  return api.get<Bulletin[]>("/bulletins", params as Record<string, string | undefined>);
}

export function fetchBulletin(id: string) {
  return api.get<Bulletin>(`/bulletins/${id}`);
}

export function createBulletin(data: Record<string, unknown>) {
  return api.post<Bulletin>("/bulletins", data);
}

export function updateBulletin(id: string, data: Record<string, unknown>) {
  return api.put<Bulletin>(`/bulletins/${id}`, data);
}

export function deleteBulletin(id: string) {
  return api.delete<{ ok: boolean }>(`/bulletins/${id}`);
}

export function publierBulletinApi(id: string) {
  return api.post<Bulletin>(`/bulletins/${id}/publier`);
}

export function publierTousBulletinsApi() {
  return api.post<{ publies: number }>("/bulletins/publier-tout");
}

/* ------------------------------------------------------------------ */
/*  Stages                                                             */
/* ------------------------------------------------------------------ */

export function fetchStages(params?: {
  filiere?: string;
  niveau?: string;
  statut?: string;
  search?: string;
}) {
  return api.get<Stage[]>("/stages", params as Record<string, string | undefined>);
}

export function fetchStage(id: string) {
  return api.get<Stage>(`/stages/${id}`);
}

export function createStage(data: Record<string, unknown>) {
  return api.post<Stage>("/stages", data);
}

export function updateStage(id: string, data: Record<string, unknown>) {
  return api.put<Stage>(`/stages/${id}`, data);
}

export function deleteStage(id: string) {
  return api.delete<{ ok: boolean }>(`/stages/${id}`);
}

export function validerStageApi(id: string) {
  return api.post<Stage>(`/stages/${id}/valider`);
}

/* ------------------------------------------------------------------ */
/*  Paiements                                                          */
/* ------------------------------------------------------------------ */

export function fetchPaiements(params?: { etudiantId?: string }) {
  return api.get<PaiementLigne[]>("/paiements-istpm", params);
}

export function createPaiement(data: {
  etudiantId: string;
  montant: number;
  mode: string;
  periode: string;
  date?: string;
  /** Mois de scolarité réglé (suivi mensuel). Ignoré tant que l'API ne le gère pas. */
  mois?: string;
}) {
  return api.post<{ ok: boolean; recu: string; nouveauReste: number; statut: string }>(
    "/paiements-istpm",
    data,
  );
}

export function updateMoisPaiementStatut(etudiantId: string, mois: string, statut: string) {
  return api.put<{ ok: boolean }>(`/paiements-istpm/${etudiantId}/mois/${encodeURIComponent(mois)}`, { statut });
}

export function fetchPaiementStats() {
  return api.get<{
    total: number;
    count: number;
    encaisseCeMois: number;
    enAttente: number;
    impaye: number;
    retard: number;
    tauxRecouvrement: number;
  }>("/paiements-istpm/stats");
}

/* ------------------------------------------------------------------ */
/*  Settings / Filières                                                */
/* ------------------------------------------------------------------ */

export function fetchSettings() {
  return api.get<Record<string, unknown>>("/settings");
}

export function updateSetting(key: string, value: unknown) {
  return api.put(`/settings/${key}`, { value });
}

export function fetchFilieres() {
  return api.get<string[]>("/settings/filieres");
}

export function createFiliereApi(nom: string) {
  return api.post<{ filieres: string[] }>("/settings/filieres", { nom });
}

export function deleteFiliereApi(nom: string) {
  return api.delete<{ filieres: string[] }>(`/settings/filieres/${nom}`);
}

export function fetchStructuresApi() {
  return api.get<string[]>("/settings/structures");
}

export function createStructureApi(nom: string) {
  return api.post<{ structures: string[] }>("/settings/structures", { nom });
}

export function updateStructureApi(nom: string, nouveauNom: string) {
  return api.put<{ structures: string[] }>(`/settings/structures/${encodeURIComponent(nom)}`, { nouveauNom });
}

export function deleteStructureApi(nom: string) {
  return api.delete<{ structures: string[] }>(`/settings/structures/${encodeURIComponent(nom)}`);
}

export function resetSettings() {
  return api.post<{ ok: boolean }>("/settings/reset");
}

/* ------------------------------------------------------------------ */
/*  Seances                                                            */
/* ------------------------------------------------------------------ */

export function fetchSeances(params?: { start?: string; end?: string; professeurId?: string; date?: string }) {
  return api.get<Record<string, unknown>[]>("/seances", params);
}

export function createSeance(data: Record<string, unknown>) {
  return api.post<Record<string, unknown>>("/seances", data);
}

export function updateSeance(id: string, data: Record<string, unknown>) {
  return api.put<Record<string, unknown>>(`/seances/${id}`, data);
}

export function deleteSeance(id: string) {
  return api.delete<{ ok: boolean }>(`/seances/${id}`);
}

/* ------------------------------------------------------------------ */
/*  Dashboard aggregates                                               */
/* ------------------------------------------------------------------ */

export function fetchDashboardStats() {
  return api.get<{
    totalInscrits: number;
    deltaSemestre: number;
    formateursActifs: number;
    tauxReussite: number;
    totalARecouvrer: number;
  }>("/dashboard/istpm-stats");
}

export function fetchFinancier() {
  return api.get<{
    encaisse: number;
    encaisseCeMois: number;
    enAttente: number;
    impaye: number;
    retard: number;
    tauxRecouvrement: number;
  }>("/dashboard/istpm-financier");
}

export function fetchRepartitionFiliere() {
  return api.get<{ name: string; filiere: string; value: number }[]>(
    "/dashboard/istpm-repartition-filiere",
  );
}

export function fetchRepartitionNiveau() {
  return api.get<{ name: string; value: number }[]>("/dashboard/istpm-repartition-niveau");
}

export function fetchReussiteFiliere() {
  return api.get<{ name: string; filiere: string; value: number }[]>(
    "/dashboard/istpm-reussite-filiere",
  );
}

export function fetchEtudiantsARisque() {
  return api.get<any[]>("/dashboard/istpm-etudiants-a-risque");
}

export function fetchARelancer() {
  return api.get<any[]>("/dashboard/istpm-a-relancer");
}

export function fetchATraiter() {
  return api.get<{
    examensAVenir: number;
    bulletinsAPublier: number;
    stagesAValider: number;
  }>("/dashboard/istpm-a-traiter");
}

/* ------------------------------------------------------------------ */
/*  Roles                                                              */
/* ------------------------------------------------------------------ */

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export function fetchRoles() {
  return api.get<RoleRecord[]>("/roles");
}

export function fetchRole(id: string) {
  return api.get<RoleRecord>(`/roles/${id}`);
}

export function createRole(data: { name: string; description?: string; permissions?: string[] }) {
  return api.post<RoleRecord>("/roles", data);
}

export function updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
  return api.put<RoleRecord>(`/roles/${id}`, data);
}

export function deleteRole(id: string) {
  return api.delete<{ ok: boolean }>(`/roles/${id}`);
}

export function fetchPermissionsList() {
  return api.get<string[]>("/roles/permissions/list");
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function fetchUsers() {
  return api.get<UserRecord[]>("/auth/users");
}

export function createUser(data: { email: string; password: string; name: string; role?: string }) {
  return api.post<UserRecord>("/auth/register", data);
}

export function updateUser(id: string, data: { name?: string; password?: string }) {
  return api.put<UserRecord>(`/auth/users/${id}`, data);
}

export function deleteUser(id: string) {
  return api.delete<{ success: boolean }>(`/auth/users/${id}`);
}

export function assignUserRole(id: string, role: string) {
  return api.put<UserRecord>(`/auth/users/${id}/role`, { role });
}

/* ------------------------------------------------------------------ */
/*  AI Agent                                                           */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedAction {
  toolCallId: string;
  actionName: string;
  params: Record<string, unknown>;
  reasoning: string;
}

export interface AnalyzeResult {
  reasoning: string;
  proposedActions: ProposedAction[];
}

export function analyzeIntent(messages: ChatMessage[]) {
  return api.post<AnalyzeResult>("/agent/analyze", { messages });
}

export function confirmAction(actionName: string, params: Record<string, unknown>) {
  return api.post<{ success: boolean; data: unknown; error?: string }>("/agent/confirm", {
    actionName,
    params,
  });
}

export function executeBatchActions(
  actions: { actionName: string; params: Record<string, unknown> }[],
) {
  return api.post<{ results: unknown[]; failedAt: number | null; error?: string }>(
    "/agent/execute-batch",
    { actions },
  );
}

export function fetchAgentActions() {
  return api.get<
    { name: string; description: string; category: string; paramsCount: number }[]
  >("/agent/actions");
}
