import * as React from 'react';
import api from './api';

export interface LynqUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  profile?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface AuthContextValue {
  user: LynqUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signUp: (input: { email: string; password: string; profile?: Record<string, unknown> }) => Promise<unknown>;
  signIn: (input: { email: string; password: string }) => Promise<unknown>;
  signInWithGoogle: (credential: string) => Promise<unknown>;
  signInWithGoogleRedirect: (redirectTo?: string) => string;
  sendVerificationEmail: (input: { email: string; redirectTo?: string }) => Promise<unknown>;
  verifyEmail: (input: { email: string; code: string }) => Promise<unknown>;
  sendPasswordResetEmail: (input: { email: string; redirectTo?: string }) => Promise<unknown>;
  exchangeResetPasswordCode: (input: { email: string; code: string }) => Promise<unknown>;
  resetPassword: (input: { token: string; newPassword: string }) => Promise<unknown>;
  refresh: () => Promise<unknown>;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function LynqAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<LynqUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadCurrentUser = React.useCallback(async () => {
    setIsLoading(true);
    try {
      api.consumeOAuthCallback();
      const currentUser = await api.getCurrentUser();
      setUser((currentUser as LynqUser | null) ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const value = React.useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    signUp: async (input) => api.signUp(input),
    signIn: async (input) => {
      const session = await api.signInWithPassword(input);
      setUser((session as { user?: LynqUser }).user ?? null);
      return session;
    },
    signInWithGoogle: async (credential) => {
      const session = await api.signInWithGoogle(credential);
      setUser((session as { user?: LynqUser }).user ?? null);
      return session;
    },
    signInWithGoogleRedirect: (redirectTo = typeof window !== 'undefined' ? window.location.href : '/') =>
      api.signInWithOAuthRedirect('google', redirectTo) as string,
    sendVerificationEmail: (input) => api.sendVerificationEmail(input),
    verifyEmail: async (input) => {
      const session = await api.verifyEmail(input);
      setUser((session as { user?: LynqUser }).user ?? null);
      return session;
    },
    sendPasswordResetEmail: (input) => api.sendPasswordResetEmail(input),
    exchangeResetPasswordCode: (input) => api.exchangeResetPasswordCode(input),
    resetPassword: (input) => api.resetPassword(input),
    refresh: async () => {
      const session = await api.refreshSession();
      setUser((session as { user?: LynqUser } | null)?.user ?? null);
      return session;
    },
    signOut: () => {
      api.signOut();
      setUser(null);
    },
  }), [error, isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within LynqAuthProvider');
  }
  return value;
}

export function ProtectedRoute({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <>{fallback}</>;
  return <>{children}</>;
}
