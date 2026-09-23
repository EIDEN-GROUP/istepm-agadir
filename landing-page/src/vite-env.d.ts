/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origine de l’API d’inscription (défaut : production). Ex. : https://staging.exemple.com */
  readonly VITE_INSCRIPTIONS_API?: string;
}
