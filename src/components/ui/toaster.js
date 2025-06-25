import React, { useEffect, useState } from 'react';

// Simple event emitter for toasts
const listeners = [];

export const toaster = {
  create(toast) {
    listeners.forEach((cb) => cb(toast));
  },
  subscribe(cb) {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },
};

// ToastContainer component
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toaster.subscribe((toast) => {
      setToasts((prev) => [
        ...prev,
        { ...toast, id: Date.now() + Math.random() },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 2500);
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            marginBottom: 12,
            padding: '12px 20px',
            borderRadius: 8,
            background: toast.type === 'error' ? '#F56565' : toast.type === 'info' ? '#3182CE' : '#38A169',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            minWidth: 220,
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          {toast.description}
        </div>
      ))}
    </div>
  );
} 