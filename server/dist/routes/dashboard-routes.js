import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
export function createDashboardRoutes(dashboardService, appointmentService) {
    const router = Router();
    router.get('/stats', authenticateToken, async (req, res) => {
        try {
            const stats = await dashboardService.getDashboardStats();
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    return router;
}
