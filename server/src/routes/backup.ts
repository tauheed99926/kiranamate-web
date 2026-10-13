import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const dbPath = path.resolve(__dirname, '../../data/kiranamate.db');
const upload = multer({ dest: path.resolve(__dirname, '../../data/uploads/') });

// Download backup copy of database
router.get('/download', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `kiranamate-backup-${timestamp}.db`;

    res.download(dbPath, filename, (err) => {
      if (err) {
        console.error('Backup download error:', err);
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Restore database safely from uploaded SQLite file
router.post('/restore', upload.single('dbFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const uploadedPath = req.file.path;

    // Safety verification: check SQLite header magic bytes (16 bytes: "SQLite format 3\0")
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(uploadedPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    const header = buffer.toString('utf-8');
    if (!header.startsWith('SQLite format 3')) {
      fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. The uploaded file is not a valid SQLite database.',
      });
    }

    // Create automatic safety backup of current database before restoring
    if (fs.existsSync(dbPath)) {
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackupPath = path.resolve(__dirname, `../../data/kiranamate.db.pre-restore-${backupTimestamp}`);
      fs.copyFileSync(dbPath, safetyBackupPath);
    }

    // Replace current database with uploaded file
    fs.copyFileSync(uploadedPath, dbPath);
    fs.unlinkSync(uploadedPath); // remove temp file

    res.json({
      success: true,
      message: 'Database restored successfully! A safety backup of your previous data was saved.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
