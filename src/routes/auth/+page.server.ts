import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import type { Actions } from './$types';
import { esquemaRegistro, esquemaLogin } from './validaciones'; // Import Zod schemas

export const actions: Actions = {
    registrar: async ({ request }) => {
        const formData = await request.formData();
        const dataRaw = Object.fromEntries(formData.entries());
        
        const validacion = esquemaRegistro.safeParse(dataRaw);
        if (!validacion.success) {
            const errors = validacion.error.flatten().fieldErrors;
            return fail(400, { 
                error: 'Error de validación', 
                errors: errors,
                data: dataRaw // Return data to pre-fill form
            });
        }

        const { email, password, nombre_de_usuario } = validacion.data;
        const passwordHash = await bcrypt.hash(password, 10);
        
        try {
            await db.insert(users).values({ 
                id: crypto.randomUUID(), 
                email, 
                password: passwordHash,
                nombre_de_usuario
            });
        } catch (e) {
            return fail(400, { error: 'Error: El usuario ya existe o datos inválidos.' });
        }
        throw redirect(303, '/auth?login=true');
    },
    login: async ({ request, cookies }) => {
        const formData = await request.formData();
        const email = formData.get('email')?.toString() || '';
        const password = formData.get('password')?.toString() || '';
        
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return fail(400, { error: 'Credenciales incorrectas.' });
        }
        cookies.set('session', user.id, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 });
        throw redirect(303, '/dashboard');
    }
};
