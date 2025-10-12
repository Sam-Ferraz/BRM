import { Router } from 'express';
import { DashboardService, AppointmentService } from '../services/index.js';
export declare function createDashboardRoutes(dashboardService: DashboardService, appointmentService: AppointmentService): Router;
