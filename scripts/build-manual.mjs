import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const md = readFileSync("MANUAL_USUARIO.md", "utf8");

// Quita los enlaces del índice (anclas) para que se vea limpio en Word/PDF,
// pero conserva el texto del ítem.
marked.setOptions({ gfm: true, breaks: false });
const body = marked.parse(md);

const css = `
  :root { --green:#16a34a; --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --bg:#ffffff; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: var(--ink); line-height: 1.6; max-width: 820px; margin: 0 auto;
         padding: 48px 40px; background: var(--bg); font-size: 15px; }
  h1 { color: var(--green); font-size: 30px; border-bottom: 3px solid var(--green);
       padding-bottom: 10px; margin-top: 8px; }
  h2 { color: var(--green); font-size: 22px; margin-top: 34px; border-bottom: 1px solid var(--line);
       padding-bottom: 6px; }
  h3 { font-size: 17px; margin-top: 22px; color: #111827; }
  a { color: var(--green); text-decoration: none; }
  blockquote { border-left: 4px solid var(--green); background: #f0fdf4; margin: 18px 0;
               padding: 12px 18px; border-radius: 0 8px 8px 0; color: #14532d; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
  th, td { border: 1px solid var(--line); padding: 8px 12px; text-align: left; }
  th { background: #f0fdf4; color: #14532d; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 90%; }
  ul, ol { padding-left: 22px; }
  li { margin: 4px 0; }
  hr { border: none; border-top: 1px solid var(--line); margin: 28px 0; }
  em { color: var(--muted); }
  @page { margin: 2cm; }
`;

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vital360 — Manual de usuario</title>
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;

writeFileSync("MANUAL_USUARIO.html", html, "utf8");
console.log("HTML escrito: MANUAL_USUARIO.html");
