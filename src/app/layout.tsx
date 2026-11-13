import type { Metadata } from "next";
import { Literata, Source_Sans_3 } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-source" });
const serif = Literata({ subsets: ["latin", "latin-ext"], variable: "--font-literata" });

export const metadata: Metadata = {
  title: "Menedżer osobisty",
  description: "Cele, plan tygodnia i przegląd wykonania.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${sans.variable} ${serif.variable} h-full`}>
      <body className="min-h-full antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
