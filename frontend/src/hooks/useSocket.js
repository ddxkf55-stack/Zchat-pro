import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';

export function useSocket() {
  const { token, logout } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      console.log('No token, skipping socket connection');
      return;
    }

    console.log('Connecting to socket with token...');
    
    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      if (error.message === 'invalid signature' || error.message === 'unauthorized') {
        console.log('Token invalid, logging out...');
        logout();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // طلب إذن الإشعارات
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.on('notification', ({ title, body, from }) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${title} - ${from}`, { body });
      }
    });

    return () => {
      console.log('Disconnecting socket...');
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [token, logout]);

  return socketRef;
}