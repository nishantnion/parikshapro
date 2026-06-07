import { createContext, useContext, useState } from 'react';

const LoadingContext = createContext({ show: () => {}, hide: () => {} });

export function LoadingProvider({ children }) {
  const [state, setState] = useState({ visible: false, message: '' });

  const show = (message = 'Please wait...') => setState({ visible: true, message });
  const hide = () => setState({ visible: false, message: '' });

  return (
    <LoadingContext.Provider value={{ show, hide }}>
      {children}
      {state.visible && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, zIndex: 9999,
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)', letterSpacing: 3 }}>
            PARIKSHAPRO
          </div>
          <div style={{
            width: 48, height: 48,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
          }} />
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>{state.message}</div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
