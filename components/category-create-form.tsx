'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface CategoryCreateFormProps {
  onSave: (category: { name: string }) => Promise<void>;
}

export function CategoryCreateForm({ onSave }: CategoryCreateFormProps) {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [apiError, setApiError] = useState('');

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
        name,
      };
      await onSave(categoryData);
      setName('');
      setErrors({});
    } catch (err: any) {
      console.error('Error in CategoryCreateForm handleSubmit:', err);
      setApiError(err.message || 'Error al crear la categoría.');
    } finally {
      // setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="create-category-name">Nombre de la Categoría</Label>
        <Input
          id="create-category-name"
          type="text"
          placeholder="Nombre de la categoría"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      {apiError && <p className="text-red-500 text-sm text-center">{apiError}</p>}
      <Button type="submit" className="w-full">
        Crear Categoría
      </Button>
    </form>
  );
}
