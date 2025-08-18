/**
 * Security features demonstration component
 */

'use client';

import React, { useState } from 'react';
import { SecureForm, SecureInput, SecureTextarea } from '@/components/ui/secure-form';
import { useSecurityContext } from '@/lib/security-context';
import { SecurityAudit } from '@/lib/security-audit';
import { InputSanitizer } from '@/lib/security-validation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SecurityDemo() {
  const { csrfToken, isSecureContext } = useSecurityContext();
  const [sanitizedText, setSanitizedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const handleTextSanitization = () => {
    const sanitized = InputSanitizer.sanitizeText(originalText);
    setSanitizedText(sanitized);
  };

  const handleSecureSubmit = async (formData: FormData) => {
    try {
      // Log the form submission
      await SecurityAudit.logEvent({
        action: 'form_submission',
        resourceType: 'security_demo',
        success: true,
        metadata: {
          formFields: Array.from(formData.keys()),
        },
      });

      alert('Form submitted securely!');
    } catch (error) {
      console.error('Secure form submission error:', error);
      
      await SecurityAudit.logEvent({
        action: 'form_submission',
        resourceType: 'security_demo',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await SecurityAudit.getAuditLogs({
        action: 'form_submission',
        limit: 10,
      });
      setAuditLogs(logs || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const testSuspiciousActivity = async () => {
    try {
      const result = await SecurityAudit.detectSuspiciousActivity();
      alert(`Found ${result.suspiciousPatterns.length} suspicious patterns`);
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Security Features Demo</h1>
        
        {/* Security Status */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Security Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert>
              <AlertDescription>
                <strong>CSRF Token:</strong> {csrfToken ? '✅ Active' : '❌ Not Available'}
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <strong>Secure Context:</strong> {isSecureContext ? '✅ HTTPS' : '⚠️ HTTP'}
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Input Sanitization Demo */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Input Sanitization Demo</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Enter text with potential XSS (try: &lt;script&gt;alert('xss')&lt;/script&gt;Hello):
              </label>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="<script>alert('xss')</script>Hello World"
              />
            </div>
            <Button onClick={handleTextSanitization}>
              Sanitize Text
            </Button>
            {sanitizedText && (
              <div>
                <label className="block text-sm font-medium mb-2">Sanitized Output:</label>
                <div className="bg-gray-100 p-3 rounded border">
                  <strong>Original:</strong> {originalText}<br />
                  <strong>Sanitized:</strong> {sanitizedText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secure Form Demo */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Secure Form Demo</h2>
          <SecureForm
            action="/api/demo-submit"
            onSubmit={handleSecureSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">Name:</label>
              <SecureInput
                name="name"
                type="text"
                required
                allowedChars={/^[a-zA-Z\s'-]*$/}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Email:</label>
              <SecureInput
                name="email"
                type="email"
                required
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Message:</label>
              <SecureTextarea
                name="message"
                required
                rows={4}
                className="w-full"
                allowHtml={false}
              />
            </div>
          </SecureForm>
        </div>

        {/* Security Audit Demo */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Security Audit Demo</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={loadAuditLogs}>
                Load Recent Audit Logs
              </Button>
              <Button onClick={testSuspiciousActivity} variant="outline">
                Check Suspicious Activity
              </Button>
            </div>
            
            {auditLogs.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Recent Audit Logs:</h3>
                <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="mb-2 text-sm">
                      <strong>{log.action}</strong> - {log.resource_type} 
                      {log.success ? ' ✅' : ' ❌'}
                      <span className="text-gray-500 ml-2">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Headers Info */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Security Headers</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-sm text-gray-600 mb-2">
              This application includes the following security headers:
            </p>
            <ul className="text-sm space-y-1">
              <li>• <strong>X-Content-Type-Options:</strong> nosniff</li>
              <li>• <strong>X-Frame-Options:</strong> DENY</li>
              <li>• <strong>X-XSS-Protection:</strong> 1; mode=block</li>
              <li>• <strong>Strict-Transport-Security:</strong> HSTS enabled</li>
              <li>• <strong>Content-Security-Policy:</strong> Restrictive CSP</li>
              <li>• <strong>Referrer-Policy:</strong> strict-origin-when-cross-origin</li>
            </ul>
          </div>
        </div>

        {/* Rate Limiting Info */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Rate Limiting</h2>
          <Alert>
            <AlertDescription>
              Rate limiting is active on API endpoints. Try making multiple rapid requests 
              to see the rate limiting in action (429 Too Many Requests response).
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}