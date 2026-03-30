import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SessionProvider } from "@/components/providers/session-provider"
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import './globals.css'

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: 'EduControl - Мониторинг учебного оборудования',
  description: 'Система учёта и мониторинга состояния учебного оборудования в компьютерных классах',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    /* Согласовано с --primary / --background в globals.css (teal + deep ink) */
    { media: '(prefers-color-scheme: light)', color: '#1f6b63' },
    { media: '(prefers-color-scheme: dark)', color: '#12151f' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var r = document.documentElement;
                r.classList.remove('dark', 'theme-violet', 'theme-amber');
                r.removeAttribute('data-edu-accent');
                var t = localStorage.getItem('edutrack-theme');
                if (t === 'violet') t = 'light-violet';
                if (t === 'amber') t = 'light-amber';
                if (t === 'dark' || t === 'dark-violet' || t === 'dark-amber') r.classList.add('dark');
                if (t === 'light-violet') r.classList.add('theme-violet');
                if (t === 'light-amber') r.classList.add('theme-amber');
                if (t === 'dark-violet') r.setAttribute('data-edu-accent', 'violet');
                if (t === 'dark-amber') r.setAttribute('data-edu-accent', 'amber');
                var a = localStorage.getItem('edutrack-animations');
                if (a === 'off') r.classList.add('edu-motion-off');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className={cn(
          "min-h-dvh font-sans antialiased",
          inter.variable,
          geistMono.variable
        )}
      >
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
