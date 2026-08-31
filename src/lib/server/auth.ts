import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SESSION_SECRET =
	process.env.SESSION_SECRET || 'default-antigravity-dev-secret-key-change-in-production';
const COOKIE_NAME = 'session';

export interface SafeUser {
	id: string;
	nombre_de_usuario: string;
	email: string;
	createdAt: Date;
}

/**
 * Signs a user ID using HMAC SHA-256 to prevent cookie tampering.
 */
export function signSession(userId: string): string {
	const hmac = crypto.createHmac('sha256', SESSION_SECRET);
	hmac.update(userId);
	const signature = hmac.digest('hex');
	return `${userId}.${signature}`;
}

/**
 * Verifies a signed session token. Returns userId if valid, null otherwise.
 */
export function verifySession(token: string): string | null {
	if (!token || !token.includes('.')) {
		return null;
	}
	const lastDot = token.lastIndexOf('.');
	const userId = token.substring(0, lastDot);
	const signature = token.substring(lastDot + 1);

	const hmac = crypto.createHmac('sha256', SESSION_SECRET);
	hmac.update(userId);
	const expectedSignature = hmac.digest('hex');

	const sigBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		sigBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(sigBuffer, expectedBuffer)
	) {
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
		maxAge: 60 * 60 * 24 * 7 // 7 days
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
