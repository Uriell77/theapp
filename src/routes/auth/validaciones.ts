import { z } from 'zod';

export const esquemaRegistro = z
	.object({
		nombre_de_usuario: z
			.string()
			.min(3, 'El nombre de usuario es obligatorio y debe tener al menos 3 caracteres.'),
		email: z.string().email('El email no es válido.'),
		password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
		confirmar_password: z
			.string()
			.min(6, 'La confirmación de contraseña debe tener al menos 6 caracteres.')
	})
	.refine(
		(data: { password: string; confirmar_password: string }) =>
			data.password === data.confirmar_password,
		{
			message: 'Las contraseñas no coinciden.',
			path: ['confirmar_password']
		}
	);

export const esquemaLogin = z.object({
	email: z.string().email('El email no es válido.'),
	password: z.string().min(1, 'La contraseña es obligatoria.')
});
