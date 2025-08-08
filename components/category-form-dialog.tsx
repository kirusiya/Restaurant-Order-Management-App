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

interface CategoryFormDialogProps {
isOpen: boolean;
onClose: () => void;
onSave: (category: { id?: number; name: string }) => Promise<void>;
initialData?: {
  id?: number;
  name: string;
};
isEdit?: boolean;
}

export function CategoryFormDialog({
isOpen,
onClose,
onSave,
initialData,
isEdit = false,
}: CategoryFormDialogProps) {
const [name, setName] = useState(initialData?.name || '');
const [errors, setErrors] = useState<{ name?: string }>({});
const [apiError, setApiError] = useState('');

useEffect(() => {
  if (isOpen) {
    setName(initialData?.name || '');
    setErrors({});
    setApiError('');
  }
}, [isOpen, initialData]);

const validateForm = () => {
  const newErrors: { name?: string } = {};
  if (!name.trim()) {
    newErrors.name = 'El nombre de la categoría es requerido.';
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
    const categoryData = {
      id: initialData?.id,
      name,
    };
    await onSave(categoryData);
    onClose();
  } catch (err: any) {
    console.error('Error in CategoryFormDialog handleSubmit:', err);
    setApiError(err.message || `Error al ${isEdit ? 'actualizar' : 'crear'} la categoría.`);
  } finally {
    // setLoading(false);
  }
};

return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Categoría' : 'Crear Categoría'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Realiza cambios en los detalles de la categoría aquí.' : 'Crea una nueva categoría para organizar tus productos.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre de la Categoría</Label>
          <Input
            id="name"
            type="text"
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
        </div>
        {apiError && <p className="text-red-500 text-sm text-center">{apiError}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {isEdit ? 'Guardar Cambios' : 'Crear Categoría'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
}
