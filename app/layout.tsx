import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Roboto, Poppins, Arimo, Tinos, Fahkwang, Playfair_Display } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['400', '500', '600', '700', '800'],
})

const arimo = Arimo({
  subsets: ['latin'],
  variable: '--font-arimo',
  weight: ['400', '500', '600', '700'],
})

const tinos = Tinos({
  subsets: ['latin'],
  variable: '--font-tinos',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

const fahkwang = Fahkwang({
  subsets: ['latin'],
  variable: '--font-fahkwang',
  weight: ['400', '500', '600', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
})

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'RiseWithJeet - UPSC Preparation Platform',
  description: 'India\'s #1 AI-Powered UPSC Platform. Trusted by 50,000+ aspirants preparing with AI-powered learning, daily MCQs practice, instant mains answer evaluation, expert mentorship, and smart revision tools.',
  keywords: 'UPSC, IAS, Civil Services, Exam Preparation, AI Learning, MCQs, Answer Evaluation',
  icons: {
    icon: '/logo-jeet.png',
    apple: '/logo-jeet.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} ${roboto.variable} ${poppins.variable} ${arimo.variable} ${tinos.variable} ${fahkwang.variable} ${playfair.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
