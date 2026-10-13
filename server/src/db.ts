import { PrismaClient } from '@prisma/client';

export const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') ?? false;

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

/**
 * Generates a case-insensitive string filter compatible with both PostgreSQL and SQLite.
 * On PostgreSQL, uses { contains: text, mode: 'insensitive' }.
 * On SQLite, uses { contains: text } (SQLite LIKE is case-insensitive for ASCII by default).
 */
export function containsFilter(query: string) {
  if (isPostgres) {
    return { contains: query, mode: 'insensitive' as const };
  }
  return { contains: query };
}
