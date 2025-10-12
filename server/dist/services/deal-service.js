export class DealService {
    constructor(dealRepository) {
        this.dealRepository = dealRepository;
    }
    async getAllDeals(filters) {
        try {
            const deals = await this.dealRepository.findAll(filters);
            return {
                data: deals,
                total: deals.length
            };
        }
        catch (error) {
            console.error('Error fetching deals:', error);
            throw new Error('Internal server error');
        }
    }
    async createDeal(dealData) {
        try {
            return await this.dealRepository.create(dealData);
        }
        catch (error) {
            console.error('Error creating deal:', error);
            throw new Error('Internal server error');
        }
    }
    async updateDeal(id, dealData) {
        try {
            const updatedDeal = await this.dealRepository.update(id, dealData);
            if (!updatedDeal) {
                throw new Error('Deal not found');
            }
            return updatedDeal;
        }
        catch (error) {
            console.error('Error updating deal:', error);
            if (error instanceof Error && error.message === 'Deal not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async deleteDeal(id) {
        try {
            const deleted = await this.dealRepository.delete(id);
            if (!deleted) {
                throw new Error('Deal not found');
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting deal:', error);
            if (error instanceof Error && error.message === 'Deal not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
}
