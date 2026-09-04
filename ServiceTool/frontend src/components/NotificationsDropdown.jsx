import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Settings,
  CheckCheck,
  ChevronDown,
  X,
  Trash2
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('All');
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [sortOrder, setSortOrder] = useState('Desc');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dropdownRef = useRef(null);
  const categoryRef = useRef(null);
  const settingsRef = useRef(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    settings,
    updateSettings
  } = useSocket();

  const prevIsOpenRef = useRef(isOpen);

  // Sync settings from database
  useEffect(() => {
    if (settings) {
      setOnlyUnread(settings.onlyUnread ?? false);
      setSortOrder(settings.sortOrder ?? 'Desc');
    }
  }, [settings]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setCategoryMenuOpen(false);
        setSettingsOpen(false);
      }
      if (categoryMenuOpen && categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryMenuOpen, settingsOpen]);

  // Only mark notifications as read when the user CLOSES the open dropdown
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, unreadCount, markAllAsRead]);

  const formatTimeShort = (dateString) => {
    try {
      const diffMs = new Date() - new Date(dateString);
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    } catch (e) {
      return '1m';
    }
  };

  const getUnreadCount = (mainTab, subTab = null) => {
    return notifications.filter(n => {
      if (n.isRead) return false;
      if (mainTab === 'All') return true;
      if (mainTab === 'Service Call') {
        const isServiceCall = ['Assignment', 'Escalation', 'Critical', 'Activity'].includes(n.type);
        if (!isServiceCall) return false;
        if (!subTab || subTab === 'all') return true;
        return n.type === subTab;
      }
      if (mainTab === 'Service Material') {
        return n.type === 'Service Material';
      }
      return n.type === mainTab;
    }).length;
  };

  const getCategoryLabel = () => {
    if (activeMainTab === 'All') return 'All Notifications';
    if (activeMainTab === 'Service Material') return 'Service Material';
    if (activeMainTab === 'Service Call') {
      if (activeSubTab === 'all') return 'Service Call: All';
      if (activeSubTab === 'Assignment') return 'Service Call: Assignments';
      if (activeSubTab === 'Escalation') return 'Service Call: Escalations';
      if (activeSubTab === 'Critical') return 'Service Call: Critical';
    }
    return activeMainTab;
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      let matchesMain = activeMainTab === 'All';
      if (!matchesMain) {
        if (activeMainTab === 'Service Call') {
          matchesMain = ['Assignment', 'Escalation', 'Critical', 'Activity'].includes(n.type);
          if (matchesMain && activeSubTab !== 'all') {
            matchesMain = n.type === activeSubTab;
          }
        } else if (activeMainTab === 'Service Material') {
          matchesMain = n.type === 'Service Material';
        } else {
          matchesMain = n.type === activeMainTab;
        }
      }
      const matchesUnread = !onlyUnread || !n.isRead;
      return matchesMain && matchesUnread;
    }).sort((a, b) => {
      if (sortOrder === 'Desc') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }, [notifications, activeMainTab, activeSubTab, onlyUnread, sortOrder]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestPermission();
        }}
        className={`relative p-[0.55vw] rounded-full border transition-all cursor-pointer group ${isOpen ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-350 hover:border-indigo-300'}`}
      >
        <Bell className={`w-[1.1vw] h-[1.1vw] transition-colors ${isOpen ? 'text-indigo-650' : 'text-slate-800 group-hover:text-indigo-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-[0.1vw] -right-[0.1vw] bg-indigo-600 text-white text-[0.6vw] font-bold px-[0.35vw] py-[0.05vw] rounded-full border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute right-0 mt-[0.6vw] w-[30vw] bg-white rounded-[1.2vw] border border-slate-200/80 z-[2000] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-[1vw] pb-[0.6vw] flex items-center justify-between bg-white relative">
              <h3 className="text-[1.05vw] font-bold text-indigo-950">Notifications</h3>

              {/* Action Icons */}
              <div className="flex items-center gap-[0.7vw]">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-[0.2vw] px-[0.4vw] py-[0.2vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer text-[0.72vw] font-bold"
                >
                  <CheckCheck className="w-[0.9vw] h-[0.9vw]" />
                  Mark all as read
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-[0.2vw] px-[0.4vw] py-[0.2vw] text-slate-500 hover:text-red-650 hover:bg-red-50 rounded-[0.4vw] transition-all cursor-pointer text-[0.72vw] font-bold"
                >
                  <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                  Clear all
                </button>
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    title="Notification Settings"
                    className="p-[0.35vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                  >
                    <Settings className="w-[0.95vw] h-[0.95vw]" />
                  </button>

                  {/* Settings Panel Popover */}
                  <AnimatePresence>
                    {settingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-[0.4vw] w-[12vw] bg-white rounded-[0.8vw] border border-slate-200 shadow-lg z-[2100] p-[0.6vw] flex flex-col gap-[0.4vw]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[0.75vw] font-semibold text-indigo-955">Only Unread</span>
                          <button
                            onClick={() => {
                              const nextVal = !onlyUnread;
                              setOnlyUnread(nextVal);
                              updateSettings({ onlyUnread: nextVal, sortOrder });
                            }}
                            className={`relative w-[1.8vw] h-[1vw] rounded-full transition-colors border ${onlyUnread ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                          >
                            <div className={`absolute top-1/2 -translate-y-1/2 w-[0.65vw] h-[0.65vw] bg-white rounded-full transition-all ${onlyUnread ? 'left-[1vw]' : 'left-[0.1vw]'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.75vw] font-semibold text-indigo-955">Sort: {sortOrder}</span>
                          <button
                            onClick={() => {
                              const nextVal = sortOrder === 'Asc' ? 'Desc' : 'Asc';
                              setSortOrder(nextVal);
                              updateSettings({ onlyUnread, sortOrder: nextVal });
                            }}
                            className="text-[0.65vw] font-bold text-indigo-650 hover:underline cursor-pointer"
                          >
                            Toggle
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Horizontal Tabs Row */}
            <div className="px-[1vw] border-b border-slate-200 bg-white flex flex-col gap-[0.5vw]">
              <div className="flex items-center gap-[1.2vw] border-b border-slate-100/85">
                {['All', 'Service Call', 'Service Material'].map(tab => {
                  const count = getUnreadCount(tab);
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveMainTab(tab);
                        setActiveSubTab('all');
                      }}
                      className={`relative pb-[0.5vw] text-[0.82vw] font-semibold transition-all cursor-pointer flex items-center gap-[0.2vw] ${activeMainTab === tab ? 'text-indigo-650 font-bold' : 'text-slate-500 hover:text-indigo-550'}`}
                    >
                      {tab}
                      {count > 0 && (
                        <span className="text-[0.62vw] bg-indigo-50 text-indigo-705 px-[0.35vw] py-[0.05vw] rounded-full font-semibold border border-indigo-100 shadow-sm">
                          {count}
                        </span>
                      )}
                      {activeMainTab === tab && (
                        <motion.div layoutId="mainTabIndicator" className="absolute bottom-0 left-0 right-0 h-[0.12vw] bg-indigo-650 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Sub Tabs for Service Call */}
              {activeMainTab === 'Service Call' && (
                <div className="flex items-center gap-[0.5vw] pb-[0.5vw] animate-in fade-in slide-in-from-top-1 duration-200">
                  {['all', 'Assignment', 'Escalation', 'Critical'].map(tab => {
                    const count = getUnreadCount('Service Call', tab);
                    const label = tab === 'all' ? 'All' : tab === 'Assignment' ? 'Assignments' : tab === 'Escalation' ? 'Escalations' : tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.7vw] font-semibold transition-all border cursor-pointer flex items-center gap-[0.2vw] ${activeSubTab === tab ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:bg-slate-50'}`}
                      >
                        {label}
                        {count > 0 && (
                          <span className={`text-[0.58vw] px-[0.25vw] py-[0.02vw] rounded-full font-semibold ${activeSubTab === tab ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List Content */}
            <div className="max-h-[25vw] overflow-y-auto bg-white flex flex-col min-h-[15vw] divide-y divide-slate-200">
              {filteredNotifications.length === 0 ? (
                <div className="py-[4vw] flex flex-col items-center justify-center text-center my-auto">
                  <div className="w-[3vw] h-[3vw] rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center mb-[0.6vw]">
                    <Bell className="w-[1.4vw] h-[1.4vw] text-slate-350" />
                  </div>
                  <p className="text-[0.85vw] font-semibold text-indigo-955">Inbox is empty</p>
                  <p className="text-[0.72vw] text-slate-500 max-w-[80%] mt-[0.1vw]">You don't have any notifications in this filter.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-200">
                  <AnimatePresence initial={false}>
                    {filteredNotifications.map((n) => (
                      <motion.div
                        key={n._id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50, transition: { duration: 0.18 } }}
                        className={`relative p-[1vw] flex gap-[0.6vw] transition-all cursor-pointer ${!n.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                        onClick={() => !n.isRead && markAsRead(n._id)}
                      >
                        {/* Unread Status Marker */}
                        <div className="w-[0.5vw] flex items-start justify-center pt-[0.4vw]">
                          {!n.isRead && (
                            <div className="w-[0.45vw] h-[0.45vw] bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>

                        {/* Main Text Content */}
                        <div className="flex-1 min-w-0 pr-[1vw]">
                          <h4 className="text-[0.82vw] font-semibold text-indigo-950 leading-snug">
                            {n.title}
                          </h4>
                          <p className="text-[0.75vw] text-slate-600 leading-relaxed mt-[0.15vw] font-normal break-words pr-[0.5vw] whitespace-pre-line">
                            {n.message}
                          </p>
                        </div>

                        {/* Action Block Right */}
                        <div className="flex flex-col items-end justify-between w-[3.5vw] flex-shrink-0 relative">
                          <span className="text-[0.68vw] font-medium text-slate-400 text-right w-full block">
                            {formatTimeShort(n.createdAt)}
                          </span>

                          {/* Direct Delete X Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n._id);
                            }}
                            className="p-[0.2vw] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer mt-auto"
                          >
                            <X className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-[1vw] py-[0.6vw] border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center gap-[0.3vw] text-[0.72vw] font-bold text-indigo-955 opacity-70">
                <Bell className="w-[0.8vw] h-[0.8vw] text-indigo-650" />
                Akira Service Tool
              </div>
              <div className="text-[0.65vw] font-bold text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;
