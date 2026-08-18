import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useNotification } from '../components/NotificationContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { toast } = useNotification();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('loggedInUser')));
  const [settings, setSettings] = useState({ onlyUnread: false, sortOrder: 'Desc' });
  const workerRef = useRef(null);

  const fetchNotifications = useCallback(async (userId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${baseUrl}/notifications/${userId}`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  const fetchSettings = useCallback(async (userId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${baseUrl}/notifications/settings/${userId}`);
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  // Monitor session storage manually or via custom event
  useEffect(() => {
    const handleAuthChange = () => {
      const loggedUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
      setUser(loggedUser);
    };

    window.addEventListener('auth-change', handleAuthChange);
    // Initial check
    if (!user) handleAuthChange();

    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  useEffect(() => {
    if (user && !socket) {
      // Use the base URL without /api for socket connection
      const socketUrl = import.meta.env.VITE_API_BASE_URL1 || 
                       (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
      
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'], // Added transports for better compatibility
        withCredentials: true
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        newSocket.emit('join-room', user.userId);
      });

      const playChime = () => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const now = ctx.currentTime;
          
          const playTone = (time, freq, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + dur);
          };
          
          playTone(now, 587.33, 0.15); // D5
          playTone(now + 0.12, 880, 0.22); // A5
        } catch (e) {
          console.error("Failed to play notification sound:", e);
        }
      };

      newSocket.on('notification:new', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        let toastType = 'info';
        if (notification.priority === 'Critical' || notification.type === 'Critical') {
          toastType = 'critical';
        } else if (notification.type === 'Escalation') {
          toastType = 'warning';
        } else if (notification.type === 'Assignment') {
          toastType = 'success';
        }
        
        toast(notification.message, toastType);
        
        // Play chime sound when any logged-in user receives a notification
        if (user) {
          playChime();
        }
        
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.png' 
          });
        }
      });

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          if (newSocket && newSocket.disconnected) {
            newSocket.connect();
          }
          fetchNotifications(user.userId);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Create inline Web Worker to bypass background tab CPU suspension and timer throttling
      try {
        const blob = new Blob([
          `setInterval(() => { postMessage('ping'); }, 5000);`
        ], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = () => {
          if (newSocket) {
            if (newSocket.connected) {
              newSocket.emit('heartbeat', { userId: user.userId });
            } else {
              newSocket.connect();
            }
          }
        };
        workerRef.current = worker;
      } catch (e) {
        console.error('Failed to create keep-alive background worker:', e);
      }

      fetchNotifications(user.userId);
      fetchSettings(user.userId);

      return () => {
          newSocket.off('notification:new');
          newSocket.close();
          setSocket(null);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
      };
    }
  }, [user, fetchNotifications, fetchSettings]);

  const updateSettings = async (newSettings) => {
    if (!user) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await axios.patch(`${baseUrl}/notifications/settings/${user.userId}`, newSettings);
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAsUnread = async (id) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/notifications/${id}/unread`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: false } : n));
      setUnreadCount(prev => prev + 1);
    } catch (err) {
      console.error('Error marking as unread:', err);
    }
  };

  const markAllAsRead = async () => {
      if (!user) return;
      try {
          await axios.patch(`${import.meta.env.VITE_API_URL}/notifications/${user.userId}/read-all`);
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
      } catch (err) {
          console.error('Error marking all as read:', err);
      }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Re-fetch or manually adjust unreadCount if needed
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/notifications/${user.userId}/clear-all`);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const requestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, clearAllNotifications, requestPermission, settings, updateSettings }}>
      {children}
    </SocketContext.Provider>
  );
};
