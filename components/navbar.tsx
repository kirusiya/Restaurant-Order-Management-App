'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null);

  const loadUserFromLocalStorage = useCallback(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUserFromLocalStorage();

    window.addEventListener('loginSuccess', loadUserFromLocalStorage);

    return () => {
      window.removeEventListener('loginSuccess', loadUserFromLocalStorage);
    };
  }, [loadUserFromLocalStorage]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="flex items-center justify-between bg-gray-800 p-4 text-white shadow-md">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="text-xl font-bold">
          Restaurant App
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="hover:text-gray-300">
              Dashboard
            </Link>
            <Link href="/orders/manage" className="hover:text-gray-300">
              Gestionar Órdenes
            </Link>
            {user.role === 'admin' && (
              <Link href="/products" className="hover:text-gray-300">
                Productos
              </Link>
            )}
            {user.role === 'admin' && (
              <>
                <Link href="/users" className="hover:text-gray-300">
                  Usuarios
                </Link>
                <Link href="/categories" className="hover:text-gray-300">
                  Categorías
                </Link>
              </>
            )}
          </>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <span className="text-sm hidden md:block">
              Bienvenido, {user.username} ({user.role})
            </span>
            <Button onClick={handleLogout} variant="secondary" size="sm">
              Cerrar Sesión
            </Button>
          </>
        ) : (
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Iniciar Sesión
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
