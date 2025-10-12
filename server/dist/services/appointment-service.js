export class AppointmentService {
    constructor(appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }
    async getAllAppointments(filters) {
        try {
            const appointments = await this.appointmentRepository.findAll(filters);
            return {
                data: appointments,
                total: appointments.length
            };
        }
        catch (error) {
            console.error('Error fetching appointments:', error);
            throw new Error('Internal server error');
        }
    }
    async createAppointment(appointmentData) {
        try {
            return await this.appointmentRepository.create(appointmentData);
        }
        catch (error) {
            console.error('Error creating appointment:', error);
            throw new Error('Internal server error');
        }
    }
    async updateAppointment(id, appointmentData) {
        try {
            const updatedAppointment = await this.appointmentRepository.update(id, appointmentData);
            if (!updatedAppointment) {
                throw new Error('Appointment not found');
            }
            return updatedAppointment;
        }
        catch (error) {
            console.error('Error updating appointment:', error);
            if (error instanceof Error && error.message === 'Appointment not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async deleteAppointment(id) {
        try {
            const deleted = await this.appointmentRepository.delete(id);
            if (!deleted) {
                throw new Error('Appointment not found');
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting appointment:', error);
            if (error instanceof Error && error.message === 'Appointment not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async getLast7DaysAnalytics() {
        try {
            const analytics = await this.appointmentRepository.getLast7DaysAnalytics();
            return { data: analytics };
        }
        catch (error) {
            console.error('Error fetching appointments analytics:', error);
            throw new Error('Internal server error');
        }
    }
    async getLast7DaysAnalyticsByType() {
        try {
            const analytics = await this.appointmentRepository.getLast7DaysAnalyticsByType();
            return { data: analytics };
        }
        catch (error) {
            console.error('Error fetching appointments analytics by type:', error);
            throw new Error('Internal server error');
        }
    }
}
