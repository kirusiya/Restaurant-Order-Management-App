'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: string; // Changed to string for UUID
  name: string;
}

interface ProductFormData {
  id?: string; // Changed to string for UUID
  name: string;
  price: number;
  category_id: string | null; // Changed to string for UUID
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSave: (data: ProductFormData) => Promise<void>;
  isEdit?: boolean;
}

export function ProductForm({ initialData, onSave, isEdit = false }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.category_id || null); // Changed to string for UUID
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('No se pudieron cargar las categorías.');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('El precio debe ser un número válido mayor que cero.');
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setError('El nombre del producto es requerido.');
      setLoading(false);
      return;
    }

    try {
      const dataToSave: ProductFormData = {
        name,
        price: parsedPrice,
        category_id: categoryId,
      };
      if (isEdit && initialData?.id) {
        dataToSave.id = initialData.id;
      }
      await onSave(dataToSave);
      if (!isEdit) {
        setName('');
        setPrice('');
        setCategoryId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del producto"
          required
        />
      </div>
      <div>
        <Label htmlFor="price">Precio</Label>
        <Input
          id="price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0.01"
          required
        />
      </div>
      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select value={categoryId || ''} onValueChange={setCategoryId}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Sin categoría</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Producto'}
      </Button>
    </form>
  );
}
