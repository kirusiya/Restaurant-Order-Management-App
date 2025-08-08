'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category_id: number | null;
  categories?: { name: string } | null;
}

interface OrderItemForm {
  id: string;
  productId: number | null;
  quantity: number;
  pricePerUnit: number;
}

export default function ManageOrdersPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([{
    id: crypto.randomUUID(),
    productId: null,
    quantity: 1,
    pricePerUnit: 0,
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProducts = async () => {
      try {
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
          toast({
            title: 'Error al cargar productos',
            description: `No se pudieron cargar los productos: ${errorMessage}`,
            variant: 'destructive',
            icon: <XCircle className="h-5 w-5" />,
          });
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setAllProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(`No se pudieron cargar los productos: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    fetchProducts();
  }, [router, toast]);

  const handleAddProductRow = () => {
    setOrderItems([...orderItems, { id: crypto.randomUUID(), productId: null, quantity: 1, pricePerUnit: 0 }]);
    // Limpiar error general al agregar nueva fila
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
  };

  const handleRemoveProductRow = (idToRemove: string) => {
    setOrderItems(orderItems.filter(item => item.id !== idToRemove));
    // Limpiar error de la fila eliminada
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[idToRemove];
      return newErrors;
    });
  };

  const handleProductChange = (id: string, newProductId: string) => {
    setOrderItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const productId = parseInt(newProductId);
        const selectedProduct = allProducts.find(p => p.id === productId);
        return {
          ...item,
          productId: productId,
          pricePerUnit: selectedProduct ? selectedProduct.price : 0,
          quantity: 1,
        };
      }
      return item;
    }));
    
    // Limpiar errores de validación cuando se selecciona un producto
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      delete newErrors.general;
      return newErrors;
    });
  };

  const handleQuantityChange = (id: string, newQuantity: string) => {
    const parsedQuantity = parseInt(newQuantity);
    setOrderItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity: isNaN(parsedQuantity) || parsedQuantity <= 0 ? 1 : parsedQuantity,
        };
      }
      return item;
    }));
  };

  const calculateTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      return sum + (item.pricePerUnit * item.quantity);
    }, 0);
  }, [orderItems]);

  const validateOrderItems = () => {
    const errors: { [key: string]: string } = {};
    const hasAnySelectedProduct = orderItems.some(item => item.productId !== null);
    
    if (!hasAnySelectedProduct) {
      errors.general = 'Seleccione por lo menos un producto';
    } else {
      // Si hay al menos un producto seleccionado, validar filas individuales
      orderItems.forEach(item => {
        if (item.productId === null) {
          errors[item.id] = 'Seleccione un producto o elimine esta fila';
        }
      });
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setOrderItems([{ id: crypto.randomUUID(), productId: null, quantity: 1, pricePerUnit: 0 }]);
    setError(null);
    setValidationErrors({});
  };

  const handleSaveOrder = async () => {
    setLoading(true);
    setError(null);

    if (!validateOrderItems()) {
      setLoading(false);
      return;
    }

    const validOrderItems = orderItems.filter(item => item.productId !== null && item.quantity > 0);

    const orderPayload = {
      items: validOrderItems.map(item => ({
        product_id: item.productId as number,
        quantity: item.quantity,
      })),
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save order.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to save order. Status: ${response.status} ${response.statusText}`;
        }
        toast({
          title: 'Error al guardar orden',
          description: errorMessage,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }

      setShowSuccessModal(true);
      resetForm();

    } catch (err) {
      console.error('Error saving order:', err);
      setError(`Error al guardar la orden: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    setShowSuccessModal(false);
    router.push('/dashboard');
  };

  const handleCreateNewOrder = () => {
    setShowSuccessModal(false);
    resetForm();
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
        <Card className="w-full md:w-3/5">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Gestionar Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderItems.map((item, index) => {
              const selectedProductIds = orderItems.map(oi => oi.productId).filter(Boolean);
              const availableProducts = allProducts.filter(p =>
                !selectedProductIds.includes(p.id) || p.id === item.productId
              );
              const currentProduct = allProducts.find(p => p.id === item.productId);

              return (
                <div key={item.id}>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex-1 w-full">
                      <Label htmlFor={`product-${item.id}`} className="sr-only">Producto</Label>
                      <Select
                        value={item.productId?.toString() || ''}
                        onValueChange={(value) => handleProductChange(item.id, value)}
                      >
                        <SelectTrigger id={`product-${item.id}`}>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`quantity-${item.id}`} className="sr-only">Cantidad</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        placeholder="Cant."
                        className="text-center"
                      />
                    </div>
                    <div className="w-24 text-right font-medium">
                      ${(currentProduct ? currentProduct.price * item.quantity : 0).toFixed(2)}
                    </div>
                    {orderItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProductRow(item.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="sr-only">Eliminar producto</span>
                      </Button>
                    )}
                  </div>
                  {validationErrors[item.id] && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors[item.id]}</p>
                  )}
                </div>
              );
            })}

            <Button onClick={handleAddProductRow} variant="outline" className="w-full">
              Agregar más Productos
            </Button>

            {validationErrors.general && (
              <p className="text-red-500 text-sm text-center">{validationErrors.general}</p>
            )}

            <div className="border-t pt-4 mt-4 flex justify-between items-center font-bold text-lg">
              <span>Total:</span>
              <span>${calculateTotal.toFixed(2)}</span>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <Button onClick={handleSaveOrder} className="w-full" disabled={loading}>
              {loading ? 'Guardando Orden...' : 'Guardar Orden'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de éxito */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              ¡Orden Creada con Éxito!
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-center text-gray-600">
              La orden ha sido guardada correctamente y está lista para ser procesada.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={handleGoToDashboard} className="w-full">
                Ir al Dashboard
              </Button>
              <Button onClick={handleCreateNewOrder} variant="outline" className="w-full">
                Crear nueva orden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
