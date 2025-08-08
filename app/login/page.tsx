'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { XCircle } from 'lucide-react'; // Import icon

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast(); // Initialize useToast

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error de inicio de sesión.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Dispatch a custom event to notify Navbar of successful login
      window.dispatchEvent(new Event('loginSuccess'));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error de inicio de sesión',
        description: err.message,
        variant: 'destructive',
        icon: <XCircle className="h-5 w-5" />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Iniciar Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="tu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="tu_contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
