'use client'; // Asegurarse de que sea un Client Component

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
}

interface ProductCreateFormProps {
  onSave: (product: { name: string; price: number; category_id?: string | null }) => Promise<void>;
}

export function ProductCreateForm({ onSave }: ProductCreateFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null); // Changed to null for initial state
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    console.log('ProductCreateForm - useEffect: Fetching categories...'); // Strategic log
    const fetchCategories = async () => {
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
          console.error('Fetch Categories API Error (ProductCreateForm):', errorMessage);
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setCategories(data);
        console.log('ProductCreateForm - Fetched categories:', data); // Strategic log
      } catch (err) {
        console.error('Error fetching categories in ProductCreateForm:', err);
        setApiError(`No se pudieron cargar las categorías: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: { name?: string; price?: string; category?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre del producto es requerido.';
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'El precio debe ser un número mayor que cero.';
    }

    if (!categoryId || categoryId === 'null' || categoryId === null) {
      newErrors.category = 'La categoría es obligatoria.';
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
        name,
        price: parseFloat(price),
        category_id: categoryId !== null ? String(categoryId) : null        
      };
      console.log('ProductCreateForm - Sending productData:', productData); // Strategic log
      await onSave(productData);
      setName('');
      setPrice('');
      setCategoryId(null); // Reset to null after successful save
      setErrors({});
    } catch (err: any) {
      console.error('Error in ProductCreateForm handleSubmit:', err);
      setApiError(err.message || 'Error al crear el producto.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="create-product-name">Nombre</Label>
        <Input
          id="create-product-name"
          type="text"
          placeholder="Nombre del producto"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="create-product-price">Precio</Label>
        <Input
          id="create-product-price"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="create-product-category">Categoría</Label>
        <Select
          value={categoryId !== null ? String(categoryId) : 'null'}
          onValueChange={(value) => setCategoryId(value === 'null' ? null : Number(value))}
        >
          <SelectTrigger id="create-product-category">
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
      <Button type="submit" className="w-full">
        Crear Producto
      </Button>
    </form>
  );
}
