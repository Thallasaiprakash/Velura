import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';

const AUTH_KEY = 'velura_user_id';

interface AuthContextValue {
  userId: string | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  user: null,
  loading: true,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid);
        await AsyncStorage.setItem(AUTH_KEY, firebaseUser.uid);
      } else {
        // Sign in anonymously
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
          setUserId(result.user.uid);
          await AsyncStorage.setItem(AUTH_KEY, result.user.uid);
        } catch (error) {
          // Fallback: use a locally generated ID
          let localId = await AsyncStorage.getItem(AUTH_KEY);
          if (!localId) {
            localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await AsyncStorage.setItem(AUTH_KEY, localId);
          }
          setUserId(localId);
          setUser(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ userId, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
