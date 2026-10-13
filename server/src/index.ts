import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import shopRoutes from './routes/shop';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import posRoutes from './routes/pos';
import billRoutes from './routes/bills';
import customerRoutes from './routes/customers';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';
import backupRoutes from './routes/backup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow frontend dev server and network mobile devices
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'KiranaMate Backend API',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

// Static Client Serving (for unified full-stack deployment)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 Handler for API
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `API route ${req.method} ${req.url} not found.` });
});

// Global Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`KiranaMate API server listening on http://localhost:${PORT}`);
});
