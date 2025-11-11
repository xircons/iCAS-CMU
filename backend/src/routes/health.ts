import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    res.json({
      success: true,
      message: 'API is healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API is unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

