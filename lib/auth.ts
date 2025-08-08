import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

// Clave secreta para JWT (¡cambia esto por una cadena aleatoria y segura en producción!)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

interface CustomJwtPayload extends JwtPayload {
id: string;
username: string;
role: string;
}

export const authenticateToken = (request: NextRequest) => {
const authHeader = request.headers.get('authorization');
const token = authHeader && authHeader.split(' ')[1];

if (token == null) {
  return { authenticated: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
}

try {
  const user = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
  return { authenticated: true, user };
} catch (err) {
  return { authenticated: false, response: NextResponse.json({ error: 'Token inválido' }, { status: 403 }) };
}
};

export const authorizeRole = (user: CustomJwtPayload, roles: string[]) => {
if (!user || !roles.includes(user.role)) {
  return { authorized: false, response: NextResponse.json({ error: 'Acceso denegado. No tienes los permisos necesarios.' }, { status: 403 }) };
}
return { authorized: true };
};

export { JWT_SECRET, type CustomJwtPayload };
