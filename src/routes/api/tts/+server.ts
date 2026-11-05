import { GEMINI_API_KEY } from '$env/static/private';
import { GoogleGenAI } from '@google/genai';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { text } = body as { text?: string };

	if (!text || typeof text !== 'string') {
		throw error(400, 'Se requiere el campo "text".');
	}

	const cleanText = text
		.replace(/[*_#`~]/g, '') // quitar markdown
		.replace(/\s+/g, ' ')
		.trim();

	if (!cleanText) {
		throw error(400, 'El texto está vacío después de limpiar el formato.');
	}

	// SSML: ritmo lento y pausado para narración cinematográfica
	const ssmlText = `<speak><prosody rate="slow">${cleanText}</prosody></speak>`;

	let response;
	try {
		response = await ai.models.generateContent({
			model: 'gemini-3.8-flash-tts',
			contents: [{ parts: [{ text: ssmlText }] }],
			config: {
				responseModalities: ['AUDIO'],
				speechConfig: {
					languageCode: 'es-ES',
					voiceConfig: {
						prebuiltVoiceConfig: {
							voiceName: 'Aoede'
						}
					}
				}
			}
		});
	} catch (apiErr: unknown) {
		const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
		console.error('[TTS API] Error en llamada a Gemini:', msg);

		// Detectar agotamiento de quota o rate-limit → 429 para que el cliente haga fallback
		const isRateLimit =
			msg.includes('429') ||
			msg.includes('RESOURCE_EXHAUSTED') ||
			msg.includes('quota') ||
			msg.includes('rate') ||
			msg.includes('limit');

		if (isRateLimit) {
			throw error(429, 'QUOTA_EXHAUSTED');
		}

		throw error(502, `Error de Gemini TTS: ${msg}`);
	}

	const part = response.candidates?.[0]?.content?.parts?.[0];

	if (!part?.inlineData?.data) {
		console.error('[TTS API] Respuesta sin audio. Candidatos:', JSON.stringify(response.candidates, null, 2));
		throw error(500, 'La API de Gemini no devolvió datos de audio.');
	}

	const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
	const mimeType = part.inlineData.mimeType ?? 'audio/wav';

	return new Response(audioBuffer, {
		headers: {
			'Content-Type': mimeType,
			'Cache-Control': 'no-store'
		}
	});
};
