import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Settings,
  CheckCheck,
  ChevronDown,
  X,
  Trash2,
  Clock,
  AlertTriangle,
  Flame,
  UserCheck,
  ArrowUpRight,
  RotateCcw,
  Package,
  Wrench,
  CheckCircle2,
  Sparkles,
  Inbox,
  PhoneCall,
  ShieldAlert,
  Boxes,
  Activity
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

// Helper to determine contextual notification styling & icons based on the application domain
const getNotificationVisuals = (notification) => {
  const title = (notification.title || '').toLowerCase();
  const type = notification.type || '';
  const priority = notification.priority || 'Medium';

  // 1. Critical / SLA Exhausted
  if (type === 'Critical' || priority === 'Critical' || title.includes('critical') || title.includes('exhausted')) {
    return {
      icon: Flame,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100/80 border-rose-200/80',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'Critical',
      statusDot: 'bg-rose-500',
      accentGlow: 'hover:bg-rose-50/20'
    };
  }

  // 2. SLA Warning / 50% Warning / Impending escalation
  if (title.includes('warning') || title.includes('50%') || title.includes('deadline')) {
    return {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100/80 border-amber-200/80',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeText: 'SLA Warning',
      statusDot: 'bg-amber-500',
      accentGlow: 'hover:bg-amber-50/20'
    };
  }

  // 3. Reverse Escalation / Returned
  if (title.includes('reverse') || title.includes('return')) {
    return {
      icon: RotateCcw,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100/80 border-purple-200/80',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeText: 'Returned',
      statusDot: 'bg-purple-500',
      accentGlow: 'hover:bg-purple-50/20'
    };
  }

  // 4. Escalation
  if (type === 'Escalation' || title.includes('escalat')) {
    return {
      icon: ShieldAlert,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100/80 border-indigo-200/80',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeText: 'Escalation',
      statusDot: 'bg-indigo-500',
      accentGlow: 'hover:bg-indigo-50/20'
    };
  }

  // 5. Assignment / New Call
  if (type === 'Assignment' || title.includes('assigned') || title.includes('registered')) {
    return {
      icon: PhoneCall,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100/80 border-blue-200/80',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeText: 'Assigned',
      statusDot: 'bg-blue-500',
      accentGlow: 'hover:bg-blue-50/20'
    };
  }

  // 6. Service Material / Production
  if (type === 'Service Material' || title.includes('material') || title.includes('production') || title.includes('nc')) {
    return {
      icon: Boxes,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100/80 border-emerald-200/80',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: 'Material',
      statusDot: 'bg-emerald-500',
      accentGlow: 'hover:bg-emerald-50/20'
    };
  }

  // 7. Resolved / Closed
  if (title.includes('resolved') || title.includes('attended') || title.includes('closed')) {
    return {
      icon: CheckCircle2,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100/80 border-teal-200/80',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
      badgeText: 'Resolved',
      statusDot: 'bg-teal-500',
      accentGlow: 'hover:bg-teal-50/20'
    };
  }

  // Default Activity
  return {
    icon: Activity,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100 border-slate-200/80',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeText: type || 'Activity',
    statusDot: 'bg-slate-400',
    accentGlow: 'hover:bg-slate-50/50'
  };
};

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
            <div className="max-h-[28vw] overflow-y-auto bg-slate-50/50 flex flex-col min-h-[16vw] divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-[4vw] flex flex-col items-center justify-center text-center my-auto">
                  <div className="w-[3.6vw] h-[3.6vw] rounded-full border border-slate-200/80 bg-white shadow-sm flex items-center justify-center mb-[0.8vw]">
                    <Inbox className="w-[1.6vw] h-[1.6vw] text-slate-350" />
                  </div>
                  <p className="text-[0.9vw] font-bold text-slate-800">You're all caught up!</p>
                  <p className="text-[0.72vw] text-slate-500 max-w-[75%] mt-[0.2vw] leading-relaxed">
                    No new alerts or escalations pending in this category.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col p-[0.6vw] gap-[0.45vw]">
                  <AnimatePresence initial={false}>
                    {filteredNotifications.map((n) => {
                      const visuals = getNotificationVisuals(n);
                      const IconComp = visuals.icon;
                      const isUnread = !n.isRead;

                      return (
                        <motion.div
                          key={n._id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                          className={`group relative rounded-[0.8vw] p-[0.75vw] flex items-center gap-[0.75vw] transition-all cursor-pointer border ${
                            isUnread
                              ? 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]'
                              : 'bg-white/80 border-slate-200/60 hover:bg-white hover:border-slate-300 shadow-2xs'
                          } ${visuals.accentGlow}`}
                          onClick={() => isUnread && markAsRead(n._id)}
                        >
                          {/* Circular App-Themed Icon on the Left with Contextual Status Sub-Badge */}
                          <div className="relative shrink-0">
                            <div className={`w-[2.4vw] h-[2.4vw] rounded-full flex items-center justify-center border shadow-2xs ${visuals.iconBg}`}>
                              <IconComp className={`w-[1.2vw] h-[1.2vw] ${visuals.iconColor}`} />
                            </div>
                            {/* Small status indicator pip on bottom-right of circle */}
                            <span className={`absolute -bottom-[0.05vw] -right-[0.05vw] w-[0.65vw] h-[0.65vw] rounded-full border-[0.12vw] border-white shadow-xs ${visuals.statusDot}`} />
                          </div>

                          {/* Content Body: Clean Avatar-style typography layout */}
                          <div className="flex-1 min-w-0 pr-[0.3vw]">
                            {/* Row 1: Title and Category */}
                            <div className="flex items-baseline gap-[0.4vw] flex-wrap">
                              <h4 className={`text-[0.82vw] leading-snug ${
                                isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                              }`}>
                                {n.title}
                              </h4>
                              <span className={`text-[0.62vw] font-bold px-[0.35vw] py-[0.04vw] rounded-[0.25vw] border uppercase tracking-wider ${visuals.badgeBg}`}>
                                {visuals.badgeText}
                              </span>
                            </div>

                            {/* Row 2: Message preview */}
                            <p className="text-[0.73vw] text-slate-600 leading-snug mt-[0.15vw] line-clamp-2 break-words">
                              {n.message}
                            </p>

                            {/* Row 3: Timestamp & Subtext meta */}
                            <div className="flex items-center gap-[0.4vw] mt-[0.25vw] text-[0.68vw] text-slate-400 font-medium">
                              <span>{formatTimeShort(n.createdAt)}</span>
                              <span>•</span>
                              <span className="text-slate-500 font-medium">
                                {n.data?.callNumber || (n.type === 'Service Material' ? 'Material Dispatch' : 'Akira Service')}
                              </span>
                            </div>
                          </div>

                          {/* Right Side: Unread Dot indicator & Dismiss button */}
                          <div className="flex items-center gap-[0.35vw] shrink-0 self-center">
                            {isUnread && (
                              <span className="w-[0.55vw] h-[0.55vw] rounded-full bg-blue-600 shadow-xs group-hover:hidden" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n._id);
                              }}
                              title="Dismiss notification"
                              className={`${isUnread ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'} p-[0.3vw] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[0.4vw] transition-all cursor-pointer`}
                            >
                              <X className="w-[0.85vw] h-[0.85vw]" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
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
