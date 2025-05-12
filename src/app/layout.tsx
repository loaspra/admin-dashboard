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
    <html lang="en">
      <body className={fontSans.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <ThemeToggle />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
