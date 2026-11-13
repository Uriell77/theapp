import { browser } from '$app/environment';

/** Estado global de desarrollo. Activa con localStorage.setItem('dev_mode', '1') */
export const devState = $state({
	isDevMode: browser ? localStorage.getItem('dev_mode') === '1' : false
});
