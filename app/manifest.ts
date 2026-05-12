import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SinglePay Plataforma',
    short_name: 'SinglePay',
    description: 'Plataforma premium de pagamentos e gestão de vendas',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/logo-1000x1000.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo-1000x1000.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
