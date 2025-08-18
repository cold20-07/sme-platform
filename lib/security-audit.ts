/**
 * Security audit logging utilities
 * Tracks security events and potential threats
 */

import { createClient } from './supabase';

export interface SecurityEvent {
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class SecurityAudit {
  private static client = createClient();

  /**
   * Log a security event to the audit trail
   */
  static async logEvent(event: SecurityEvent): Promise<void> {
    try {
      const { data, error } = await this.client.rpc('log_security_event', {
        p_action: event.action,
        p_resource_type: event.resourceType,
        p_resource_id: event.resourceId || null,
        p_ip_address: event.ipAddress || null,
        p_user_agent: event.userAgent || null,
        p_success: event.success,
        p_error_message: event.errorMessage || null,
        p_metadata: event.metadata || null,
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    action: 'login' | 'logout' | 'signup' | 'password_reset' | 'token_refresh',
    success: boolean,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      resourceType: 'auth',
      success,
      errorMessage,
      metadata,
    });
  }

  /**
   * Log data access events
   */
  static async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      action: `data_${action}`,
      resourceType,
      resourceId,
      success,
      errorMessage,
    });
  }

  /**
   * Log security violations
   */
  static async logSecurityViolation(
    violationType: 'csrf_failure' | 'rate_limit_exceeded' | 'unauthorized_access' | 'invalid_input' | 'suspicious_activity',
    details: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: 'security_violation',
      resourceType: violationType,
      success: false,
      errorMessage: details,
      metadata,
    });
  }

  /**
   * Log admin actions
   */
  static async logAdminAction(
    action: string,
    resourceType: string,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      action: `admin_${action}`,
      resourceType,
      resourceId,
      success,
      errorMessage,
      metadata: { admin_action: true },
    });
  }

  /**
   * Get security audit logs (admin only)
   */
  static async getAuditLogs(
    filters?: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ) {
    try {
      let query = this.client
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious patterns in audit logs
   */
  static async detectSuspiciousActivity(userId?: string): Promise<{
    suspiciousPatterns: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      count: number;
      lastOccurrence: Date;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const logs = await this.getAuditLogs({
        userId,
        startDate,
        endDate,
        limit: 1000,
      });

      const patterns: Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        count: number;
        lastOccurrence: Date;
      }> = [];

      // Analyze patterns
      const failedLogins = logs.filter(log => 
        log.action === 'login' && !log.success
      );

      if (failedLogins.length > 5) {
        patterns.push({
          type: 'multiple_failed_logins',
          description: `${failedLogins.length} failed login attempts in the last 24 hours`,
          severity: failedLogins.length > 10 ? 'high' : 'medium',
          count: failedLogins.length,
          lastOccurrence: new Date(failedLogins[0].created_at),
        });
      }

      const securityViolations = logs.filter(log => 
        log.action === 'security_violation'
      );

      if (securityViolations.length > 0) {
        patterns.push({
          type: 'security_violations',
          description: `${securityViolations.length} security violations detected`,
          severity: 'high',
          count: securityViolations.length,
          lastOccurrence: new Date(securityViolations[0].created_at),
        });
      }

      // Check for unusual access patterns
      const dataAccess = logs.filter(log => 
        log.action.startsWith('data_')
      );

      const uniqueResources = new Set(dataAccess.map(log => log.resource_id));
      if (uniqueResources.size > 50) {
        patterns.push({
          type: 'excessive_data_access',
          description: `Access to ${uniqueResources.size} different resources in 24 hours`,
          severity: 'medium',
          count: uniqueResources.size,
          lastOccurrence: new Date(dataAccess[0].created_at),
        });
      }

      return { suspiciousPatterns: patterns };
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return { suspiciousPatterns: [] };
    }
  }
}