// SHA-256 fingerprints with Web Crypto, the same code in the browser and in Node 20+.

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

export function toBytes(data) {
  if (data == null) return new Uint8Array(0);
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return encoder.encode(String(data));
}

export function bytesToText(bytes) {
  return decoder.decode(bytes);
}

export async function sha256Hex(data) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) {
    throw new Error('Web Crypto is not available here (open the page over https:// or http://127.0.0.1).');
  }
  const digest = await subtle.digest('SHA-256', toBytes(data));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isSha256Hex(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}
