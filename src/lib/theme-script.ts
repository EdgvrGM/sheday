/**
 * Tema de la tienda: automático (sigue al sistema), claro u oscuro.
 * La preferencia vive en `localStorage`; el atributo `data-theme` de <html> siempre
 * lleva el tema ya resuelto ("light" | "dark"). El primer pintado lo resuelve
 * `THEME_SCRIPT` (en `layout.tsx`) para que no haya parpadeo.
 * Vive aparte de `theme.ts` porque el layout (servidor) necesita el texto del script.
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_KEY = "sheday.theme.v1";
/** Color de la barra del navegador para cada tema (igual a `--color-paper`). */
export const THEME_COLORS = { light: "#ffffff", dark: "#150b13" } as const;

/**
 * Corre en <head> antes de pintar. Se mantiene en ES5 y autocontenido.
 * También sigue los cambios del sistema mientras la preferencia sea "automático".
 */
export const THEME_SCRIPT = `(function(){try{
var d=document.documentElement,k=${JSON.stringify(THEME_KEY)},c=${JSON.stringify(THEME_COLORS)},m=matchMedia("(prefers-color-scheme: dark)");
function apply(){var p=null;try{p=localStorage.getItem(k)}catch(e){}
var t=p==="light"||p==="dark"?p:(m.matches?"dark":"light");d.setAttribute("data-theme",t);
var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++)ms[i].setAttribute("content",c[t]);}
apply();document.addEventListener("DOMContentLoaded",apply);
m.addEventListener("change",apply);window.__shedayApplyTheme=apply;
}catch(e){}})();`;
