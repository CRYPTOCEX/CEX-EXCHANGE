import crypto from 'crypto'
import fs from 'fs'
import readline from 'readline'
import dotenv from 'dotenv'

dotenv.config()

function readPassphrase(rl) {
  return new Promise((resolve) => {
    rl.question('Enter the passphrase: ', (passphrase) => {
      resolve(passphrase)
    })
  })
}

async function encryptKey(encryptionKey, rl) {
  while (true) {
    try {
      const passphrase = await readPassphrase(rl)
      if (!passphrase || passphrase.length < 12) {
        console.log('The passphrase must be at least 12 characters long.')
        continue
      }

      const iv = crypto.randomBytes(12)
      const salt = crypto.randomBytes(16)
      const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512')
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      let encrypted = cipher.update(encryptionKey, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const authTag = cipher.getAuthTag().toString('hex')
      return `${iv.toString('hex')}:${authTag}:${encrypted}:${salt.toString(
        'hex',
      )}`
    } catch (error) {
      console.log(`Encryption failed: ${error.message}`)
    }
  }
}

;(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let envFile = fs.readFileSync('.env', 'utf8')

  const envVars = dotenv.parse(envFile)
  const encryptedEncryptionKey = envVars.ENCRYPTED_ENCRYPTION_KEY

  if (!encryptedEncryptionKey || encryptedEncryptionKey === '') {
    const encryptionKey = crypto.randomBytes(32).toString('hex')

    console.log(`Raw encryption key: ${encryptionKey}`)

    const encryptedEncryptionKey = await encryptKey(encryptionKey, rl)

    console.log(`Encrypted encryption key: ${encryptedEncryptionKey}`)

    // Update .env file
    envFile = envFile.replace(
      /^ENCRYPTED_ENCRYPTION_KEY=.*/m,
      `ENCRYPTED_ENCRYPTION_KEY=${encryptedEncryptionKey}`,
    )

    if (!envFile.includes('ENCRYPTED_ENCRYPTION_KEY')) {
      envFile += `\nENCRYPTED_ENCRYPTION_KEY=${encryptedEncryptionKey}\n`
    }

    fs.writeFileSync('.env', envFile)

    console.log(
      'IMPORTANT: Encryption key has been set and encrypted in .env file.',
    )
    console.log(
      'Make sure to securely store the passphrase and encryption keys.',
    )
    console.log(
      "If you lose this passphrase, you'll lose access to all encrypted data.",
    )
  } else {
    console.log('Encryption key is already set in .env file.')
  }

  rl.close()
})()
