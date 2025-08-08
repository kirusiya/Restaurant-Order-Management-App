'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserCreateFormProps {
  onSave: (user: { username: string; password?: string; role: string }) => Promise<void>;
}

export function UserCreateForm({ onSave }: UserCreateFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido.';
    }
    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        username,
        password,
        role,
      };
      await onSave(userData);
      setUsername('');
      setPassword('');
      setRole('waiter');
      setErrors({});
    } catch (err: any) {
      console.error('Error in UserCreateForm handleSubmit:', err);
      setApiError(err.message || 'Error al crear el usuario.');
    } finally {
      // setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="create-user-username">Nombre de Usuario</Label>
        <Input
          id="create-user-username"
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="create-user-password">Contraseña</Label>
        <Input
          id="create-user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="create-user-role">Rol</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="create-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="waiter">Mesero</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {apiError && <p className="text-red-500 text-sm text-center">{apiError}</p>}
      <Button type="submit" className="w-full">
        Crear Usuario
      </Button>
    </form>
  );
}
