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

interface Category {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { id?: string; name: string; price: number; category_id?: string | null }) => Promise<void>;
  initialData?: {
    id?: string;
    name: string;
    price: number;
    category_id?: string | null;
  };
  isEdit?: boolean;
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEdit = false,
}: ProductFormDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  // Ensure categoryId is a string or empty string upon initialization
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.category_id || null); // Changed to null for initial state
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setPrice(initialData?.price?.toString() || '');
      // Set categoryId to null if initialData.category_id is null, otherwise use its string value
      setCategoryId(initialData?.category_id || null);
      setErrors({});
      setApiError('');
      console.log('ProductFormDialog - useEffect: Dialog opened, initial categoryId:', initialData?.category_id); // Strategic log
      fetchCategories();
    }
  }, [isOpen, initialData]);

  const fetchCategories = async () => {
    console.log('ProductFormDialog - Fetching categories...'); // Strategic log
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        let errorMessage = 'Failed to fetch categories';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to fetch categories. Status: ${response.status} ${response.statusText}`;
        }
        console.error('Fetch Categories API Error (ProductFormDialog):', errorMessage);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setCategories(data);
      console.log('ProductFormDialog - Fetched categories:', data); // Strategic log
    } catch (err) {
      console.error('Error fetching categories in ProductFormDialog:', err);
      setApiError(`No se pudieron cargar las categorías: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; price?: string; category?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre del producto es requerido.';
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'El precio debe ser un número mayor que cero.';
    }
    if (!categoryId) {
      newErrors.category = 'La categoría es requerida.';
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
      const productData = {
        id: initialData?.id,
        name,
        price: parseFloat(price),
        category_id: categoryId !== null ? String(categoryId) : 'null'
      };
      console.log('ProductFormDialog - Submitting productData:', productData); // Strategic log
      await onSave(productData);
      onClose();
    } catch (err: any) {
      console.error('Error in ProductFormDialog handleSubmit:', err);
      setApiError(err.message || `Error al ${isEdit ? 'actualizar' : 'crear'} el producto.`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Producto' : 'Crear Producto'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Realiza cambios en los detalles del producto aquí.' : 'Crea un nuevo producto para tu inventario.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              placeholder="Nombre del producto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Precio</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={categoryId !== null ? String(categoryId) : 'null'}
              onValueChange={(value) => setCategoryId(value === 'null' ? null : Number(value))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
          </div>
          {apiError && <p className="text-red-500 text-sm text-center">{apiError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
