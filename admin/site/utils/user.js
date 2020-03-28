
import Cookies from 'js-cookie';

export function logout() {
    const isSSR = typeof window === 'undefined';
    if (!isSSR) {
        Cookies.remove(process.env.CLIENT_AUTH_COOKIE)
        window.location.reload(); 
    }
}
        