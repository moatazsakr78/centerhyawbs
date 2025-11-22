import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'omelarosa Store',
  description: 'أفضل المنتجات بأسعار مميزة',
}

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}