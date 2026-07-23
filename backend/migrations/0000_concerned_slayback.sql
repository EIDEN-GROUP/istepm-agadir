CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'contact' NOT NULL,
	"status" text DEFAULT 'nouveau' NOT NULL,
	"age" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"date_table" text DEFAULT '' NOT NULL,
	"date_detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulletins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etudiant_id" uuid NOT NULL,
	"cne" text DEFAULT '' NOT NULL,
	"prenom" text DEFAULT '' NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"filiere" text DEFAULT '' NOT NULL,
	"niveau" text DEFAULT '' NOT NULL,
	"session" text DEFAULT 'normale' NOT NULL,
	"moyenne" numeric DEFAULT '0' NOT NULL,
	"mention" text DEFAULT 'Passable' NOT NULL,
	"decision" text DEFAULT 'Admis' NOT NULL,
	"statut" text DEFAULT 'genere' NOT NULL,
	"evaluation_clinique" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "center_admins" (
	"center_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"plan" text DEFAULT 'essai' NOT NULL,
	"status" text DEFAULT 'actif' NOT NULL,
	"monthly_price" numeric DEFAULT '0' NOT NULL,
	"students_count" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_name" text NOT NULL,
	"child_name" text DEFAULT '' NOT NULL,
	"child_age" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"email2" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"phone2" text DEFAULT '' NOT NULL,
	"cin" text DEFAULT '' NOT NULL,
	"cin_mother" text DEFAULT '' NOT NULL,
	"father_name" text DEFAULT '' NOT NULL,
	"mother_name" text DEFAULT '' NOT NULL,
	"profession_father" text DEFAULT '' NOT NULL,
	"profession_mother" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"child_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subscribed_frais" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dob" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"crm_stage" text DEFAULT 'nouveau' NOT NULL,
	"payment_status" text DEFAULT 'impaye' NOT NULL,
	"monthly_fee" numeric DEFAULT '0' NOT NULL,
	"debt" numeric DEFAULT '0' NOT NULL,
	"overdue" boolean DEFAULT false NOT NULL,
	"payment_day" integer DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"whatsapp_optin" boolean DEFAULT true NOT NULL,
	"transport" boolean DEFAULT false NOT NULL,
	"cantine" boolean DEFAULT false NOT NULL,
	"garderie" boolean DEFAULT false NOT NULL,
	"activites" boolean DEFAULT false NOT NULL,
	"fratrie" integer DEFAULT 1 NOT NULL,
	"remise" numeric DEFAULT '0' NOT NULL,
	"subscribed_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"center" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"preferred_date" date NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_msg" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"personal_email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"phone2" text DEFAULT '' NOT NULL,
	"cin" text DEFAULT '' NOT NULL,
	"birth_date" text DEFAULT '' NOT NULL,
	"hire_date" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"contract_type" text DEFAULT '' NOT NULL,
	"salary" numeric DEFAULT '0' NOT NULL,
	"leave_start" date,
	"leave_end" date,
	"status" text DEFAULT 'actif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etudiants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cne" text DEFAULT '' NOT NULL,
	"matricule" text DEFAULT '' NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"filiere" text NOT NULL,
	"niveau" text NOT NULL,
	"annee" text DEFAULT '' NOT NULL,
	"groupe" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'inscrit' NOT NULL,
	"paiement" text DEFAULT 'en_attente' NOT NULL,
	"moyenne" numeric DEFAULT '0' NOT NULL,
	"telephone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"date_naissance" text DEFAULT '' NOT NULL,
	"ville" text DEFAULT '' NOT NULL,
	"frais_annuels" numeric DEFAULT '0' NOT NULL,
	"reste_a_payer" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" text NOT NULL,
	"filiere" text NOT NULL,
	"niveau" text NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"heure" text DEFAULT '' NOT NULL,
	"salle" text DEFAULT '' NOT NULL,
	"surveillants" text[] DEFAULT '{}' NOT NULL,
	"statut" text DEFAULT 'planifie' NOT NULL,
	"etudiants_convoques" integer DEFAULT 0 NOT NULL,
	"composante" text DEFAULT 'Theorique' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matricule" text DEFAULT '' NOT NULL,
	"cin" text DEFAULT '' NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"grade" text DEFAULT 'vacataire' NOT NULL,
	"departement" text DEFAULT '' NOT NULL,
	"modules" text[] DEFAULT '{}' NOT NULL,
	"groupes" text[] DEFAULT '{}' NOT NULL,
	"statut" text DEFAULT 'permanent' NOT NULL,
	"telephone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"notes_saisies" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historique_paiements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etudiant_id" uuid NOT NULL,
	"date" text NOT NULL,
	"montant" numeric NOT NULL,
	"mode" text DEFAULT 'Especes' NOT NULL,
	"periode" text DEFAULT '' NOT NULL,
	"recu" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'paye' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"period" text NOT NULL,
	"amount_due" numeric DEFAULT '0' NOT NULL,
	"amount_paid" numeric DEFAULT '0' NOT NULL,
	"due_date" date,
	"status" text DEFAULT 'en_attente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cycle" text DEFAULT '' NOT NULL,
	"monthly_fee" numeric DEFAULT '0' NOT NULL,
	"max_students" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notes_etudiant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etudiant_id" uuid NOT NULL,
	"module" text NOT NULL,
	"note" numeric DEFAULT '0' NOT NULL,
	"coef" numeric DEFAULT '1' NOT NULL,
	"credits" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_examen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"examen_id" uuid NOT NULL,
	"etudiant_id" uuid NOT NULL,
	"theorique" numeric,
	"pratique" numeric,
	CONSTRAINT "notes_examen_examen_id_etudiant_id_unique" UNIQUE("examen_id","etudiant_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"mode" text DEFAULT 'especes' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"receipt" text DEFAULT '' NOT NULL,
	"invoice_sent" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT 'zinc' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_vacations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etudiant_id" uuid NOT NULL,
	"cne" text DEFAULT '' NOT NULL,
	"prenom" text DEFAULT '' NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"filiere" text DEFAULT '' NOT NULL,
	"niveau" text DEFAULT '' NOT NULL,
	"structure" text DEFAULT '' NOT NULL,
	"service" text DEFAULT '' NOT NULL,
	"encadrant_clinique" text DEFAULT '' NOT NULL,
	"tuteur_academique" text DEFAULT '' NOT NULL,
	"debut" text DEFAULT '' NOT NULL,
	"fin" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'recherche' NOT NULL,
	"convention_signee" boolean DEFAULT false NOT NULL,
	"note_soutenance" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid,
	"admin_id" uuid,
	"admin_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"phone" text NOT NULL,
	"direction" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"wa_message_id" text DEFAULT '' NOT NULL,
	"broadcast_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_etudiant_id_etudiants_id_fk" FOREIGN KEY ("etudiant_id") REFERENCES "public"."etudiants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_admins" ADD CONSTRAINT "center_admins_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_admins" ADD CONSTRAINT "center_admins_profile_id_users_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_paiements" ADD CONSTRAINT "historique_paiements_etudiant_id_etudiants_id_fk" FOREIGN KEY ("etudiant_id") REFERENCES "public"."etudiants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_etudiant" ADD CONSTRAINT "notes_etudiant_etudiant_id_etudiants_id_fk" FOREIGN KEY ("etudiant_id") REFERENCES "public"."etudiants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_examen" ADD CONSTRAINT "notes_examen_examen_id_examens_id_fk" FOREIGN KEY ("examen_id") REFERENCES "public"."examens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_examen" ADD CONSTRAINT "notes_examen_etudiant_id_etudiants_id_fk" FOREIGN KEY ("etudiant_id") REFERENCES "public"."etudiants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_etudiant_id_etudiants_id_fk" FOREIGN KEY ("etudiant_id") REFERENCES "public"."etudiants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_session_id_support_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."support_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;