import { readFileSync, writeFileSync } from "node:fs";
import HTMLtoDOCX from "html-to-docx";

const html = readFileSync("MANUAL_USUARIO.html", "utf8");
const buf = await HTMLtoDOCX(html, null, {
  title: "Vital360 — Manual de usuario",
  margins: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
  table: { row: { cantSplit: true } },
});
writeFileSync("MANUAL_USUARIO.docx", buf);
console.log("DOCX escrito");
