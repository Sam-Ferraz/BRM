export class SalesAgendaService {
    constructor(salesAgendaRepository) {
        this.salesAgendaRepository = salesAgendaRepository;
    }
    async getAllSalesAgenda(filters) {
        try {
            const salesAgenda = await this.salesAgendaRepository.findAll(filters);
            return {
                data: salesAgenda,
                total: salesAgenda.length
            };
        }
        catch (error) {
            console.error('Error fetching sales agenda:', error);
            throw new Error('Internal server error');
        }
    }
    async createSalesAgenda(salesAgendaData) {
        try {
            // Validate required fields
            if (!salesAgendaData.product_name) {
                throw new Error('Product name is required');
            }
            return await this.salesAgendaRepository.create(salesAgendaData);
        }
        catch (error) {
            console.error('Error creating sales agenda:', error);
            if (error instanceof Error && error.message === 'Product name is required') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async updateSalesAgenda(id, salesAgendaData) {
        try {
            // Validate required fields
            if (!salesAgendaData.product_name) {
                throw new Error('Product name is required');
            }
            const updatedSalesAgenda = await this.salesAgendaRepository.update(id, salesAgendaData);
            if (!updatedSalesAgenda) {
                throw new Error('Sales agenda not found');
            }
            return updatedSalesAgenda;
        }
        catch (error) {
            console.error('Error updating sales agenda:', error);
            if (error instanceof Error && (error.message === 'Sales agenda not found' || error.message === 'Product name is required')) {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async deleteSalesAgenda(id) {
        try {
            const deleted = await this.salesAgendaRepository.delete(id);
            if (!deleted) {
                throw new Error('Sales agenda not found');
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting sales agenda:', error);
            if (error instanceof Error && error.message === 'Sales agenda not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
}
