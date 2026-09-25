'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { firebaseAuthService } from '@/services/firebase';
import { RecaptchaVerifier } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<string>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signIn(email, password);
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signInWithGoogle();
      setUser(user);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGithub = async () => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signInWithGithub();
      setUser(user);
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signUp(email, password, displayName, role);
      setUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseAuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    
    try {
      await firebaseAuthService.updateUserProfile(user.id, data);
      setUser({ ...user, ...data, updatedAt: new Date() });
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await firebaseAuthService.resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<string> => {
    setIsLoading(true);
    try {
      const verificationId = await firebaseAuthService.sendVerificationCode(phoneNumber, recaptchaVerifier);
      return verificationId;
    } catch (error) {
      console.error('Phone login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async (verificationId: string, code: string) => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.verifyCode(verificationId, code);
      setUser(user);
    } catch (error) {
      console.error('Phone verification failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        loginWithGithub,
        loginWithPhone,
        verifyPhoneCode,
        register,
        logout,
        updateUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
