'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AuthErrorDisplay, SessionStatus, AuthLoading, NetworkStatus } from '@/components/ui/auth-error-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Shield, 
  Clock, 
  RefreshCw, 
  LogOut, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export function EnhancedAuthDemo() {
  const auth = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [isOnline, setIsOnline] = useState(true);
  const [lastAction, setLastAction] = useState<string>('');

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignIn = async () => {
    setLastAction('Sign In');
    const result = await auth.signIn(email, password);
    if (result.success) {
      console.log('Sign in successful');
    }
  };

  const handleSignOut = async () => {
    setLastAction('Sign Out');
    const result = await auth.signOut();
    if (result.success) {
      console.log('Sign out successful');
    }
  };

  const handleRefreshSession = async () => {
    setLastAction('Refresh Session');
    const result = await auth.refreshSession();
    if (result.success) {
      console.log('Session refresh successful');
    }
  };

  const handleRetry = async () => {
    setLastAction('Retry Last Action');
    const result = await auth.retryLastAction();
    if (result.success) {
      console.log('Retry successful');
    }
  };

  const handleValidateSession = async () => {
    setLastAction('Validate Session');
    const isValid = await auth.validateSession();
    console.log('Session valid:', isValid);
  };

  const getAuthStatusBadge = () => {
    if (auth.loading) {
      return <Badge variant="secondary">Loading...</Badge>;
    }
    if (auth.isAuthenticated) {
      return <Badge variant="default" className="bg-green-500">Authenticated</Badge>;
    }
    return <Badge variant="destructive">Not Authenticated</Badge>;
  };

  const getSessionStatusBadge = () => {
    if (!auth.session) {
      return <Badge variant="outline">No Session</Badge>;
    }
    if (!auth.isSessionValid) {
      return <Badge variant="destructive">Invalid</Badge>;
    }
    if (auth.needsRefresh) {
      return <Badge variant="secondary" className="bg-yellow-500">Needs Refresh</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Valid</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Enhanced Authentication Demo</h1>
        <p className="text-gray-600">
          Demonstrates enhanced authentication error handling, session management, and recovery
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Auth Status</Label>
              {getAuthStatusBadge()}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Session Status</Label>
              {getSessionStatusBadge()}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Network Status</Label>
              <NetworkStatus isOnline={isOnline} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Last Action</Label>
              <span className="text-sm text-gray-600">{lastAction || 'None'}</span>
            </div>
          </div>

          {auth.user && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium">User Information</span>
              </div>
              <div className="text-sm space-y-1">
                <div><strong>Email:</strong> {auth.user.email}</div>
                <div><strong>ID:</strong> {auth.user.id}</div>
                <div><strong>Created:</strong> {new Date(auth.user.created_at).toLocaleString()}</div>
              </div>
            </div>
          )}

          {auth.session && (
            <div className="mt-4">
              <SessionStatus
                timeRemaining={auth.getSessionTimeRemaining()}
                isValid={auth.isSessionValid}
                needsRefresh={auth.needsRefresh}
                onRefresh={handleRefreshSession}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {auth.error && (
        <AuthErrorDisplay
          error={auth.error}
          onRetry={auth.canRetry() ? handleRetry : undefined}
          onReauth={auth.requiresReauth() ? () => window.location.href = '/auth/login' : undefined}
          onDismiss={auth.clearError}
        />
      )}

      {/* Authentication Actions */}
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="session">Session Management</TabsTrigger>
          <TabsTrigger value="testing">Error Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Sign in to test enhanced authentication error handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!auth.isAuthenticated ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button 
                    onClick={handleSignIn} 
                    disabled={auth.loading}
                    className="w-full"
                  >
                    {auth.loading ? (
                      <AuthLoading message="Signing in..." />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Successfully authenticated</span>
                  </div>
                  <Button 
                    onClick={handleSignOut} 
                    variant="outline"
                    disabled={auth.loading}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Manage and monitor your authentication session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleRefreshSession}
                  disabled={auth.loading || !auth.session}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Session
                </Button>
                <Button 
                  onClick={handleValidateSession}
                  disabled={auth.loading}
                  variant="outline"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Validate Session
                </Button>
              </div>

              {auth.session && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-medium">Session Details</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Access Token:</strong> {auth.session.access_token.substring(0, 20)}...</div>
                    <div><strong>Expires At:</strong> {auth.session.expires_at ? new Date(auth.session.expires_at * 1000).toLocaleString() : 'Unknown'}</div>
                    <div><strong>Token Type:</strong> {auth.session.token_type}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Testing</CardTitle>
              <CardDescription>
                Test various authentication error scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => auth.signIn('invalid@email.com', 'wrongpassword')}
                  variant="outline"
                  className="text-left"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Test Invalid Credentials
                </Button>
                <Button 
                  onClick={() => auth.signIn('', '')}
                  variant="outline"
                  className="text-left"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Test Empty Credentials
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Recovery Actions</h4>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleRetry}
                    disabled={!auth.canRetry()}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                  <Button 
                    onClick={auth.clearError}
                    disabled={!auth.error}
                    size="sm"
                    variant="outline"
                  >
                    Clear Error
                  </Button>
                </div>
              </div>

              {auth.error && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Current Error</h4>
                  <div className="text-sm text-red-700 space-y-1">
                    <div><strong>Code:</strong> {auth.error.authCode}</div>
                    <div><strong>Message:</strong> {auth.error.userMessage}</div>
                    <div><strong>Can Retry:</strong> {auth.canRetry() ? 'Yes' : 'No'}</div>
                    <div><strong>Requires Reauth:</strong> {auth.requiresReauth() ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Development-only debugging information</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify({
                loading: auth.loading,
                isAuthenticated: auth.isAuthenticated,
                isSessionValid: auth.isSessionValid,
                needsRefresh: auth.needsRefresh,
                hasError: !!auth.error,
                errorCode: auth.error?.authCode,
                canRetry: auth.canRetry(),
                requiresReauth: auth.requiresReauth(),
                sessionTimeRemaining: auth.getSessionTimeRemaining(),
                userId: auth.user?.id,
                userEmail: auth.user?.email,
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}