import crypto from 'crypto';

export class AesHelper {
  static decryptAES(inputHex, key, iv) {
    try {
      // Ensure input is properly formatted hex string
      inputHex = inputHex.trim();
      if (inputHex.length % 2 !== 0) {
        throw new Error('Hex string must have an even length');
      }

      // Convert hex string to bytes
      const encryptedBytes = Buffer.from(inputHex, 'hex');
      
      // Create key and IV specs
      const keyBytes = Buffer.from(key, 'utf8');
      const ivBytes = Buffer.from(iv, 'utf8');

      // Create decipher with PKCS5Padding (PKCS7 in Node.js)
      const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        keyBytes,
        ivBytes
      );
      decipher.setAutoPadding(true);

      // Decrypt
      let decrypted = decipher.update(encryptedBytes);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Convert to UTF-8 string
      return decrypted.toString('utf8');
    } catch (err) {
      console.error('AES Decryption Error:', err);
      throw new Error(`AES decryption failed: ${err.message}`);
    }
  }
} 