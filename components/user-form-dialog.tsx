'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: { id?: number; username: string; password?: string; role: string }) => Promise<void>;
  initialData?: {
    id?: number;
    username: string;
    role: string;
  };
  isEdit?: boolean;
}

export function UserFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEdit = false,
}: UserFormDialogProps) {
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialData?.role || 'waiter');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(initialData?.username || '');
      setPassword(''); // Always clear password field for security
      setRole(initialData?.role || 'waiter');
      setErrors({});
      setApiError('');
    }
  }, [isOpen, initialData]);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido.';
    }
    if (!isEdit && !password.trim()) { // Password is required only for creation
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
      const userData: { id?: number; username: string; password?: string; role: string } = {
        id: initialData?.id,
        username,
        role,
      };
      if (password.trim()) {
        userData.password = password;
      }
      await onSave(userData);
      onClose();
      // Toast handled by parent (app/users/page.tsx)
    } catch (err: any) {
      console.error('Error in UserFormDialog handleSubmit:', err); // Strategic error log
      setApiError(err.message || `Error al ${isEdit ? 'actualizar' : 'crear'} el usuario.`);
    } finally {
      // setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Realiza cambios en los detalles del usuario aquí.' : 'Crea un nuevo usuario para el sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">
              {isEdit ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isEdit ? 'new-password' : 'current-password'}
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="waiter">Mesero</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {apiError && <p className="text-red-500 text-sm text-center">{apiError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
