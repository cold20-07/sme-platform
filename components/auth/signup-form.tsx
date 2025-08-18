'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useDevAuth } from '@/lib/dev-auth';
import { getEnvironmentConfig } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Loader2 } from 'lucide-react';

interface SignupFormProps {
  onToggleMode: () => void;
}

const industries = [
  'Technology',
  'Manufacturing',
  'Retail',
  'Healthcare',
  'Finance',
  'Education',
  'Construction',
  'Agriculture',
  'Services',
  'Other',
];

const legalStructures = [
  'Private Limited Company',
  'Partnership',
  'LLP',
  'Sole Proprietorship',
  'Public Limited Company',
  'Other',
];

export function SignupForm({ onToggleMode }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    gstNumber: '',
    panNumber: '',
    industry: '',
    legalStructure: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const config = getEnvironmentConfig();
  const authHook = config.devMode ? useDevAuth : useAuth;
  const { signUp } = authHook();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp(formData.email, formData.password, {
        name: formData.companyName,
        gst_number: formData.gstNumber,
        pan_number: formData.panNumber,
        industry: formData.industry,
        legal_structure: formData.legalStructure,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Set up your SME Platform account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
          </div>
          <Input
            type="text"
            placeholder="Company Name"
            value={formData.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="GST Number (optional)"
              value={formData.gstNumber}
              onChange={(e) => handleChange('gstNumber', e.target.value)}
            />
            <Input
              type="text"
              placeholder="PAN Number (optional)"
              value={formData.panNumber}
              onChange={(e) => handleChange('panNumber', e.target.value)}
            />
          </div>
          <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={formData.legalStructure} onValueChange={(value) => handleChange('legalStructure', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Legal Structure" />
            </SelectTrigger>
            <SelectContent>
              {legalStructures.map((structure) => (
                <SelectItem key={structure} value={structure}>
                  {structure}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}