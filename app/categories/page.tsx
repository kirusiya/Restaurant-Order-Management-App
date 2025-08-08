'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { CategoryCreateForm } from '@/components/category-create-form';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Category {
id: number;
name: string;
created_at: string;
}

export default function CategoriesPage() {
const [categories, setCategories] = useState<Category[]>([]);
const [error, setError] = useState('');
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(5);
const router = useRouter();

const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingCategory, setEditingCategory] = useState<Category | null>(null);
const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
const [deletingCategoryName, setDeletingCategoryName] = useState<string>('');

const { toast } = useToast();

const fetchCategories = async () => {
setError('');
try {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let errorMessage = 'Failed to fetch categories.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to fetch categories. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Fetch Categories API Error:', errorMessage);
    toast({
      title: 'Error al cargar categorías',
      description: `No se pudieron cargar las categorías: ${errorMessage}`,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
  const data = await response.json();
  setCategories(data);
} catch (err) {
  console.error('Error fetching categories in component:', err);
  setError(`No se pudieron cargar las categorías: ${err instanceof Error ? err.message : String(err)}`);
}
};

useEffect(() => {
const token = localStorage.getItem('token');
if (!token) {
  router.push('/login');
  return;
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'admin') {
  router.push('/dashboard');
  return;
}

fetchCategories();
}, [router]);

const handleCreateCategory = async (categoryData: { name: string }) => {
try {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create category';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to create category. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Create Category API Error:', errorMessage);
    toast({
      title: 'Error al crear categoría',
      description: errorMessage,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
  fetchCategories();
  console.log('Calling toast for category creation:', { title: 'Categoría Creada', description: `La categoría "${categoryData.name}" ha sido creada con éxito.` });
  toast({
    title: 'Categoría Creada',
    description: `La categoría "${categoryData.name}" ha sido creada con éxito.`,
    variant: 'dark',
    icon: <CheckCircle className="h-5 w-5" />,
  });
} catch (err: any) {
  console.error('Error creating category in component:', err);
  throw err;
}
};

const handleEditCategory = async (categoryData: { id: number; name: string }) => {
try {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/categories/${categoryData.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  });

  if (response.status === 204 || response.ok) {
    fetchCategories();
    setIsEditModalOpen(false);
    setEditingCategory(null);
    console.log('Calling toast for category update:', { title: 'Categoría Actualizada', description: `La categoría "${categoryData.name}" ha sido actualizada con éxito.` });
    toast({
      title: 'Categoría Actualizada',
      description: `La categoría "${categoryData.name}" ha sido actualizada con éxito.`,
      variant: 'dark',
      icon: <CheckCircle className="h-5 w-5" />,
    });
  } else {
    let errorMessage = 'Failed to update category';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to update category. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Update Category API Error:', errorMessage);
    toast({
      title: 'Error al actualizar categoría',
      description: errorMessage,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
} catch (err: any) {
  console.error('Error updating category in component:', err);
  throw err;
}
};

const handleDeleteCategory = async () => {
if (deletingCategoryId === null) return;
try {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/categories/${deletingCategoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (response.status === 204 || response.ok) {
    setCategories((prev) => prev.filter((c) => c.id !== deletingCategoryId));
    setIsDeleteConfirmOpen(false);
    setDeletingCategoryId(null);
    setDeletingCategoryName('');
    console.log('Calling toast for category deletion:', { title: 'Categoría Eliminada', description: `La categoría "${deletingCategoryName}" ha sido eliminada con éxito.` });
    toast({
      title: 'Categoría Eliminada',
      description: `La categoría "${deletingCategoryName}" ha sido eliminada con éxito.`,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
  } else {
    let errorData;
    try {
      errorData = await response.json();
    } catch (jsonError) {
      errorData = { error: `Failed to delete category. Status: ${response.status} ${response.statusText}` };
    }
    console.error('Delete Category API Error:', errorData.error || 'Unknown error during delete');
    toast({
      title: 'Error al eliminar categoría',
      description: errorData.error || 'Hubo un problema al eliminar la categoría.',
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorData.error || 'Failed to delete category');
  }
} catch (err: any) {
  console.error('Error deleting category in component:', err);
  setError(`Error al eliminar categoría: ${err.message}`);
  setIsDeleteConfirmOpen(false);
}
};

const openEditModal = (category: Category) => {
setEditingCategory(category);
setIsEditModalOpen(true);
};

const openDeleteConfirm = (id: number, name: string) => {
setDeletingCategoryId(id);
setDeletingCategoryName(name);
setIsDeleteConfirmOpen(true);
};

const filteredCategories = useMemo(() => {
return categories.filter(category =>
  category.name.toLowerCase().includes(searchTerm.toLowerCase())
);
}, [categories, searchTerm]);

const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
const currentCategories = useMemo(() => {
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
return filteredCategories.slice(startIndex, endIndex);
}, [filteredCategories, currentPage, itemsPerPage]);

const handlePageChange = (page: number) => {
if (page > 0 && page <= totalPages) {
  setCurrentPage(page);
}
};

const handleItemsPerPageChange = (value: string) => {
setItemsPerPage(value === 'all' ? filteredCategories.length : parseInt(value));
setCurrentPage(1);
};

return (
<TooltipProvider>
<div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card className="lg:col-span-1">
    <CardHeader>
      <CardTitle className="text-xl font-bold">Crear Nueva Categoría</CardTitle>
    </CardHeader>
    <CardContent>
      <CategoryCreateForm onSave={handleCreateCategory} />
    </CardContent>
  </Card>

  <Card className="lg:col-span-2">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-2xl font-bold">Gestión de Categorías</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <Input
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="items-per-page">Mostrar:</Label>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger id="items-per-page" className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
      {currentCategories.length === 0 ? (
        <p className="text-center text-gray-500">No hay categorías disponibles que coincidan con la búsqueda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCategories.map((category, idx) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{new Date(category.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(category)}
                        className="mr-2"
                      >
                        <Pencil className="h-4 w-4 text-green-600" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar categoría</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteConfirm(category.id, category.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eliminar categoría</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {filteredCategories.length > itemsPerPage && itemsPerPage !== filteredCategories.length && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : undefined}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(i + 1);
                  }}
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage === totalPages}
                tabIndex={currentPage === totalPages ? -1 : undefined}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </CardContent>
  </Card>

  {editingCategory && (
    <CategoryFormDialog
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      onSave={handleEditCategory}
      initialData={editingCategory}
      isEdit={true}
    />
  )}

  <DeleteConfirmationDialog
    isOpen={isDeleteConfirmOpen}
    onClose={() => setIsDeleteConfirmOpen(false)}
    onConfirm={handleDeleteCategory}
    itemName={deletingCategoryName}
    itemType="categoría"
  />
</div>
</TooltipProvider>
);
}
