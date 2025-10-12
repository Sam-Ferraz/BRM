import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
export function createClientRoutes(clientService) {
    const router = Router();
    router.get('/', authenticateToken, async (req, res) => {
        try {
            const filters = {
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await clientService.getAllClients(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error in get clients route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.post('/', authenticateToken, async (req, res) => {
        try {
            const { name, email, phone, city, address, company, origin } = req.body;
            const client = await clientService.createClient({ name, email, phone, city, address, company, origin });
            res.json(client);
        }
        catch (error) {
            console.error('Error in create client route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { name, email, phone, city, address, company, origin } = req.body;
            const client = await clientService.updateClient(id, { name, email, phone, city, address, company, origin });
            res.json(client);
        }
        catch (error) {
            console.error('Error in update client route:', error);
            if (error instanceof Error && error.message === 'Client not found') {
                res.status(404).json({ error: 'Client not found' });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const result = await clientService.deleteClient(id);
            res.json(result);
        }
        catch (error) {
            console.error('Error in delete client route:', error);
            if (error instanceof Error && error.message === 'Client not found') {
                res.status(404).json({ error: 'Client not found' });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    return router;
}
