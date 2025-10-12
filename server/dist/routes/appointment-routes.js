import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
export function createAppointmentRoutes(appointmentService) {
    const router = Router();
    router.get('/', authenticateToken, async (req, res) => {
        try {
            const filters = {
                search: req.query.search,
                status: req.query.status,
                type: req.query.type,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await appointmentService.getAllAppointments(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error in get appointments route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.post('/', authenticateToken, async (req, res) => {
        try {
            const { client, type, status, scheduled_datetime, description, answered } = req.body;
            const appointment = await appointmentService.createAppointment({
                client,
                type,
                status,
                scheduled_datetime,
                description,
                answered
            });
            res.json(appointment);
        }
        catch (error) {
            console.error('Error in create appointment route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { client, type, status, scheduled_datetime, description, answered } = req.body;
            const appointment = await appointmentService.updateAppointment(id, {
                client,
                type,
                status,
                scheduled_datetime,
                description,
                answered
            });
            res.json(appointment);
        }
        catch (error) {
            console.error('Error in update appointment route:', error);
            if (error instanceof Error && error.message === 'Appointment not found') {
                res.status(404).json({ error: 'Appointment not found' });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const result = await appointmentService.deleteAppointment(id);
            res.json(result);
        }
        catch (error) {
            console.error('Error in delete appointment route:', error);
            if (error instanceof Error && error.message === 'Appointment not found') {
                res.status(404).json({ error: 'Appointment not found' });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Analytics routes
    router.get('/analytics/last-7-days', authenticateToken, async (req, res) => {
        try {
            const result = await appointmentService.getLast7DaysAnalytics();
            res.json(result);
        }
        catch (error) {
            console.error('Error in appointments analytics route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.get('/analytics/by-type/last-7-days', authenticateToken, async (req, res) => {
        try {
            const result = await appointmentService.getLast7DaysAnalyticsByType();
            res.json(result);
        }
        catch (error) {
            console.error('Error in appointments analytics by type route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    return router;
}
