# Sécurité — ISTPM Agadir (school-crm)

Document vivant : chaque mesure listée est **vérifiée** (code + test ou preuve
live). Ne pas y ajouter de mesure non vérifiée.

## Contrôles vérifiés

| Domaine | Implémentation | Preuve |
|---|---|---|
| Auth JWT | `middleware/auth.ts` : `jwtVerify()` + relecture rôle **depuis la BDD** à chaque requête ; `alg:none` → 401 | probe live 401 |
| Secrets prod | `config/env.ts` : refus de boot si `JWT_SECRET` < 32 / `change-me`, `ADMIN_API_KEY` < 16 ; `GRAFANA_PASSWORD` obligatoire (`compose :?…`) | logs `FATAL` observés, boot refusé |
| Brute-force login | `POST /auth/login` : 15/15min + log warn ; global 100/min | code + `tests/security.test.ts` |
| Rate-limit par client | `app.ts` `keyGenerator` sur `X-Real-IP` (écrasé par nginx, non falsifiable) ; jamais `X-Forwarded-For` (concaténé) | test inject 101 req → 429 isolé |
| Mots de passe | bcrypt coût 12, min 8 ; invitations 32 octets, 30 min, usage unique atomique | `services/auth.ts`, `services/invitations.ts` |
| IDOR/BOLA fiches | `lib/scope.ts` (`ownEtudiantId`, `teacherScope`) + 404 génériques | probes `/api/student/*` |
| Notifications | périmètre `scopeCondition` : directeur global, autres = propres + diffusion ; `PUT /:id/read`, `read-all`, compteur scopés ; `limit` bornée 1–100 | `tests/security.test.ts` |
| Documents examens | upload : allowlist PDF/DOC/DOCX + octets magiques + 10 Mo + ownership enseignant ; download : même ownership, `attachment`, MIME vérifié | code + test manuel |
| Recu PDF gabarit | URL confinée au web public (`isPrivateHost` : loopback/privés/métadonnées interdits) | `tests/security.test.ts` (24 cas) |
| SMTP | pas de relais ouvert : `/send*` staff-only, `/send-demo` gabarit fixe + 5/h ; invitations : pas d'énumération (`ok:true` constant) | code |
| Imports CSV | 10 Mo max, 5000 lignes max, garde anti-formules (`lib/csv.ts`), schéma/entêtes validés | code |
| XSS | `markdown-mini` : échappement avant transformation, liens http(s) uniquement ; seul autre `dangerouslySetInnerHTML` = thème statique | code |
| Headers | `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP `default-src 'none'`, HSTS (via nginx TLS) | probes live |
| CORS | origines exactes (`CORS_ORIGIN`), `credentials` sans `*` ; origine hostile = pas d'en-tête | probes live |
| Erreurs | 500 génériques, zod champ+message, pas de stack/SQL/chemins | probes live |
| Uploads avatar | data-URL 512px, plafond 3 Mo aligné backend (`PHOTO_MAX`) | code |
| Infra | UFW : public 22/80/443, 3003/3004 internes ; secrets hors git (`.env.production` ignoré, secret GitHub `ENV_PRODUCTION`) ; backups chiffrés si `BACKUP_ENCRYPTION_KEY`, `chmod 600` | `scripts/harden-firewall.sh`, VPS |
| Erreurs agent IA | messages mappés sans fuite de clé | `tests/security.test.ts` |

## Lancer les tests

```bash
cd backend && npm test   # tests/security.test.ts — 32 tests, sans BDD
```

## Risques résiduels assumés (non corrigés ici)

- **JWT localStorage** : vol de token = session usable jusqu'à expiration (12–24 h).
  Pas de révocation ni d'invalidation au changement de mot de passe. Migration
  cookies HttpOnly + CSRF : chantier architectural, non commencé.
- **PII au repos** : pas de chiffrement applicatif (CIN, téléphones) ; repose sur
  chiffrement disque/sauvegardes. Clés `BACKUP_ENCRYPTION_KEY` à maintenir.
- **DNS rebinding** sur le garde SSRF gabarit (source = réglage staff, risque faible).
- **Monitoring** (Grafana/Prometheus/Loki) : accès à verrouiller côté expositions.
- `PUT /settings/:key` : pas d'allowlist de clés (staff-only, format validé).
- Support `sessions/open` : N+1 négligeable (4 sessions), non corrigé.
