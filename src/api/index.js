import { authService } from './authService';
import { usersService } from './usersService';
import { academicsService } from './academicsService';
import { teachingAssignmentsService } from './teachingAssignmentsService';
import { studentsService } from './studentsService';
import { behaviorService } from './behaviorService';
import { homeworkService } from './homeworkService';
import { announcementsService } from './announcementsService';
import { requestsService } from './requestsService';
import { appointmentsService } from './appointmentsService';
import { financeService } from './financeService';
import { gradesService } from './gradesService';
import { auditLogService } from './auditLogService';
import { attendanceService } from './attendanceService';
import { dashboardService } from './dashboardService';

export const api = {
  auth: authService,
  users: usersService,
  academics: academicsService,
  teachingAssignments: teachingAssignmentsService,
  students: studentsService,
  behavior: behaviorService,
  homework: homeworkService,
  announcements: announcementsService,
  requests: requestsService,
  appointments: appointmentsService,
  finance: financeService,
  grades: gradesService,
  auditLogs: auditLogService,
  attendance: attendanceService,
  dashboard: dashboardService,
};


