import { BaseRepository } from './base-repository.js';
import { Appointment, AppointmentAnalytics, QueryFilters } from '../types/index.js';
export declare class AppointmentRepository extends BaseRepository {
    findAll(filters?: QueryFilters): Promise<Appointment[]>;
    create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment>;
    update(id: number, appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null>;
    delete(id: number): Promise<boolean>;
    getCount(): Promise<number>;
    getLast7DaysAnalytics(): Promise<AppointmentAnalytics[]>;
    getLast7DaysAnalyticsByType(): Promise<Record<string, AppointmentAnalytics[]>>;
}
