import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET is not set in environment variables');
	}
	console.warn('SESSION_SECRET no está definido; usando un secreto efímero solo para desarrollo');
}
const DEV_SECRET = crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
	return SESSION_SECRET ?? DEV_SECRET;
}

export interface SafeUser {
	id: string;
	nombre_de_usuario: string;
	email: string;
	createdAt: Date;
}

/**
 * Signs "userId.expiresAtMs" with HMAC SHA-256 to prevent cookie tampering.
 */
export function signSession(userId: string): string {
	const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
	const payload = `${userId}.${expiresAt}`;
	const signature = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
	return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns userId if valid and unexpired, null otherwise.
 */
export function verifySession(token: string): string | null {
	if (!token) return null;
	const lastDot = token.lastIndexOf('.');
	const prevDot = token.lastIndexOf('.', lastDot - 1);
	if (prevDot < 0) return null;
	const userId = token.substring(0, prevDot);
	const expiresAtRaw = token.substring(prevDot + 1, lastDot);
	const signature = token.substring(lastDot + 1);
	if (!userId) return null;

	const payload = `${userId}.${expiresAtRaw}`;
	const expectedSignature = crypto.createHmac('sha256', secret()).update(payload).digest('hex');

	const sigBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		sigBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(sigBuffer, expectedBuffer)
	) {
		return null;
	}

	const expiresAt = Number(expiresAtRaw);
	if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
		return null;
	}

	return userId;
}

/**
 * Sets a secure, httpOnly signed session cookie.
 */
export function setSessionCookie(cookies: Cookies, userId: string): void {
	const signedToken = signSession(userId);
	cookies.set(COOKIE_NAME, signedToken, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: SESSION_TTL_SECONDS,
		expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
	});
}

/**
 * Deletes the session cookie on logout.
 */
export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

/**
 * Reads and verifies the session cookie, returning the SafeUser if valid.
 */
export async function authenticateUser(cookies: Cookies): Promise<SafeUser | null> {
	const sessionCookie = cookies.get(COOKIE_NAME);
	if (!sessionCookie) return null;

	const userId = verifySession(sessionCookie);
	if (!userId) return null;

	try {
		const [user] = await db
			.select({
				id: users.id,
				nombre_de_usuario: users.nombre_de_usuario,
				email: users.email,
				createdAt: users.createdAt
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		return user ?? null;
	} catch (error) {
		console.error('Error fetching user for authentication:', error);
		return null;
	}
}
