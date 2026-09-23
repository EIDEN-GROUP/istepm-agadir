import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { flushSync } from "react-dom";
import admissionImg from "@/assets/images/sections/admission-form.jpg";
import { Reveal } from "@/components/reveal";
import { FALLBACK_FILIERES, NIVEAUX, fetchFilieres, matchFiliere, submitInscription } from "@/lib/inscriptions";
import { BtnIc, Icon, cx } from "@/lib/ui";

type Values = {
  prenom: string;
  nom: string;
  tel: string;
  email: string;
  formation: string;
  niveau: string;
  message: string;
  consent: boolean;
};
type Field = keyof Values;

const EMPTY: Values = { prenom: "", nom: "", tel: "", email: "", formation: "", niveau: "", message: "", consent: false };
const MESSAGE_MAX = 2000;

/** Prénom / nom : 1 à 100 caractères, comme côté serveur. */
const nameRule = (value: string, label: string) => {
  const n = value.trim().length;
  return n === 0 ? `Indiquez votre ${label}.` : n <= 100 || "100 caractères maximum.";
};

/** Règles de validation, dans l'ordre des champs : `true` si valide, sinon le message d'erreur. */
const RULES: Record<Field, (v: Values) => true | string> = {
  prenom: ({ prenom }) => nameRule(prenom, "prénom"),
  nom: ({ nom }) => nameRule(nom, "nom"),
  tel: ({ tel }) => {
    const n = tel.replace(/[\s.\-()]/g, "");
    const valid = tel.trim().length <= 30 && (/^(?:(?:\+|00)212|0)[5-7]\d{8}$/.test(n) || /^\+\d{8,15}$/.test(n));
    return valid || "Numéro invalide. Exemple : 06 12 34 56 78.";
  },
  email: ({ email }) =>
    !email.trim() ? "Indiquez votre adresse e-mail." : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) || "Adresse e-mail invalide.",
  formation: ({ formation }) => !!formation || "Choisissez une formation.",
  niveau: ({ niveau }) => !!niveau || "Indiquez votre niveau d’études.",
  message: ({ message }) => message.length <= MESSAGE_MAX || `${MESSAGE_MAX} caractères maximum.`,
  consent: ({ consent }) => consent || "Votre accord est nécessaire pour que l’on puisse vous recontacter.",
};
const FIELDS = Object.keys(RULES) as Field[];

/** Erreur 400 du serveur → champ à surligner, d’après son libellé (sinon, message au-dessus du bouton seulement). */
const SERVER_ERROR_FIELDS: [RegExp, Field][] = [
  [/pr[ée]nom/i, "prenom"],
  [/e-?mail/i, "email"],
  [/t[ée]l[ée]phone/i, "tel"],
  [/fili[èe]re|formation/i, "formation"],
  [/niveau/i, "niveau"],
  [/message/i, "message"],
  [/\bnom\b/i, "nom"],
];

/** Message par champ : absent = pas encore validé, "" = valide, texte = erreur. */
type Errors = Partial<Record<Field, string>>;

export type PreinscriptionHandle = {
  /** Pré-sélectionne une formation (depuis les cartes) puis place le focus sur le prénom. */
  pick: (formation: string) => void;
};

function FieldBox({ name, label, half, error, children }: { name: Field; label?: ReactNode; half?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className={cx("field", half && "field--half", error && "has-error")}>
      {label && <label htmlFor={`f-${name}`}>{label}</label>}
      {children}
      <p className="err" id={`e-${name}`}>
        {error}
      </p>
    </div>
  );
}

// Envoi vers l’API d’inscription (src/lib/inscriptions.ts) : le serveur prévient l’école et assure le suivi.
export function PreinscriptionCard({ ref }: { ref?: Ref<PreinscriptionHandle> }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [filieres, setFilieres] = useState(FALLBACK_FILIERES);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sent, setSent] = useState(false);
  const [success, setSuccess] = useState({ name: "", formation: "la formation choisie" });
  const formRef = useRef<HTMLFormElement>(null);
  const prenomRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  /* Filières officielles, affichées telles quelles (le serveur refuse toute autre valeur) ; sinon, liste de secours. */
  useEffect(() => {
    let alive = true;
    fetchFilieres()
      .then((list) => {
        if (!alive) return;
        setFilieres(list);
        setValues((v) => (v.formation && !list.includes(v.formation) ? { ...v, formation: matchFiliere(v.formation, list) ?? "" } : v));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const validate = (name: Field, v: Values) => {
    const res = RULES[name](v);
    setErrors((e) => ({ ...e, [name]: res === true ? "" : res }));
    return res === true;
  };

  /** Met à jour un champ ; `live` = select/case à cocher, validés à chaque changement. */
  const change = <K extends Field>(name: K, value: Values[K], live = false) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (live || errors[name]) validate(name, next);
  };

  /** Champs texte : validés à la sortie s'ils sont remplis ou déjà en erreur. */
  const blur = (name: "prenom" | "nom" | "tel" | "email") => {
    if (values[name].trim() || errors[name]) validate(name, values);
  };

  const focusField = (name: Field) => (formRef.current?.elements.namedItem(name) as HTMLElement | null)?.focus();

  useImperativeHandle(ref, () => ({
    pick(formation) {
      // Absente de la liste du serveur : on vide le choix plutôt que de garder une formation précédente.
      const match = matchFiliere(formation, filieres);
      change("formation", match ?? "", !!match);
      setTimeout(() => prenomRef.current?.focus({ preventScroll: true }), 700);
    },
  }));

  const invalid = (name: Field) => (errors[name] === undefined ? undefined : !!errors[name]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const results = FIELDS.map((name) => [name, RULES[name](values)] as const);
    setErrors(Object.fromEntries(results.map(([name, res]) => [name, res === true ? "" : res])));
    const firstInvalid = results.find(([, res]) => res !== true);
    if (firstInvalid) {
      focusField(firstInvalid[0]);
      return;
    }

    setSending(true);
    setSubmitError("");
    const message = values.message.trim();
    const res = await submitInscription({
      prenom: values.prenom.trim(),
      nom: values.nom.trim(),
      telephone: values.tel.trim(),
      email: values.email.trim(),
      filiere: values.formation,
      niveau: values.niveau,
      ...(message ? { message } : {}),
    });
    setSending(false);

    if (!res.ok) {
      setSubmitError(res.error);
      const field = res.status === 400 ? SERVER_ERROR_FIELDS.find(([re]) => re.test(res.error))?.[1] : undefined;
      if (field) {
        setErrors((er) => ({ ...er, [field]: res.error }));
        focusField(field);
      }
      return;
    }

    flushSync(() => {
      setSuccess({
        name: ", " + values.prenom.trim(),
        formation: /ne sais pas/i.test(values.formation) ? "la formation qui vous correspond" : values.formation,
      });
      setSent(true);
    });
    successRef.current?.focus();
  };

  const reset = () => {
    flushSync(() => {
      setValues(EMPTY);
      setErrors({});
      setSubmitError("");
      setSent(false);
    });
    prenomRef.current?.focus();
  };

  return (
    <Reveal className={cx("form-card", sent && "is-sent")} id="form-card" delay={1}>
      <div className="form-card__photo">
        <img src={admissionImg} alt="" decoding="async" loading="lazy" />
        <h3>
          Pré-inscription
          <br />
          <em className="accent">en ligne</em>
        </h3>
        <p>Deux minutes, sans engagement.</p>
      </div>
      <div className="form-card__main">
        <div className="form-card__head">
          <b>Vos coordonnées</b>
          <p>Tous les champs sont obligatoires, sauf mention.</p>
        </div>
        <form ref={formRef} className="form-grid" id="preinscription" noValidate onSubmit={onSubmit}>
          <FieldBox name="prenom" label="Prénom" half error={errors.prenom}>
            <input
              ref={prenomRef}
              className="control"
              id="f-prenom"
              name="prenom"
              type="text"
              autoComplete="given-name"
              maxLength={100}
              placeholder="Prénom"
              required
              aria-describedby="e-prenom"
              aria-invalid={invalid("prenom")}
              value={values.prenom}
              onChange={(e) => change("prenom", e.target.value)}
              onBlur={() => blur("prenom")}
            />
          </FieldBox>
          <FieldBox name="nom" label="Nom" half error={errors.nom}>
            <input
              className="control"
              id="f-nom"
              name="nom"
              type="text"
              autoComplete="family-name"
              maxLength={100}
              placeholder="Nom"
              required
              aria-describedby="e-nom"
              aria-invalid={invalid("nom")}
              value={values.nom}
              onChange={(e) => change("nom", e.target.value)}
              onBlur={() => blur("nom")}
            />
          </FieldBox>
          <FieldBox name="tel" label="Téléphone / WhatsApp" error={errors.tel}>
            <input
              className="control"
              id="f-tel"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              placeholder="06 12 34 56 78"
              required
              aria-describedby="e-tel"
              aria-invalid={invalid("tel")}
              value={values.tel}
              onChange={(e) => change("tel", e.target.value)}
              onBlur={() => blur("tel")}
            />
          </FieldBox>
          <FieldBox name="email" label="E-mail" error={errors.email}>
            <input
              className="control"
              id="f-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              required
              aria-describedby="e-email"
              aria-invalid={invalid("email")}
              value={values.email}
              onChange={(e) => change("email", e.target.value)}
              onBlur={() => blur("email")}
            />
          </FieldBox>
          <FieldBox name="formation" label="Formation souhaitée" error={errors.formation}>
            <select
              className="control"
              id="f-formation"
              name="formation"
              required
              aria-describedby="e-formation"
              aria-invalid={invalid("formation")}
              value={values.formation}
              onChange={(e) => change("formation", e.target.value, true)}
            >
              <option value="">Choisir…</option>
              {filieres.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </FieldBox>
          <FieldBox name="niveau" label="Niveau d’études" error={errors.niveau}>
            <select
              className="control"
              id="f-niveau"
              name="niveau"
              required
              aria-describedby="e-niveau"
              aria-invalid={invalid("niveau")}
              value={values.niveau}
              onChange={(e) => change("niveau", e.target.value, true)}
            >
              <option value="">Choisir…</option>
              {NIVEAUX.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </FieldBox>
          <FieldBox
            name="message"
            label={
              <>
                Message <span className="opt">(facultatif)</span>
              </>
            }
            error={errors.message}
          >
            <textarea
              className="control"
              id="f-message"
              name="message"
              rows={3}
              maxLength={MESSAGE_MAX}
              placeholder="Une question, une précision…"
              aria-describedby="e-message"
              aria-invalid={invalid("message")}
              value={values.message}
              onChange={(e) => change("message", e.target.value)}
            />
          </FieldBox>
          <FieldBox name="consent" error={errors.consent}>
            <label className="consent">
              <input
                type="checkbox"
                id="f-consent"
                name="consent"
                required
                aria-describedby="e-consent"
                aria-invalid={invalid("consent")}
                checked={values.consent}
                onChange={(e) => change("consent", e.target.checked, true)}
              />
              <span>
                J’accepte d’être contacté(e) par l’ISTEPM au sujet de ma demande. Mes données servent uniquement au
                traitement de ma pré-inscription <span className="nowrap">(loi 09-08)</span>.
              </span>
            </label>
          </FieldBox>
          {submitError && (
            <p className="form-alert" role="alert">
              {submitError}
            </p>
          )}
          <button className="btn btn--red btn--block" type="submit" disabled={sending} aria-busy={sending || undefined}>
            {sending ? "Envoi en cours…" : "Envoyer ma pré-inscription"}
            <BtnIc />
          </button>
          <p className="form-note" data-validate="Mention CNDP (n° de déclaration) à ajouter">
            <Icon name="lock" />
            Vos informations restent confidentielles.
          </p>
        </form>
        <div className="form-success" id="form-success" ref={successRef} tabIndex={-1} role="status" aria-live="polite">
          <span className="success-ic">
            <Icon name="check" />
          </span>
          <h3>
            Merci<span id="success-name">{success.name}</span>&#8239;!
          </h3>
          <p>
            Votre demande de pré-inscription pour <b id="success-formation">{success.formation}</b> est bien enregistrée.
            L’équipe d’admission vous contactera très prochainement.
          </p>
          <button className="link-arrow" type="button" id="form-reset" onClick={reset}>
            Faire une nouvelle demande
            <Icon name="arrow-up-right" />
          </button>
        </div>
      </div>
    </Reveal>
  );
}
