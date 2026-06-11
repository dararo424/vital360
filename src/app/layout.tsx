import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vital360",
  description: "Nutrición y ejercicio dentro de tu plan, con conteo por foto.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vital360",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1a14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Aplica el modo oscuro según la preferencia del sistema, antes del primer
// pintado (sin parpadeo) y reacciona a cambios en vivo.
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function a(){document.documentElement.classList.toggle('dark',m.matches);}a();m.addEventListener('change',a);}catch(e){}})();`;

// Captura el evento de instalación de la PWA apenas ocurre (puede dispararse
// antes de montar cualquier componente), para luego ofrecerlo desde Ajustes.
const installScript = `(function(){window.__deferredInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredInstallPrompt=e;});window.addEventListener('appinstalled',function(){window.__deferredInstallPrompt=null;});})();`;

// Registra el service worker (caché offline + push) en cada carga.
const swScript = `(function(){if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: installScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        {children}
      </body>
    </html>
  );
}
