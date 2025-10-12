import { AppointmentRepository } from '../repositories/index.js';
import { Appointment, AppointmentAnalytics, QueryFilters, ApiResponse } from '../types/index.js';
export declare class AppointmentService {
    private appointmentRepository;
    constructor(appointmentRepository: AppointmentRepository);
    getAllAppointments(filters: QueryFilters): Promise<ApiResponse<Appointment[]>>;
    createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment>;
    updateAppointment(id: number, appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment>;
    deleteAppointment(id: number): Promise<{
        success: boolean;
    }>;
    getLast7DaysAnalytics(): Promise<{
        data: AppointmentAnalytics[];
    }>;
    getLast7DaysAnalyticsByType(): Promise<{
        data: Record<string, AppointmentAnalytics[]>;
    }>;
}
