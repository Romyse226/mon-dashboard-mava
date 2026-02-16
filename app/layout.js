import "./globals.css"; // CETTE LIGNE EST CRUCIALE

export const metadata = {
  title: "MAVA Board",
  description: "Dashboard de livraison MAVA",
  manifest: "/manifest.json",
  icons: {
    icon: "https://raw.githubusercontent.com/Romyse226/mon-dashboard-mava/31c25ca78b7d59f021c7a498e8b1ce7491f12237/mon%20logo%20mava.png",
    apple: "https://raw.githubusercontent.com/Romyse226/mon-dashboard-mava/31c25ca78b7d59f021c7a498e8b1ce7491f12237/mon%20logo%20mava.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}