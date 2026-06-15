import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { DealIntake } from './types'

const ALGORITHM = 'aes-256-gcm'

// Fields in DealIntake that contain personally identifiable information (PII)
const SENSITIVE_FIELDS: (keyof DealIntake)[] = [
  'nomeProprietario',
  'cpfCnpjProprietario',
  'telefoneProprietario',
  'emailProprietario',
  'obsProprietario',
  'assessorNome',
  'assessorTelefone',
  'assessorEmail',
  'parceiroNome',
  'parceiroTelefone',
  'parceiroEmail',
]

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY environment variable is not set')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)')
  return buf
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key       = getKey()
  const iv        = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher    = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag   = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Decrypts a string produced by `encrypt`.
 * Throws if the ciphertext has been tampered with (authTag mismatch).
 */
export function decrypt(ciphertext: string): string {
  const key     = getKey()
  const parts   = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivB64, authTagB64, dataB64] = parts
  const iv       = Buffer.from(ivB64,      'base64')
  const authTag  = Buffer.from(authTagB64, 'base64')
  const data     = Buffer.from(dataB64,    'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

// Detects whether a value is already in the encrypted format (iv:authTag:cipher).
// Validates the exact byte lengths of the IV (12) and authTag (16) so that legacy
// plaintext that happens to contain colons is not mistaken for ciphertext.
function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 3) return false
  const [ivB64, authTagB64] = parts
  try {
    return Buffer.from(ivB64, 'base64').length === 12 && Buffer.from(authTagB64, 'base64').length === 16
  } catch {
    return false
  }
}

/**
 * Encrypts all PII fields in a DealIntake before storing to the database.
 * Non-empty string values in SENSITIVE_FIELDS are encrypted in place.
 */
export function encryptSensitiveFields(intake: DealIntake): DealIntake {
  const result = { ...intake }
  for (const field of SENSITIVE_FIELDS) {
    const value = result[field]
    if (value && typeof value === 'string' && value.trim() && !isEncrypted(value)) {
      ;(result as Record<string, unknown>)[field] = encrypt(value)
    }
  }
  return result
}

/**
 * Decrypts PII fields after reading from the database.
 * Fields that are not in encrypted format (e.g. legacy plaintext data) are left unchanged.
 */
export function decryptSensitiveFields(intake: DealIntake): DealIntake {
  const result = { ...intake }
  for (const field of SENSITIVE_FIELDS) {
    const value = result[field]
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        ;(result as Record<string, unknown>)[field] = decrypt(value)
      } catch {
        // Tampered or corrupted — return redacted value to avoid exposing garbled data
        ;(result as Record<string, unknown>)[field] = '[dado inválido]'
      }
    }
  }
  return result
}
