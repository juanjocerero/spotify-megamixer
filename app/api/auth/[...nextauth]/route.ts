// /app/api/auth/[...nextauth]/route.ts

// 1. Importa el objeto 'handlers' que sí existe en @/auth
import { handlers } from "@/auth";

// 2. Desestructura 'handlers' para exportar sus propiedades GET y POST
export const { GET, POST } = handlers;

export const maxDuration = 30;