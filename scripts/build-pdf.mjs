import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const htmlPath = pathToFileURL(process.cwd() + "/MANUAL_USUARIO.html").href;
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.goto(htmlPath, { waitUntil: "networkidle0" });
await page.pdf({
  path: "MANUAL_USUARIO.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "1.6cm", bottom: "1.6cm", left: "1.4cm", right: "1.4cm" },
});
await browser.close();
console.log("PDF escrito");
