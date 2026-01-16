import './globals.css'
import { Providers } from './providers'
import { Onest } from 'next/font/google'

const onest = Onest({ 
  subsets: ['latin'],
  variable: '--font-onest',
})

export const metadata = {
  title: 'Kartu Kendali Anggaran',
  description: 'Aplikasi Pencatatan Kartu Kendali Anggaran',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${onest.variable} min-h-screen bg-background font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
