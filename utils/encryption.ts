import sodium, { base64_variants } from "libsodium-wrappers";

export async function generateKeyPair() {
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  return {
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
  };
}

export async function validatePrivateKey(privateKey: string){
  await sodium.ready
  try {
    const keyBytes = sodium.from_base64(privateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    if(keyBytes.length !== sodium.crypto_box_SECRETKEYBYTES){
      return false
    }
     const pubKey = sodium.crypto_scalarmult_base(keyBytes);
    if (pubKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
      return false;
    }

    return true
  } catch (error) {
    return false;
  }
}

export async function generateMessageKey() {
  await sodium.ready;
  return sodium.randombytes_buf(
    sodium.crypto_aead_chacha20poly1305_ietf_KEYBYTES
  );
}

export async function exportPublicKey(publicKey: Uint8Array): Promise<string> {
  await sodium.ready;
  return sodium.to_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export async function exportPrivateKey(
  privateKey: Uint8Array
): Promise<string> {
  await sodium.ready;
  return sodium.to_base64(
    privateKey,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
}

export async function importPublicKey(
  pubKeyString: string
): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.from_base64(
    pubKeyString,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
}

export async function importPrivateKey(
  privKeyString: string
): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.from_base64(
    privKeyString,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
}

export async function arrayBufferToBase64(buffer: ArrayBuffer) {
  await sodium.ready;
  const bytes = new Uint8Array(buffer);
  return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export async function base64ToArrayBuffer(base64: string) {
  await sodium.ready;
  const bytes = sodium.from_base64(
    base64,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
  return bytes.buffer;
}

export async function encryptedBuffer(
  buffer: ArrayBuffer,
  messageKey: Uint8Array
) {
  await sodium.ready;

  const key =
    messageKey ||
    sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_ietf_KEYBYTES);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const encryptedBuffer = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    new Uint8Array(buffer),
    null,
    null,
    nonce,
    key
  );
  const nonceBase64 = await arrayBufferToBase64(nonce.buffer as ArrayBuffer);

  return {
    encryptedBuffer,
    nonceBase64,
    messageKey: key,
  };
}

export async function decryptedBuffer(
  encryptedBuffer: ArrayBuffer,
  messageKey: Uint8Array,
  iv: string
) {
  await sodium.ready;
  const nonce = await base64ToArrayBuffer(iv);
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    new Uint8Array(encryptedBuffer),
    null,
    new Uint8Array(nonce),
    messageKey
  );

  return decrypted;
}

export async function encryptMessage(
  message: string,
  key: Uint8Array
): Promise<{ cipherText: string; iv: string }> {
  await sodium.ready;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );
  const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    data,
    null,
    null,
    nonce,
    key
  );
  return {
    cipherText: sodium.to_base64(
      encrypted,
      sodium.base64_variants.URLSAFE_NO_PADDING
    ),
    iv: sodium.to_base64(nonce, sodium.base64_variants.URLSAFE_NO_PADDING),
  };
}

export async function decryptMessage(
  cipherText: string,
  iv: string,
  key: Uint8Array
) {
  await sodium.ready;
  const decoder = new TextDecoder();
  const encryptedData = sodium.from_base64(
    cipherText,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
  const nonce = sodium.from_base64(
    iv,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );

  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    encryptedData,
    null,
    nonce,
    key
  );

  return decoder.decode(decrypted);
}

export async function encryptKey(
  messageKey: Uint8Array,
  publicKey: Uint8Array
) {
  await sodium.ready;
  const encrypted = sodium.crypto_box_seal(messageKey, publicKey);
  return sodium.to_base64(encrypted, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export async function decryptKey(
  encryptedKey: string,
  privateKey: Uint8Array,
  publicKey: Uint8Array
) {
  await sodium.ready;
  const encryptedData = sodium.from_base64(
    encryptedKey,
    sodium.base64_variants.URLSAFE_NO_PADDING
  );
  return sodium.crypto_box_seal_open(encryptedData, publicKey, privateKey);
}
