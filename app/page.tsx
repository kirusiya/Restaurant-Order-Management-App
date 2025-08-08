'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirige directamente al dashboard al cargar la página
    router.push('/dashboard');
  }, [router]);

  // No renderiza nada en esta página, ya que redirige inmediatamente
  return null;
}
