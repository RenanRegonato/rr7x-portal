import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--fraunces",
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Otto · Deal Intelligence",
  description: "Inteligência de M&A e Crédito Estruturado em 90 minutos por ativo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} min-h-full bg-bg text-ink font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
