'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface DevAuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, companyData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const DevAuthContext = createContext<DevAuthContextType | undefined>(undefined);

// Mock user data for development
const mockUser = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  role: 'owner',
  company_id: 'dev-company-123'
};

const mockSession = {
  user: mockUser,
  access_token: 'dev-token',
  expires_at: Date.now() + 3600000 // 1 hour from now
};

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already "logged in" in localStorage
    const savedAuth = localStorage.getItem('dev-auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setUser(authData.user);
      setSession(authData.session);
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, companyData: any) => {
    // Mock signup - just log the user in
    const userData = { ...mockUser, email };
    const sessionData = { ...mockSession, user: userData };
    
    setUser(userData);
    setSession(sessionData);
    localStorage.setItem('dev-auth', JSON.stringify({ user: userData, session: sessionData }));
    
    return { user: userData, session: sessionData };
  };

  const signIn = async (email: string, password: string) => {
    // Mock login - accept any email/password
    const userData = { ...mockUser, email };
    const sessionData = { ...mockSession, user: userData };
    
    setUser(userData);
    setSession(sessionData);
    localStorage.setItem('dev-auth', JSON.stringify({ user: userData, session: sessionData }));
    
    return { user: userData, session: sessionData };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('dev-auth');
  };

  return (
    <DevAuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const context = useContext(DevAuthContext);
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  return context;
}