import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Videogame pairing: pixel titles (Press Start 2P) + retro terminal body (VT323)
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "smallhands — microinteractions",
  description: "Interactive presentation deck",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} ${vt323.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
if (typeof Node === 'function' && Node.prototype) {
  const _removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) return child;
    return _removeChild.apply(this, arguments);
  };
  const _insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, ref) {
    if (ref && ref.parentNode !== this) return newNode;
    return _insertBefore.apply(this, arguments);
  };
}
            `.trim(),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
