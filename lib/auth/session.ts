const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "nmak_session";
export const OAUTH_COOKIE_NAME = "nmak_oauth";
export const PENDING_CHANNEL_COOKIE_NAME = "nmak_pending_channel";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const OAUTH_MAX_AGE_SECONDS = 60 * 10;
export const PENDING_CHANNEL_MAX_AGE_SECONDS = 60 * 10;

type SessionPayload = {
  version: 1;
  memberId: string;
  kakaoUserId: string;
  issuedAt: number;
  expiresAt: number;
};

export type OAuthStatePayload = {
  version: 1;
  nonce: string;
  returnTo: string;
  storeCode: string;
  issuedAt: number;
  expiresAt: number;
};

export type PendingChannelPayload = {
  version: 1;
  memberId: string;
  kakaoUserId: string;
  storeCode: string;
  returnTo: string;
  accessToken: string;
  issuedAt: number;
  expiresAt: number;
};

function getSigningSecret() {
  const secret = process.env.KAKAO_CLIENT_SECRET;

  if (!secret) {
    throw new Error("KAKAO_CLIENT_SECRET is not configured.");
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getHmacKey(purpose: "session" | "oauth") {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`${purpose}:${getSigningSecret()}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function getPendingChannelKey() {
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`pending-channel:${getSigningSecret()}`),
  );

  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function signPayload(payload: object, purpose: "session" | "oauth") {
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getHmacKey(purpose),
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyPayload<T>(token: string, purpose: "session" | "oauth") {
  const [encodedPayload, encodedSignature, extra] = token.split(".");

  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(purpose),
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    );

    if (!valid) return null;

    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as T;
  } catch {
    return null;
  }
}

export function sanitizeReturnTo(value: string | null | undefined, fallback = "/s/1xbHos") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://n-mak.invalid");
    if (url.origin !== "https://n-mak.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function createSessionToken(memberId: string, kakaoUserId: string) {
  const now = Date.now();
  const payload: SessionPayload = {
    version: 1,
    memberId,
    kakaoUserId,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  return signPayload(payload, "session");
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;

  const payload = await verifyPayload<SessionPayload>(token, "session");
  if (!payload || payload.version !== 1 || payload.expiresAt <= Date.now()) return null;

  return payload;
}

export async function createOAuthState(input: {
  nonce: string;
  returnTo: string;
  storeCode: string;
}) {
  const now = Date.now();
  const payload: OAuthStatePayload = {
    version: 1,
    nonce: input.nonce,
    returnTo: sanitizeReturnTo(input.returnTo),
    storeCode: input.storeCode,
    issuedAt: now,
    expiresAt: now + OAUTH_MAX_AGE_SECONDS * 1000,
  };

  return signPayload(payload, "oauth");
}

export async function readOAuthState(token: string | null) {
  if (!token) return null;

  const payload = await verifyPayload<OAuthStatePayload>(token, "oauth");
  if (!payload || payload.version !== 1 || payload.expiresAt <= Date.now()) return null;

  return payload;
}

export async function createPendingChannelToken(input: {
  memberId: string;
  kakaoUserId: string;
  storeCode: string;
  returnTo: string;
  accessToken: string;
}) {
  const now = Date.now();
  const payload: PendingChannelPayload = {
    version: 1,
    memberId: input.memberId,
    kakaoUserId: input.kakaoUserId,
    storeCode: input.storeCode,
    returnTo: sanitizeReturnTo(input.returnTo, `/s/${input.storeCode}`),
    accessToken: input.accessToken,
    issuedAt: now,
    expiresAt: now + PENDING_CHANNEL_MAX_AGE_SECONDS * 1000,
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getPendingChannelKey(),
    encoder.encode(JSON.stringify(payload)),
  ));
  const token = new Uint8Array(iv.length + encrypted.length);
  token.set(iv);
  token.set(encrypted, iv.length);

  return bytesToBase64Url(token);
}

export async function readPendingChannelToken(token: string | undefined) {
  if (!token) return null;

  try {
    const bytes = base64UrlToBytes(token);
    if (bytes.length <= 12) return null;

    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await getPendingChannelKey(),
      encrypted,
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted)) as PendingChannelPayload;

    if (payload.version !== 1 || payload.expiresAt <= Date.now()) return null;
    if (!payload.memberId || !payload.kakaoUserId || !payload.storeCode || !payload.accessToken) {
      return null;
    }

    return {
      ...payload,
      returnTo: sanitizeReturnTo(payload.returnTo, `/s/${payload.storeCode}`),
    };
  } catch {
    return null;
  }
}
