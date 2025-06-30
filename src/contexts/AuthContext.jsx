import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Create the AuthContext
const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

// AuthProvider component to wrap the app and provide auth state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from Firestore
  const fetchUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role || 'manager'; // Default to manager if no role set
      }
      return 'manager'; // Default role for new users
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'manager'; // Default role on error
    }
  };

  // Set user role in Firestore
  const setUserRoleInFirestore = async (uid, role) => {
    try {
      await setDoc(doc(db, 'users', uid), { role }, { merge: true });
    } catch (error) {
      console.error('Error setting user role:', error);
    }
  };

  // Listen for auth state changes (login/logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('onAuthStateChanged fired. User:', user);
      setUser(user);
      
      if (user) {
        // Fetch user role when user is authenticated
        const role = await fetchUserRole(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Login function
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout function
  const logout = () => {
    return signOut(auth);
  };

  // Reset password function
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Update user role
  const updateUserRole = async (uid, newRole) => {
    await setUserRoleInFirestore(uid, newRole);
    setUserRole(newRole);
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    if (!user || !userRole) return false;
    if (requiredRole === 'admin') return userRole === 'admin';
    if (requiredRole === 'manager') return userRole === 'admin' || userRole === 'manager';
    return false;
  };

  // Context value
  const value = { 
    user, 
    userRole, 
    login, 
    logout, 
    resetPassword,
    updateUserRole, 
    hasRole,
    isAdmin: hasRole('admin'),
    isManager: hasRole('manager')
  };

  console.log('AuthProvider render. User:', user, 'Role:', userRole, 'Loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {/* Only render children when not loading to prevent flicker */}
      {!loading && children}
    </AuthContext.Provider>
  );
}; 