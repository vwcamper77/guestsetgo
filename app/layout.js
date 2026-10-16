import { Bricolage_Grotesque, Atkinson_Hyperlegible, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import VisitorTracker from "@/components/VisitorTracker";
import { publicSiteUrl } from "@/lib/site-url.mjs";
import "./globals.css";
import "./editorial.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display" });
const body = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono" });

export const metadata = {
  metadataBase: new URL(publicSiteUrl()),
  title: { default: "GuestSetGo", template: "%s · GuestSetGo" },
  description: "Your holiday let, explained clearly. Add house photos and numbered instructions. Optional welcome folder conversion is £79 per property. Start a 30-day guest trial.",
  openGraph: { type: 'website', siteName: 'GuestSetGo', locale: 'en_GB', title: 'GuestSetGo — thoughtful hosting, happier guests', description: 'Clear guest guides, personal touches and calmer stays for holiday let hosts.' },
  twitter: { card: 'summary_large_image', title: 'GuestSetGo — thoughtful hosting, happier guests', description: 'Your holiday let, explained clearly.', images: ['/opengraph-image'] },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AuthProvider><VisitorTracker />{children}</AuthProvider>
      </body>
    </html>
  );
}
