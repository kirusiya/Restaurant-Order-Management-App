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
import { ProductFormDialog } from '@/components/product-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { ProductCreateForm } from '@/components/product-create-form';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  categories?: { name: string } | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const router = useRouter();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingProductName, setDeletingProductName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchProducts = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        let errorMessage = 'Failed to fetch products.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to fetch products. Status: ${response.status} ${response.statusText}`;
        }
        console.error('Fetch Products API Error:', errorMessage);
        toast({
          title: 'Error al cargar productos',
          description: `No se pudieron cargar los productos: ${errorMessage}`,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }
      const data = await response.json();
      // Asegurarse de que los IDs sean strings UUID al cargar los datos
      const processedData = data.map((p: any) => ({
        ...p,
        id: String(p.id), // Convertir product ID a string
        category_id: p.category_id ? String(p.category_id) : null, // Convertir category ID a string o null
      }));
      console.log('Fetched products data (processed):', processedData); // Strategic log
      setProducts(processedData);
    } catch (err) {
      console.error('Error fetching products in component:', err);
      setError(`No se pudieron cargar los productos: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);

    fetchProducts();
  }, [router]);

  const handleCreateProduct = async (productData: { name: string; price: number; category_id?: string | null }) => {
    try {
      console.log('handleCreateProduct - Sending to API:', productData);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create product';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to create product. Status: ${response.status} ${response.statusText}`;
        }
        console.error('Create Product API Error:', errorMessage);
        toast({
          title: 'Error al crear producto',
          description: errorMessage,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }
      fetchProducts();
      console.log('Calling toast for product creation:', { title: 'Producto Creado', description: `El producto "${productData.name}" ha sido creado con éxito.` });
      toast({
        title: 'Producto Creado',
        description: `El producto "${productData.name}" ha sido creado con éxito.`,
        variant: 'dark',
        icon: <CheckCircle className="h-5 w-5" />,
      });
    } catch (err: any) {
      console.error('Error creating product in component:', err);
      throw err;
    }
  };

  const handleEditProduct = async (productData: { id: string; name: string; price: number; category_id?: string | null }) => {
    try {
      console.log('handleEditProduct - Sending to API:', productData);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${productData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.status === 204 || response.ok) {
        fetchProducts();
        setIsEditModalOpen(false);
        setEditingProduct(null);
        console.log('Calling toast for product update:', { title: 'Producto Actualizado', description: `El producto "${productData.name}" ha sido actualizado con éxito.` });
        toast({
          title: 'Producto Actualizado',
          description: `El producto "${productData.name}" ha sido actualizado con éxito.`,
          variant: 'dark',
          icon: <CheckCircle className="h-5 w-5" />,
        });
      } else {
        let errorMessage = 'Failed to update product';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to update product. Status: ${response.status} ${response.statusText}`;
        }
        console.error('Update Product API Error:', errorMessage);
        toast({
          title: 'Error al actualizar producto',
          description: errorMessage,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Error updating product in component:', err);
      throw err;
    }
  };

  const handleDeleteProduct = async () => {
    if (deletingProductId === null) return;
    try {
      console.log('handleDeleteProduct - Deleting product ID:', deletingProductId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${deletingProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.status === 204 || response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deletingProductId));
        setIsDeleteConfirmOpen(false);
        setDeletingProductId(null);
        setDeletingProductName('');
        console.log('Calling toast for product deletion:', { title: 'Producto Eliminado', description: `El producto "${deletingProductName}" ha sido eliminado con éxito.` });
        toast({
          title: 'Producto Eliminado',
          description: `El producto "${deletingProductName}" ha sido eliminado con éxito.`,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
      } else if (response.status === 409) {
            const errorData = await response.json();
            console.error('Delete Product API Error (Conflict):', errorData.error);
            toast({
                title: 'Error al eliminar producto',
                description: errorData.error,
                variant: 'destructive',
                icon: <XCircle className="h-5 w-5" />,
            });
            setIsDeleteConfirmOpen(false); // Cerrar el diálogo de confirmación
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (jsonError) {
                errorData = { error: `Failed to delete product. Status: ${response.status} ${response.statusText}` };
            }
            console.error('Delete Product API Error:', errorData.error || 'Unknown error during delete');
            toast({
                title: 'Error al eliminar producto',
                description: errorData.error || 'Hubo un problema al eliminar el producto.',
                variant: 'destructive',
                icon: <XCircle className="h-5 w-5" />,
            });
            throw new Error(errorData.error || 'Failed to delete product');
        }
    } catch (err: any) {
      console.error('Error deleting product in component:', err);
      setError(`Error al eliminar producto: ${err.message}`);
      setIsDeleteConfirmOpen(false);
    }
  };

  const openEditModal = (product: Product) => {
    console.log('openEditModal - Product ID:', product.id, 'Category ID:', product.category_id);
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (id: string, name: string) => {
    console.log('openDeleteConfirm - Product ID:', id);
    setDeletingProductId(id);
    setDeletingProductName(name);
    setIsDeleteConfirmOpen(true);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.price.toString().includes(searchTerm)
    );
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? filteredProducts.length : parseInt(value));
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
    <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {userRole === 'admin' && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Crear Nuevo Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductCreateForm onSave={handleCreateProduct} />
          </CardContent>
        </Card>
      )}

      <Card className={userRole === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Gestión de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <Input
              placeholder="Buscar productos..."
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
          {currentProducts.length === 0 ? (
            <p className="text-center text-gray-500">No hay productos disponibles que coincidan con la búsqueda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product, idx) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.categories?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {userRole === 'admin' && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(product)}
                                className="mr-2"
                              >
                                <Pencil className="h-4 w-4 text-green-600" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar producto</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteConfirm(product.id, product.name)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar producto</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredProducts.length > itemsPerPage && itemsPerPage !== filteredProducts.length && (
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

      {editingProduct && (
        <ProductFormDialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditProduct}
          initialData={editingProduct}
          isEdit={true}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
        itemName={deletingProductName}
        itemType="producto"
      />
    </div>
    </TooltipProvider>
  );
}
