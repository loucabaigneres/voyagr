/**
 * Génère le client secret JWT requis par Apple Sign In (valable 6 mois max).
 *
 * Utilisation :
 *   node scripts/generate-apple-secret.mjs
 *
 * Puis copie la valeur imprimée dans APPLE_CLIENT_SECRET dans .env.local
 */

import { SignJWT, importPKCS8 } from 'jose'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── À remplir ────────────────────────────────────────────────────────────────

const TEAM_ID = ''        // Ex: "AB12CD34EF"  (affiché en haut à droite sur developer.apple.com)
const KEY_ID = ''         // Ex: "ABCD1234EF"  (affiché dans Keys après création)
const CLIENT_ID = ''      // Ex: "com.tonapp.auth"  (ton Services ID)

// Chemin vers le fichier .p8 téléchargé depuis Apple Developer
const PRIVATE_KEY_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../AuthKey.p8')

// ─── Génération ───────────────────────────────────────────────────────────────

if (!TEAM_ID || !KEY_ID || !CLIENT_ID) {
  console.error('❌  Remplis TEAM_ID, KEY_ID et CLIENT_ID dans le script avant de le lancer.')
  process.exit(1)
}

let privateKeyPem
try {
  privateKeyPem = readFileSync(PRIVATE_KEY_PATH, 'utf-8')
} catch {
  console.error(`❌  Fichier .p8 introuvable : ${PRIVATE_KEY_PATH}`)
  console.error('    Place ton fichier AuthKey_XXXXXX.p8 à la racine du projet et renomme-le AuthKey.p8')
  process.exit(1)
}

const privateKey = await importPKCS8(privateKeyPem, 'ES256')

const now = Math.floor(Date.now() / 1000)
const SIX_MONTHS = 60 * 60 * 24 * 180

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
  .setIssuer(TEAM_ID)
  .setAudience('https://appleid.apple.com')
  .setSubject(CLIENT_ID)
  .setIssuedAt(now)
  .setExpirationTime(now + SIX_MONTHS)
  .sign(privateKey)

console.log('\n✅  Client secret Apple généré (valable 6 mois) :\n')
console.log(jwt)
console.log('\n→  Copie cette valeur dans APPLE_CLIENT_SECRET dans apps/website/.env.local\n')
console.log(`⚠️  Ce secret expire le : ${new Date((now + SIX_MONTHS) * 1000).toLocaleDateString('fr-FR')}`)
console.log('    Relance ce script avant cette date pour en générer un nouveau.\n')
