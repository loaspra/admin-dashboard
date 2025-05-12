import { Inter as FontSans } from "next/font/google"
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { Toaster } from "@/app/components/ui/sonner";
import { ThemeToggle } from '@/app/components/ui/theme-toggle';
import "./globals.css";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for managing products and orders",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${fontSans.className} min-h-screen overflow-x-hidden relative`} style={{margin: 0, padding: 0}}>
        <AuthProvider>
          <ThemeProvider>
            <div className="relative min-h-screen">
              {children}
            </div>
            <ThemeToggle />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
