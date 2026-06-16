import 'dotenv/config';
import crypto from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import pg from 'pg';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

const { Pool } = pg;
const app: Express = express();
const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and set it to your Lynq database URL.');
}

const pool = new Pool({ connectionString: DATABASE_URL });

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', res.locals.requestId);
  next();
});
app.use((req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Rate limit exceeded', requestId: res.locals.requestId });
    return;
  }
  bucket.count += 1;
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use((req, res, next) => {
  if (!API_BEARER_TOKEN) {
    next();
    return;
  }
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token !== API_BEARER_TOKEN) {
    res.status(401).json({ error: 'Unauthorized', requestId: res.locals.requestId });
    return;
  }
  next();
});

app.get('/health', async (_req: Request, res: Response) => {
  await pool.query('select 1');
  res.json({ status: 'ok', service: 'lynq-generated-backend' });
});

function pickAllowed(input: unknown, allowedFields: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      data[field] = (input as Record<string, unknown>)[field];
    }
  }
  return data;
}

async function insertRow(tableName: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const quotedColumns = columns.map(quoteIdent).join(', ');
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  try {
    const result = await pool.query(
      `INSERT INTO ${quoteIdent(tableName)} (${quotedColumns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      throw new HttpError(409, `${tableName} record already exists`);
    }
    throw error;
  }
}

async function updateRow(
  tableName: string,
  primaryKey: string,
  id: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const assignments = columns.map((column, index) => `${quoteIdent(column)} = $${index + 1}`).join(', ');
  const result = await pool.query(
    `UPDATE ${quoteIdent(tableName)} SET ${assignments} WHERE ${quoteIdent(primaryKey)} = $${columns.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] || null;
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

// categories
app.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT "id", "name" FROM "categories" ORDER BY "id" DESC LIMIT 100');
  res.json(result.rows);
}));

app.post('/categories', asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = ["name"];
  const data = pickAllowed(req.body, allowedFields);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No writable fields provided' });
    return;
  }
  const record = await insertRow('categories', data);
  res.status(201).json(record);
}));

app.get('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT "id", "name" FROM "categories" WHERE "id" = $1', [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'categories record not found' });
    return;
  }
  res.json(result.rows[0]);
}));

app.put('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = ["name"];
  const data = pickAllowed(req.body, allowedFields);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No writable fields provided' });
    return;
  }
  const record = await updateRow('categories', 'id', req.params.id, data);
  if (!record) {
    res.status(404).json({ error: 'categories record not found' });
    return;
  }
  res.json(record);
}));

app.delete('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('DELETE FROM "categories" WHERE "id" = $1 RETURNING "id"', [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'categories record not found' });
    return;
  }
  res.json({ success: true, id: result.rows[0]['id'] });
}));

// products
app.get('/products', asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT "id", "name", "price" FROM "products" ORDER BY "id" DESC LIMIT 100');
  res.json(result.rows);
}));

app.post('/products', asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = ["name","price"];
  const data = pickAllowed(req.body, allowedFields);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No writable fields provided' });
    return;
  }
  const record = await insertRow('products', data);
  res.status(201).json(record);
}));

app.get('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT "id", "name", "price" FROM "products" WHERE "id" = $1', [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'products record not found' });
    return;
  }
  res.json(result.rows[0]);
}));

app.put('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = ["name","price"];
  const data = pickAllowed(req.body, allowedFields);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No writable fields provided' });
    return;
  }
  const record = await updateRow('products', 'id', req.params.id, data);
  if (!record) {
    res.status(404).json({ error: 'products record not found' });
    return;
  }
  res.json(record);
}));

app.delete('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('DELETE FROM "products" WHERE "id" = $1 RETURNING "id"', [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'products record not found' });
    return;
  }
  res.json({ success: true, id: result.rows[0]['id'] });
}));


app.use((err: unknown, _req: Request, res: Response, _next: unknown) => {
  const requestId = res.locals.requestId || crypto.randomUUID();
  console.error({ requestId, err });
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof Error && statusCode < 500 ? err.message : 'Internal server error';
  res.status(statusCode).json({ error: message, requestId });
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Lynq generated backend listening on http://localhost:${PORT}`);
  });
}

export default app;
