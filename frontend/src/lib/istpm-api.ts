import { api, getApiBaseUrl } from "@/lib/api";
import { sanitizeFilename } from "@/lib/filename";
import { getStoredToken } from "@/lib/auth";
import type {
  Etudiant,
  Formateur,
  GroupConfig,
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

export function restoreEtudiant(id: string) {
  return api.post<{ ok: boolean }>(`/etudiants/${id}/restore`);
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

export function archiveFormateur(id: string, data: { groupReassignments: Array<{ groupName: string; targetFormateurId: string }>; filiereReassignment?: { targetFormateurId: string } }) {
  return api.post<Formateur>(`/formateurs/${id}/archive`, data);
}

export function restoreFormateur(id: string) {
  return api.post<Formateur>(`/formateurs/${id}/restore`);
}

/* ------------------------------------------------------------------ */
/*  Group Configs                                                      */
/* ------------------------------------------------------------------ */

export function fetchGroupConfigs() {
  return api.get<GroupConfig[]>("/settings/groups");
}

export function createGroupConfig(data: { name: string; semester: string; studentCount?: number }) {
  return api.post<GroupConfig>("/settings/groups", data);
}

export function updateGroupConfig(id: string, data: { name?: string; semester?: string; studentCount?: number }) {
  return api.put<GroupConfig>(`/settings/groups/${id}`, data);
}

export function deleteGroupConfig(id: string) {
  return api.delete<{ ok: boolean }>(`/settings/groups/${id}`);
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
  return api.post<{ ok: boolean; examen?: Examen }>(`/examens/${examenId}/notes`, { saisies });
}

/* -------- Documents d'examen (upload via base64 JSON) -------- */

/** Upload a document for an examen. Reads the File, converts to base64, sends to API. */
export async function uploadExamenDocumentApi(
  examenId: string,
  file: File,
): Promise<Examen> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const content = btoa(binary);
  return api.post<Examen>(`/examens/${examenId}/document`, {
    nom: file.name,
    mime: file.type,
    content,
  });
}

/** Download an examen document (blob from API). */
export async function downloadExamenDocumentApi(
  examenId: string,
  filename: string,
): Promise<void> {
  const token = getStoredToken();
  const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const res = await fetch(`${API_BASE}/examens/${examenId}/document`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Impossible de télécharger le document");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Extension d'origine conservée si autorisée, nom assaini dans tous les cas.
  const extMatch = filename.match(/\.(pdf|docx?)$/i);
  const ext = (extMatch?.[1].toLowerCase() === "doc" ? ".doc" : extMatch?.[1].toLowerCase() === "docx" ? ".docx" : ".pdf") as
    | ".pdf"
    | ".doc"
    | ".docx";
  a.download = sanitizeFilename(filename.replace(/\.[^.]+$/, ""), ext);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Get a preview URL for an examen document. */
export async function previewExamenDocumentApi(
  examenId: string,
): Promise<string | null> {
  const token = getStoredToken();
  const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const res = await fetch(`${API_BASE}/examens/${examenId}/document`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Delete the document for an examen. */
export function deleteExamenDocumentApi(examenId: string) {
  return api.delete<{ ok: boolean }>(`/examens/${examenId}/document`);
}

/* ------------------------------------------------------------------ */
/*  Notes (grades)                                                      */


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
/*  Paiements mensuels                                                 */
/* ------------------------------------------------------------------ */

export type PaiementMensuelApi = {
  id: string;
  etudiantId: string;
  mois: string;
  montantDu: string;
  montantPaye: string;
  datePaiement: string | null;
  mode: string;
  recu: string;
  statut: string;
  notes: string;
  etudiantPrenom: string;
  etudiantNom: string;
  etudiantCne: string;
  etudiantFiliere: string;
  etudiantNiveau: string;
  etudiantFraisAnnuels: string;
};

export function fetchPaiementsMensuels(params?: { etudiantId?: string }) {
  return api.get<PaiementMensuelApi[]>("/paiements-istpm", params);
}

export function createPaiementsMensuels(data: {
  etudiantId: string;
  mois: string[];
  montant: number;
  mode: string;
  date?: string;
  recu?: string;
  notes?: string;
}) {
  return api.post<{ ok: boolean; recu: string; result: Array<{ mois: string; statut: string }>; reste: number }>(
    "/paiements-istpm",
    data,
  );
}

export function updatePaiementMensuel(id: string, data: {
  montantPaye?: number;
  datePaiement?: string;
  mode?: string;
  recu?: string;
  statut?: string;
  notes?: string;
}) {
  return api.put<{ ok: boolean }>(`/paiements-istpm/${id}`, data);
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
/*  Import / Export Étudiants                                          */
/* ------------------------------------------------------------------ */

export type ImportPreviewRow = {
  index: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  valid: boolean;
};

export type ImportPreviewResponse = {
  columns: string[];
  columnMapping: Record<string, string>;
  missingColumns: string[];
  unknownColumns: string[];
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
};

export function previewImportEtudiants(csvText: string) {
  return api.post<ImportPreviewResponse>("/etudiants/import/preview", { csvText });
}

export function executeImportEtudiants(rows: Record<string, string>[]) {
  return api.post<{
    imported: number;
    failed: number;
    skipped: number;
    processingTimeMs: number;
    errors: Array<{ index: number; message: string }>;
  }>("/etudiants/import/execute", { rows });
}

export async function exportEtudiantsCsv(params?: {
  ids?: string;
  filiere?: string;
  niveau?: string;
  statut?: string;
  search?: string;
}) {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const query = new URLSearchParams();
  if (params?.ids) query.set("ids", params.ids);
  if (params?.filiere) query.set("filiere", params.filiere);
  if (params?.niveau) query.set("niveau", params.niveau);
  if (params?.statut) query.set("statut", params.statut);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  const token = getStoredToken();
  const res = await fetch(`${base}/etudiants/export/csv${qs ? "?" + qs : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur d'exportation" }));
    throw new Error(err.error || "Erreur d'exportation");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etudiants-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

import type { StructureAccueil } from "@/lib/istpm-data";

export function fetchStructuresApi() {
  return api.get<StructureAccueil[]>("/settings/structures");
}

export function createStructureApi(nom: string, capacite = 5) {
  return api.post<{ structures: StructureAccueil[] }>("/settings/structures", { nom, capacite });
}

export function updateStructureApi(nom: string, body: { nouveauNom?: string; capacite?: number }) {
  return api.put<{ structures: StructureAccueil[] }>(`/settings/structures/${encodeURIComponent(nom)}`, body);
}

export function deleteStructureApi(nom: string) {
  return api.delete<{ structures: StructureAccueil[] }>(`/settings/structures/${encodeURIComponent(nom)}`);
}

export function fetchStageServicesApi() {
  return api.get<string[]>("/settings/stage-services");
}

export function createStageServiceApi(nom: string) {
  return api.post<{ services: string[] }>("/settings/stage-services", { nom });
}

export function updateStageServiceApi(nom: string, body: { nouveauNom?: string }) {
  return api.put<{ services: string[] }>(`/settings/stage-services/${encodeURIComponent(nom)}`, body);
}

export function deleteStageServiceApi(nom: string) {
  return api.delete<{ services: string[] }>(`/settings/stage-services/${encodeURIComponent(nom)}`);
}

/* ------------------------------------------------------------------ */
/*  Jours chômés (fériés, vacances, exceptions)                        */
/* ------------------------------------------------------------------ */

export interface HolidayRow {
  id: string;
  date: string;
  label: string;
}

export function fetchHolidays() {
  return api.get<HolidayRow[]>("/holidays");
}

export interface VacationRow {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

export function fetchVacations() {
  return api.get<VacationRow[]>("/holidays/vacations");
}

export interface CalendarExceptionRow {
  id: string;
  date: string;
  label: string;
}

export function fetchExceptions() {
  return api.get<CalendarExceptionRow[]>("/holidays/exceptions");
}

/* ------------------------------------------------------------------ */
/*  Présences (appel en séance)                                        */
/* ------------------------------------------------------------------ */

export interface AttendanceEntry {
  etudiantId: string;
  present: boolean;
  justifie?: boolean;
  note?: string;
}

export function openAttendanceSession(seanceId: string) {
  return api.post<{ id: string; seanceId: string; statut: string }>(`/attendance/session/open`, {
    seanceId,
  });
}

export function fetchAttendanceSession(seanceId: string) {
  return api.get<{ id: string; seanceId: string; statut: string }>(
    `/attendance/session/${seanceId}`,
  );
}

export function closeAttendanceSession(sessionId: string) {
  return api.post<Record<string, unknown>>(`/attendance/session/${sessionId}/close`);
}

export function fetchSeanceAttendance(seanceId: string) {
  return api.get<AttendanceEntry[]>(`/attendance/seance/${seanceId}`);
}

export function saveAttendanceBulk(seanceId: string, entries: AttendanceEntry[]) {
  return api.post<unknown>(`/attendance/bulk`, { seanceId, entries });
}

/* ------------------------------------------------------------------ */
/*  Modules                                                           */
/* ------------------------------------------------------------------ */

export interface ModuleItem {
  id: string;
  nom: string;
  filiere: string;
  code?: string | null;
  description?: string | null;
  volumeHoraire?: number | null;
  coefficient?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
}

export function fetchModulesApi(filiere?: string) {
  const query = filiere ? `?filiere=${encodeURIComponent(filiere)}` : "";
  return api.get<ModuleItem[]>(`/settings/modules${query}`);
}

export interface ModuleInput {
  nom: string;
  filiere: string;
  code?: string | null;
  description?: string | null;
  volumeHoraire?: number | null;
  coefficient?: number | string | null;
}

export function createModuleApi(data: ModuleInput) {
  return api.post<ModuleItem>("/settings/modules", data);
}

export function updateModuleApi(id: string, data: ModuleInput) {
  return api.put<ModuleItem>(`/settings/modules/${id}`, data);
}

export function deleteModuleApi(id: string) {
  return api.delete<{ ok: boolean }>(`/settings/modules/${id}`);
}

/* ------------------------------------------------------------------ */
/*  Seances                                                            */
/* ------------------------------------------------------------------ */

export function fetchSeances(params?: { start?: string; end?: string; professeurId?: string; date?: string }) {
  return api.get<Record<string, unknown>[]>("/seances", params);
}

export function createSeance(data: Record<string, unknown>, force = false) {
  return api.post<Record<string, unknown>>(
    "/seances",
    data,
    force ? { force: "1" } : undefined,
  );
}

export function updateSeance(id: string, data: Record<string, unknown>, force = false) {
  return api.put<Record<string, unknown>>(
    `/seances/${id}`,
    data,
    force ? { force: "1" } : undefined,
  );
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

export function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  cne?: string;
  etudiantId?: string;
}) {
  return api.post<UserRecord>("/auth/register", data);
}

/* ------------------------------------------------------------------ */
/*  Invitations (lien 30 min, usage unique)                            */
/* ------------------------------------------------------------------ */

export interface InviteResult {
  user: UserRecord;
  emailSent: boolean;
  emailError: string | null;
  inviteUrl: string;
}

export function createInvitation(data: {
  email: string;
  name: string;
  role?: string;
  cne?: string;
  etudiantId?: string;
  filiere?: string;
  groupe?: string;
}) {
  return api.post<InviteResult>("/auth/invitations", data);
}

export function verifyInvitation(token: string) {
  return api.post<{ valid: boolean; email?: string; name?: string; role?: string }>(
    "/auth/invitations/verify",
    { token },
  );
}

export function acceptInvitation(token: string, password: string) {
  return api.post<{ token: string; user: UserRecord }>("/auth/invitations/accept", {
    token,
    password,
  });
}

export interface PendingInvite {
  id: string;
  email: string;
  name: string;
  role: string;
  expiresAt: string | null;
}

export function fetchPendingInvites() {
  return api.get<PendingInvite[]>("/auth/invitations");
}

export function resendInvitation(userId: string) {
  return api.post<{ emailSent: boolean; emailError: string | null; inviteUrl: string }>(
    `/auth/invitations/${userId}/resend`,
  );
}

export function revokeInvitation(userId: string) {
  return api.delete<{ ok: boolean }>(`/auth/invitations/${userId}`);
}

/* ------------------------------------------------------------------ */
/*  Tickets de fonctionnalité — notifications du demandeur             */
/* ------------------------------------------------------------------ */

export interface TicketNotification {
  id: string;
  titre: string;
  statut: string;
  reponse: string;
  luParDemandeur: boolean;
  updatedAt: string;
}

export function fetchFeatureTicketNotifications() {
  return api.get<{ unread: number; items: TicketNotification[] }>(
    "/feature-tickets/notifications",
  );
}

export function markFeatureTicketNotificationsRead() {
  return api.post<{ ok: boolean; lues: number }>("/feature-tickets/notifications/lu");
}

export function markFeatureTicketNotificationRead(id: string) {
  return api.post<{ ok: boolean }>(`/feature-tickets/notifications/${id}/lu`);
}

/** L'envoi d'e-mails est-il configuré côté backend ? */
export function fetchSmtpStatus() {
  return api.get<{ configured: boolean }>("/auth/invitations/smtp");
}

/** Auto-renvoi public : nouveau lien si une invitation attend cet e-mail. */
export function requestInviteResend(email: string) {
  return api.post<{ ok: boolean }>("/auth/invitations/renvoyer", { email });
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

const STREAM_OVERALL_TIMEOUT = 300000; // 5 min hard cap per stream
const STREAM_IDLE_TIMEOUT = 60000; // abort only if no chunk arrives for 60s

/**
 * SSE variant of analyzeIntent: renders tokens progressively via onToken
 * and resolves with the full AnalyzeResult on the `done` event. Uses a
 * sliding idle timeout (not a fixed one) so slow LLM backends can't trip
 * the regular 30s fetch cutoff as long as tokens keep flowing.
 */
export async function analyzeIntentStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
): Promise<AnalyzeResult> {
  const token = getStoredToken();
  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const overallTimer = setTimeout(() => controller.abort(), STREAM_OVERALL_TIMEOUT);
  const clearTimers = () => {
    clearTimeout(overallTimer);
    if (idleTimer) clearTimeout(idleTimer);
  };
  const poke = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT);
  };
  const abortErr = () =>
    new Error("La requête a pris trop de temps. Vérifiez que le serveur est accessible.");

  let res: Response;
  try {
    poke();
    res = await fetch(`${getApiBaseUrl()}/agent/analyze/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimers();
    if (err instanceof Error && err.name === "AbortError") throw abortErr();
    throw new Error("Impossible de contacter le serveur. Vérifiez votre connexion.");
  }

  if (res.status === 401) {
    clearTimers();
    throw new Error("Non authentifié");
  }
  if (!res.ok || !res.body) {
    clearTimers();
    let msg = `Erreur ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      msg = data.error ?? msg;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reasoning = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      poke(); // a chunk arrived → the stream is alive, reset idle timer
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        let event = "message";
        const dataLines: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
          // ": ..." heartbeat comments are ignored
        }
        if (dataLines.length === 0) continue;
        const raw = dataLines.join("\n");
        if (event === "token") {
          const t = (JSON.parse(raw) as { t: string }).t;
          reasoning += t;
          onToken(t);
        } else if (event === "done") {
          const result = JSON.parse(raw) as AnalyzeResult;
          clearTimers();
          return {
            reasoning: result.reasoning || reasoning,
            proposedActions: result.proposedActions ?? [],
          };
        } else if (event === "error") {
          throw new Error((JSON.parse(raw) as { error?: string }).error ?? "Erreur IA");
        }
      }
    }
  } catch (err) {
    clearTimers();
    if (err instanceof Error && err.name === "AbortError") throw abortErr();
    throw err;
  } finally {
    clearTimers();
    reader.releaseLock();
  }
  throw new Error("Le flux IA s'est interrompu avant la fin. Veuillez réessayer.");
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

/* ------------------------------------------------------------------ */
/*  Conversations IA (persistées en base)                              */
/* ------------------------------------------------------------------ */

export interface AiConvoListItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface AiConvoFull {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export function fetchAiConvos() {
  return api.get<{ convos: AiConvoListItem[]; activeId: string | null }>("/ai/convos");
}

export function fetchAiConvo(id: string) {
  return api.get<{ convo: AiConvoFull }>(`/ai/convos/${id}`);
}

export function createAiConvo(data: { title?: string; messages?: ChatMessage[] }) {
  return api.post<{ convo: AiConvoFull }>("/ai/convos", data);
}

export function saveAiConvo(id: string, data: { title?: string; messages?: ChatMessage[] }) {
  return api.put<{ convo: AiConvoFull }>(`/ai/convos/${id}`, data);
}

export function deleteAiConvo(id: string) {
  return api.delete<{ ok: boolean; activeId?: string | null }>(`/ai/convos/${id}`);
}

export function setActiveAiConvo(id: string) {
  return api.post<{ ok: boolean; activeId: string }>("/ai/convos/active", { id });
}

export function importAiConvos(convos: { title?: string; messages: ChatMessage[] }[]) {
  return api.post<{ ok: boolean; activeId: string | null; count: number }>("/ai/convos/import", {
    convos,
  });
}

export function fetchAgentActions() {
  return api.get<
    { name: string; description: string; category: string; paramsCount: number }[]
  >("/agent/actions");
}

/* ------------------------------------------------------------------ */
/*  Espace étudiant (self-service)                                     */
/* ------------------------------------------------------------------ */

export interface StudentMe {
  etudiant: Record<string, unknown> & {
    id: string;
    prenom: string;
    nom: string;
    cne: string;
    filiere: string;
    niveau: string;
    groupe: string;
    photoUrl?: string;
    photo_url?: string;
  };
  enseignants: Record<string, unknown>[];
  stageEnCours: Record<string, unknown> | null;
  stages: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  bulletins: Record<string, unknown>[];
  paiements: Record<string, unknown>[];
  presence: { total: number; presents: number; taux: number };
}

export interface StudentCalendar {
  seances: Record<string, unknown>[];
  examens: Record<string, unknown>[];
  holidays: Record<string, unknown>[];
  vacations: Record<string, unknown>[];
  exceptions: Record<string, unknown>[];
}

export interface StudentRequest {
  id: string;
  etudiantId: string;
  type: "libre" | "predefini";
  titre: string;
  description: string;
  statut: "en_attente" | "en_cours" | "traite" | "rejete";
  reponse: string;
  createdAt: string;
  updatedAt: string;
  /** Renseignés uniquement par la file staff (`/student/requests/all`). */
  etudiantPrenom?: string | null;
  etudiantNom?: string | null;
  etudiantCne?: string | null;
  etudiantPhotoUrl?: string | null;
  etudiantFiliere?: string | null;
}

export function fetchStudentMe(etudiantId?: string) {
  return api.get<StudentMe>("/student/me", etudiantId ? { etudiantId } : undefined);
}

export interface AuthMe {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
}

/** Compte courant, tel que renvoyé par le serveur (source de vérité). */
export function fetchAuthMe() {
  return api.get<AuthMe>("/auth/me");
}

export interface UpdateMyProfileInput {
  email?: string;
  /** Requis seulement pour changer l'email ou le mot de passe. */
  currentPassword?: string;
  newPassword?: string;
  /** Photo : data:image/... ou URL http(s) ; "" pour retirer. */
  photoUrl?: string;
}

/** Modification self-service du compte courant (email / mot de passe / photo). */
export function updateMyProfile(input: UpdateMyProfileInput) {
  return api.patch<{
    token: string;
    user: AuthMe;
  }>("/auth/me", input);
}

export function fetchStudentCalendar(params?: { start?: string; end?: string }) {
  return api.get<StudentCalendar>("/student/calendar", params);
}

export function fetchStudentRequests() {
  return api.get<StudentRequest[]>("/student/requests");
}

export function createStudentRequest(data: { type: "libre" | "predefini"; titre: string; description?: string }) {
  return api.post<StudentRequest>("/student/requests", data);
}

export function fetchAllStudentRequests(params?: { statut?: string; search?: string }) {
  return api.get<StudentRequest[]>("/student/requests/all", params);
}

export function updateStudentRequest(id: string, data: { statut: StudentRequest["statut"]; reponse?: string }) {
  return api.patch<StudentRequest>(`/student/requests/${id}`, data);
}

export interface StudentNotification {
  id: string;
  titre: string;
  description: string;
  statut: string;
  reponse: string;
  luParEtudiant: boolean;
  updatedAt: string;
}

/** Cloche étudiant : réponses du staff non encore vues (sondée toutes les 60 s). */
export function fetchStudentNotifications() {
  return api.get<{ unread: number; items: StudentNotification[] }>("/student/notifications");
}

export function markStudentNotificationsRead() {
  return api.post<{ ok: boolean; lues: number }>("/student/notifications/lu");
}

/** Ouvrir = marquer comme lue (reste visible, grisée). */
export function markStudentNotificationRead(id: string) {
  return api.post<{ ok: boolean }>(`/student/notifications/${id}/lu`);
}

/** Bouton X = effacer la notification (cachée, jamais supprimée). */
export function hideStudentNotification(id: string) {
  return api.post<{ ok: boolean }>(`/student/notifications/${id}/masquer`);
}

/** Catalogue officiel des demandes prédéfinies (même liste front + back-office). */
export const CATALOGUE_DEMANDES: { titre: string; description: string }[] = [
  { titre: "Attestation de scolarité", description: "Je souhaite obtenir une attestation de scolarité pour l'année en cours." },
  { titre: "Relevé de notes", description: "Je souhaite obtenir mon relevé de notes du semestre." },
  { titre: "Convention de stage", description: "Je souhaite obtenir / renouveler ma convention de stage." },
  { titre: "Changement de groupe", description: "Je souhaite demander un changement de groupe. Motif : " },
  { titre: "Relevé de paiement / reçu", description: "Je souhaite obtenir un reçu / relevé de mes paiements." },
  { titre: "Lettre de recommandation", description: "Je souhaite obtenir une lettre de recommandation." },
  { titre: "Duplicata carte étudiant", description: "Je souhaite obtenir un duplicata de ma carte d'étudiant (perte / vol)." },
];

export function sendEmailApi(payload: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}) {
  return api.post<{ ok: boolean; error?: string }>("/email/send", payload);
}
