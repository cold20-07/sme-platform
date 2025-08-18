/**
 * Secure form component with CSRF protection and input validation
 */

'use client';

import React, { FormEvent, ReactNode } from 'react';
import { useSecureForm } from '@/lib/security-context';
import { InputSanitizer } from '@/lib/security-validation';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface SecureFormProps {
  action: string;
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onSubmit?: (data: FormData) => Promise<void>;
  onSuccess?: (response: Response) => void;
  onError?: (error: Error) => void;
  children: ReactNode;
  className?: string;
  sanitizeInputs?: boolean;
  validateInputs?: boolean;
}

export function SecureForm({
  action,
  method = 'POST',
  onSubmit,
  onSuccess,
  onError,
  children,
  className,
  sanitizeInputs = true,
  validateInputs = true,
}: SecureFormProps) {
  const { submitSecurely } = useSecureForm();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const data: Record<string, any> = {};

      // Process form data
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          let processedValue = value;

          // Sanitize inputs if enabled
          if (sanitizeInputs) {
            processedValue = InputSanitizer.sanitizeText(processedValue);
          }

          // Basic validation if enabled
          if (validateInputs) {
            if (key.includes('email') && processedValue) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(processedValue)) {
                throw new Error(`Invalid email format for ${key}`);
              }
            }

            if (key.includes('url') && processedValue) {
              const sanitizedUrl = InputSanitizer.sanitizeUrl(processedValue);
              if (!sanitizedUrl) {
                throw new Error(`Invalid URL format for ${key}`);
              }
              processedValue = sanitizedUrl;
            }
          }

          data[key] = processedValue;
        } else {
          data[key] = value;
        }
      }

      // Call custom onSubmit if provided
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default secure submission
        const response = await submitSecurely(action, data, { method });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (onSuccess) {
          onSuccess(response);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {children}
      
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="mt-4"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}

/**
 * Secure input component with built-in sanitization
 */
interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitize?: boolean;
  allowedChars?: RegExp;
}

export function SecureInput({ 
  sanitize = true, 
  allowedChars,
  onChange,
  ...props 
}: SecureInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value;

    if (sanitize) {
      value = InputSanitizer.sanitizeText(value);
    }

    if (allowedChars && !allowedChars.test(value)) {
      return; // Don't update if characters aren't allowed
    }

    // Update the input value
    event.target.value = value;

    if (onChange) {
      onChange(event);
    }
  };

  return (
    <input
      {...props}
      onChange={handleChange}
      className={`border rounded px-3 py-2 ${props.className || ''}`}
    />
  );
}

/**
 * Secure textarea component with built-in sanitization
 */
interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitize?: boolean;
  allowHtml?: boolean;
}

export function SecureTextarea({ 
  sanitize = true, 
  allowHtml = false,
  onChange,
  ...props 
}: SecureTextareaProps) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = event.target.value;

    if (sanitize) {
      if (allowHtml) {
        value = InputSanitizer.sanitizeHtml(value);
      } else {
        value = InputSanitizer.sanitizeText(value);
      }
    }

    // Update the textarea value
    event.target.value = value;

    if (onChange) {
      onChange(event);
    }
  };

  return (
    <textarea
      {...props}
      onChange={handleChange}
      className={`border rounded px-3 py-2 ${props.className || ''}`}
    />
  );
}