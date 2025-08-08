'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircleIcon, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductInOrder {
  name: string;
  price: number;
}

interface OrderItem {
  quantity: number;
  item_price: number;
  products: ProductInOrder | null;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  order_items: OrderItem[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const router = useRouter();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deletingOrderName, setDeletingOrderName] = useState<string>('');

  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [closingOrderName, setClosingOrderName] = useState<string>('');

  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      console.log('Dashboard fetchOrders: Token from localStorage:', token ? 'Present' : 'Missing');
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Dashboard fetchOrders: Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to fetch orders.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Failed to fetch orders. Status: ${response.status} ${response.statusText}`;
        }
        console.error('Fetch Orders API Error:', errorMessage);
        toast({
          title: 'Error al cargar órdenes',
          description: `No se pudieron cargar las órdenes: ${errorMessage}`,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Sort orders by created_at in descending order
      const sortedData = data.sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log('Fetched and sorted orders data:', sortedData);
      setOrders(sortedData);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(`No se pudieron cargar las órdenes: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica de Notificaciones Push ---
  const requestNotificationPermissionAndSubscribe = async () => {
    console.log('requestNotificationPermissionAndSubscribe: Iniciando solicitud de permiso de notificación.');
    try {
      let permission = Notification.permission;
      console.log('requestNotificationPermissionAndSubscribe: Permiso de notificación actual:', permission);

      // Solo solicitar si no está 'granted'
      if (permission !== 'granted') {
        console.log(`requestNotificationPermissionAndSubscribe: Permiso no concedido (${permission}). Intentando solicitar...`);
        permission = await Notification.requestPermission();
        console.log('requestNotificationPermissionAndSubscribe: Nuevo estado del permiso de notificación después de la solicitud:', permission);
      }

      if (permission === 'granted') {
        console.log('requestNotificationPermissionAndSubscribe: Permiso de notificación concedido. Procediendo con la suscripción...');

        if ('serviceWorker' in navigator) {
          console.log('requestNotificationPermissionAndSubscribe: Navegador soporta Service Workers.');
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('requestNotificationPermissionAndSubscribe: Service Worker registrado con éxito:', registration);

          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            console.log('requestNotificationPermissionAndSubscribe: Ya existe una suscripción. Reutilizando:', existingSubscription);
            await sendSubscriptionToServer(existingSubscription);
          } else {
            console.log('requestNotificationPermissionAndSubscribe: No hay suscripción existente. Creando nueva...');
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });
            console.log('requestNotificationPermissionAndSubscribe: Nueva Suscripción Push obtenida:', subscription);
            await sendSubscriptionToServer(subscription);
          }

        } else {
          console.warn('requestNotificationPermissionAndSubscribe: El navegador no soporta Service Workers.');
        }
      } else {
        console.warn('requestNotificationPermissionAndSubscribe: Permiso de notificación denegado o no concedido por el usuario. Las notificaciones no funcionarán.');
        // Aquí podrías mostrar un mensaje al usuario para que habilite las notificaciones manualmente
      }
    } catch (err) {
      console.error('requestNotificationPermissionAndSubscribe: Error al solicitar permiso o suscribirse a notificaciones push:', err);
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('sendSubscriptionToServer: No hay token de autenticación disponible. No se enviará la suscripción push al servidor.');
      return;
    }

    console.log('sendSubscriptionToServer: Enviando suscripción al servidor...');
    try {
      const response = await fetch('/api/subscribe-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        console.log('sendSubscriptionToServer: Suscripción enviada al servidor con éxito.');
      } else {
        const errorData = await response.json();
        console.error('sendSubscriptionToServer: Error al enviar suscripción al servidor:', errorData.error || response.statusText);
      }
    } catch (err) {
      console.error('sendSubscriptionToServer: Error de red al enviar suscripción al servidor:', err);
    }
  };
  // --- Fin Lógica de Notificaciones Push ---


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrders();
    // Llama a la función para solicitar permiso y suscribirse después de la autenticación
    requestNotificationPermissionAndSubscribe();
  }, [router]);

  const openCloseConfirm = (id: string) => {
    setClosingOrderId(id);
    setClosingOrderName(`Orden #${String(id).substring(0, 8)}...`);
    setIsCloseConfirmOpen(true);
  };

  const handleConfirmCloseOrder = async () => {
    if (closingOrderId === null) return;

    try {
      console.log('handleConfirmCloseOrder - Closing order ID:', closingOrderId);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`/api/orders/${closingOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'closed' }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to close order';
        toast({
          title: 'Error al cerrar orden',
          description: errorMessage,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorMessage);
      }

      // Actualizar el estado de las órdenes localmente
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === closingOrderId ? { ...order, status: 'closed' } : order
        )
      );

      setIsCloseConfirmOpen(false);
      setClosingOrderId(null);
      setClosingOrderName('');
    } catch (err) {
      console.error('Error closing order:', err);
      setError(`Error al cerrar orden: ${err instanceof Error ? err.message : String(err)}`);
      setIsCloseConfirmOpen(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    console.log('openDeleteConfirm - Order ID:', id);
    setDeletingOrderId(id);
    setDeletingOrderName(`Orden #${String(id).substring(0, 8)}...`);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (deletingOrderId === null) return;

    console.log('Attempting to delete order with ID:', deletingOrderId);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${deletingOrderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Delete response status:', response.status);

      if (response.status === 204) {
        setOrders((prev) => prev.filter((o) => o.id !== deletingOrderId));
        setIsDeleteConfirmOpen(false);
        setDeletingOrderId(null);
        setDeletingOrderName('');
        toast({
          title: 'Orden Eliminada',
          description: `La orden "${deletingOrderName}" ha sido eliminada con éxito.`,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
      } else if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (e: any) {
          if (response.status >= 200 && response.status < 300) {
            setOrders((prev) => prev.filter((o) => o.id !== deletingOrderId));
            setIsDeleteConfirmOpen(false);
            setDeletingOrderId(null);
            setDeletingOrderName('');
            toast({
              title: 'Orden Eliminada',
              description: `La orden "${deletingOrderName}" ha sido eliminada con éxito.`,
              variant: 'destructive',
              icon: <XCircle className="h-5 w-5" />,
            });
            return;
          }
          throw new Error(`Failed to parse response JSON: ${e.message}`);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        fetchOrders();
        setIsDeleteConfirmOpen(false);
        setDeletingOrderId(null);
        setDeletingOrderName('');
        toast({
          title: 'Orden Eliminada',
          description: `La orden "${deletingOrderName}" ha sido eliminada con éxito.`,
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { error: `Failed to delete order. Status: ${response.status} ${response.statusText}` };
        }
        toast({
          title: 'Error al eliminar orden',
          description: errorData.error || 'Hubo un problema al eliminar la orden.',
          variant: 'destructive',
          icon: <XCircle className="h-5 w-5" />,
        });
        throw new Error(errorData.error || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(`Error al eliminar orden: ${err instanceof Error ? err.message : String(err)}`);
      setIsCloseConfirmOpen(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order =>
      order.id.toString().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.total.toString().includes(searchTerm) ||
      order.order_items.some(item => item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? filteredOrders.length : parseInt(value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <p>Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Gestión de Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <Input
                placeholder="Buscar órdenes..."
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
            {currentOrders.length === 0 && !loading && !error ? (
              <p className="text-center text-gray-500">No hay órdenes disponibles que coincidan con la búsqueda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.map((order, idx) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {order.order_items.map((item, itemIdx) => (
                          <div key={itemIdx}>
                            {item.products?.name || 'Producto Desconocido'} (x{item.quantity}) - ${(item.item_price || 0).toFixed(2)} c/u
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {order.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === 'open' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openCloseConfirm(order.id)}
                                className="mr-2"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="sr-only">Cerrar Orden</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cerrar orden</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(order.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Eliminar Orden</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar orden</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {filteredOrders.length > itemsPerPage && itemsPerPage !== filteredOrders.length && (
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

        <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
          <AlertDialogContent aria-describedby="close-order-description">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro de cerrar la orden?</AlertDialogTitle>
              <AlertDialogDescription id="close-order-description">
                Esta acción marcará la <span className="font-semibold">{closingOrderName}</span> como cerrada. No se podrán añadir más productos a esta orden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsCloseConfirmOpen(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCloseOrder}>Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DeleteConfirmationDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteOrder}
          itemName={deletingOrderName}
          itemType="orden"
        />
      </div>
    </TooltipProvider>
  );
}
