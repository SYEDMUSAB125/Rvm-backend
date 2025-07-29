const forge = require('node-forge');

const publicKeyPem = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAojhh58zzmGjQlEuZwpN+00R98f5TCttxGKrO9kNFR4kZUErjR/weUz814WbErbaRaI6NmDEBSh6TdhudGK/j1SK3R5LQuxFBjTu0wmrVLSgBC8gpy4x7AwbJYpxWnt6jysNyLb2DDbh5knn8/z8oZaMqXmML8FkN8+LvZzAJKAL0pFwYQ+vbaIlmr05CjNHu8P0/I+orDQxg40XkcI4wzTxN2QAiGNLLVjiEQ9ffm/v6Dy+p71YiV/sE8jxuVugcHKW9VaI7KThf5ntSMkSgZv9W1zqOxkVqtexQrAZ9F7GwZpxlMApEw1P3TtCzx0QfajuQ8u/gkwPN0I0h+m86XwIDAQAB
-----END PUBLIC KEY-----
`;

function generateVouch365Link(username, phone) {
  try {
    // Step 1: Create JSON payload
    const payload = JSON.stringify({ username, phone });

    // Step 2: Load public key
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    // Step 3: Encrypt using RSA/ECB/PKCS1Padding (PKCS#1 v1.5)
    const encrypted = publicKey.encrypt(payload); // default is PKCS#1 v1.5

    // Step 4: Base64 encode
    const base64Encoded = forge.util.encode64(encrypted);

    // Step 5: URL encode
    const urlEncoded = encodeURIComponent(base64Encoded);

    // Step 6: Return final URL
    return `https://isp.vouch365.mobi/splash?q=${urlEncoded}`;
  } catch (error) {
    console.error('Vouch365 Link Generation Error:', error);
    throw new Error('Failed to generate Vouch365 URL');
  }
}


module.exports = generateVouch365Link;
