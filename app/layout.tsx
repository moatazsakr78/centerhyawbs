import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import TopHeader from './components/layout/TopHeader'
import { CurrencyProvider } from '@/lib/hooks/useCurrency'
import { SystemSettingsProvider } from '@/lib/hooks/useSystemSettings'
import { CartProvider } from '@/lib/contexts/CartContext'
import { UserProfileProvider } from '@/lib/contexts/UserProfileContext'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ProductCardColorProvider } from '@/lib/contexts/ProductCardColorContext'
import { BackgroundColorProvider } from '@/lib/contexts/BackgroundColorContext'

export const metadata: Metadata = {
  title: 'El Farouk Group Store',
  description: 'El Farouk Group Store - أفضل المنتجات بأسعار مميزة',
  applicationName: 'El Farouk Group',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'El Farouk Group',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logo/El Farouk10.png',
    apple: '/assets/logo/El Farouk10.png',
  },
  other: {
    'theme-color': '#DC2626',
    'msapplication-navbutton-color': '#DC2626',
    'msapplication-TileColor': '#DC2626',
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-arabic bg-[#1F2937] text-gray-800">
        <ThemeProvider>
          <ProductCardColorProvider>
            <BackgroundColorProvider>
              <SystemSettingsProvider>
                <CurrencyProvider>
                  <UserProfileProvider>
                    <CartProvider>
                      <TopHeader />
                      {children}
                    </CartProvider>
                  </UserProfileProvider>
                </CurrencyProvider>
              </SystemSettingsProvider>
            </BackgroundColorProvider>
          </ProductCardColorProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}