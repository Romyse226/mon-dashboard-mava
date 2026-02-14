import "./globals.css";

export const metadata = {
  title: "MAVA Board",
  description: "Dashboard vendeur MAVA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
