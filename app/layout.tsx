import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar'; // Importar el componente Navbar

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Restaurant Order App',
  description: 'Gestiona órdenes y productos de tu restaurante.',
    generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar /> {/* Añadir el Navbar al layout */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
