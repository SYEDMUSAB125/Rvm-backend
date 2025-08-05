const forge = require('node-forge');

const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAojhh58zzmGjQlEuZwpN+00R98f5TCttxGKrO9kNFR4kZUErjR/weUz814WbErbaRaI6NmDEBSh6TdhudGK/j1SK3R5LQuxFBjTu0wmrVLSgBC8gpy4x7AwbJYpxWnt6jysNyLb2DDbh5knn8/z8oZaMqXmML8FkN8+LvZzAJKAL0pFwYQ+vbaIlmr05CjNHu8P0/I+orDQxg40XkcI4wzTxN2QAiGNLLVjiEQ9ffm/v6Dy+p71YiV/sE8jxuVugcHKW9VaI7KThf5ntSMkSgZv9W1zqOxkVqtexQrAZ9F7GwZpxlMApEw1P3TtCzx0QfajuQ8u/gkwPN0I0h+m86XwIDAQAB
-----END PUBLIC KEY-----`;

function generateVouch365Link(username, phone) {
  try {
    // Step 1: Create JSON payload
    const payload = JSON.stringify({ username, phone });

    // Step 2: Load public key
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

// Step 1: Encrypt using RSA + PKCS1 v1.5 padding
const encrypted = publicKey.encrypt(payload, 'RSAES-PKCS1-V1_5');

// Step 2: First base64 encode (to match forge)
const base64Once = forge.util.encode64(encrypted);

// Step 3: Second base64 encode (like the website does)
const finalOutput = Buffer.from(base64Once).toString('base64');

    // Step 6: Return final URL
    return `https://isp.vouch365.mobi/splash?q=${finalOutput}`;
  } catch (error) {
    console.error('Vouch365 Link Generation Error:', error);
    throw new Error('Failed to generate Vouch365 URL');
  }
}


module.exports = generateVouch365Link;