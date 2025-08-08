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
import { UserFormDialog } from '@/components/user-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { UserCreateForm } from '@/components/user-create-form';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
id: number;
username: string;
role: string;
created_at: string;
}

export default function UsersPage() {
const [users, setUsers] = useState<User[]>([]);
const [error, setError] = useState('');
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(5);
const router = useRouter();

const [isEditModalOpen, setIsEditModal] = useState(false);
const [editingUser, setEditingUser] = useState<User | null>(null);
const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
const [deletingUsername, setDeletingUsername] = useState<string>('');

const { toast } = useToast();

const fetchUsers = async () => {
setError('');
try {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let errorMessage = 'Failed to fetch users.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to fetch users. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Fetch Users API Error:', errorMessage);
    toast({
      title: 'Error al cargar usuarios',
      description: `No se pudieron cargar los usuarios: ${errorMessage}`,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
  const data = await response.json();
  setUsers(data);
} catch (err) {
  console.error('Error fetching users in component:', err);
  setError(`No se pudieron cargar los usuarios: ${err instanceof Error ? err.message : String(err)}`);
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

fetchUsers();
}, [router]);

const handleCreateUser = async (userData: { username: string; password?: string; role: string }) => {
try {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create user';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to create user. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Create User API Error:', errorMessage);
    toast({
      title: 'Error al crear usuario',
      description: errorMessage,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
  fetchUsers();
  console.log('Calling toast for user creation:', { title: 'Usuario Creado', description: `El usuario "${userData.username}" ha sido creado con éxito.` });
  toast({
    title: 'Usuario Creado',
    description: `El usuario "${userData.username}" ha sido creado con éxito.`,
    variant: 'dark',
    icon: <CheckCircle className="h-5 w-5" />,
  });
} catch (err: any) {
  console.error('Error creating user in component:', err);
  throw err;
}
};

const handleEditUser = async (userData: { id: number; username: string; password?: string; role: string }) => {
try {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/users/${userData.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  if (response.status === 204 || response.ok) {
    fetchUsers();
    setIsEditModal(false);
    setEditingUser(null);
    console.log('Calling toast for user update:', { title: 'Usuario Actualizado', description: `El usuario "${userData.username}" ha sido actualizado con éxito.` });
    toast({
      title: 'Usuario Actualizado',
      description: `El usuario "${userData.username}" ha sido actualizado con éxito.`,
      variant: 'dark',
      icon: <CheckCircle className="h-5 w-5" />,
    });
  } else {
    let errorMessage = 'Failed to update user';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (jsonError) {
      errorMessage = `Failed to update user. Status: ${response.status} ${response.statusText}`;
    }
    console.error('Update User API Error:', errorMessage);
    toast({
      title: 'Error al actualizar usuario',
      description: errorMessage,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorMessage);
  }
} catch (err: any) {
  console.error('Error updating user in component:', err);
  throw err;
}
};

const handleDeleteUser = async () => {
if (deletingUserId === null) return;
try {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/users/${deletingUserId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (response.status === 204 || response.ok) {
    setUsers((prev) => prev.filter((u) => u.id !== deletingUserId));
    setIsDeleteConfirmOpen(false);
    setDeletingUserId(null);
    setDeletingUsername('');
    console.log('Calling toast for user deletion:', { title: 'Usuario Eliminado', description: `El usuario "${deletingUsername}" ha sido eliminado con éxito.` });
    toast({
      title: 'Usuario Eliminado',
      description: `El usuario "${deletingUsername}" ha sido eliminado con éxito.`,
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
  } else {
    let errorData;
    try {
      errorData = await response.json();
    } catch (jsonError) {
      errorData = { error: `Failed to delete user. Status: ${response.status} ${response.statusText}` };
    }
    console.error('Delete User API Error:', errorData.error || 'Unknown error during delete');
    toast({
      title: 'Error al eliminar usuario',
      description: errorData.error || 'Hubo un problema al eliminar el usuario.',
      variant: 'destructive',
      icon: <XCircle className="h-5 w-5" />,
    });
    throw new Error(errorData.error || 'Failed to delete user');
  }
} catch (err: any) {
  console.error('Error deleting user in component:', err);
  setError(`Error al eliminar usuario: ${err.message}`);
  setIsDeleteConfirmOpen(false);
}
};

const openEditModal = (user: User) => {
setEditingUser(user);
setIsEditModal(true);
};

const openDeleteConfirm = (id: number, username: string) => {
setDeletingUserId(id);
setDeletingUsername(username);
setIsDeleteConfirmOpen(true);
};

const filteredUsers = useMemo(() => {
return users.filter(user =>
  user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
  user.role.toLowerCase().includes(searchTerm.toLowerCase())
);
}, [users, searchTerm]);

const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
const currentUsers = useMemo(() => {
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
return filteredUsers.slice(startIndex, endIndex);
}, [filteredUsers, currentPage, itemsPerPage]);

const handlePageChange = (page: number) => {
if (page > 0 && page <= totalPages) {
  setCurrentPage(page);
}
};

const handleItemsPerPageChange = (value: string) => {
setItemsPerPage(value === 'all' ? filteredUsers.length : parseInt(value));
setCurrentPage(1);
};

return (
<TooltipProvider>
<div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card className="lg:col-span-1">
    <CardHeader>
      <CardTitle className="text-xl font-bold">Crear Nuevo Usuario</CardTitle>
    </CardHeader>
    <CardContent>
      <UserCreateForm onSave={handleCreateUser} />
    </CardContent>
  </Card>

  <Card className="lg:col-span-2">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-2xl font-bold">Gestión de Usuarios</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <Input
          placeholder="Buscar usuarios..."
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
      {currentUsers.length === 0 ? (
        <p className="text-center text-gray-500">No hay usuarios disponibles que coincidan con la búsqueda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {currentUsers.map((user, idx) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Administrador' : 'Mesero'}
                </span>
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(user)}
                      className="mr-2"
                    >
                      <Pencil className="h-4 w-4 text-green-600" />
                      <span className="sr-only">Editar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar usuario</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteConfirm(user.id, user.username)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Eliminar usuario</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}

    {filteredUsers.length > itemsPerPage && itemsPerPage !== filteredUsers.length && (
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

{editingUser && (
  <UserFormDialog
    isOpen={isEditModalOpen}
    onClose={() => setIsEditModal(false)}
    onSave={handleEditUser}
    initialData={editingUser}
    isEdit={true}
  />
)}

<DeleteConfirmationDialog
  isOpen={isDeleteConfirmOpen}
  onClose={() => setIsDeleteConfirmOpen(false)}
  onConfirm={handleDeleteUser}
  itemName={deletingUsername}
  itemType="usuario"
/>
</div>
</TooltipProvider>
);
}
