import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getNotificationTargetUrl } from '../utils/notificationRouter';

// Helper to format clean, non-repetitive notification title & preview
const getCleanNotificationContent = (n) => {
  let title = n.title || 'Notification';
  let message = n.message || '';
  const callNum = n.data?.callNumber;

  // Clean title: remove repetitive call numbers if already in footer or badge
  // e.g. "Call Returned (Reverse Escalation): #SC-20261110-9936" -> "Call Returned (Reverse Escalation)"
  if (title.includes('Call Returned') || title.includes('Reverse Escalation')) {
    title = 'Call Returned';
  } else if (title.includes('Support Requested')) {
    title = 'Support Requested';
  } else if (title.includes('Call Attended')) {
    title = 'Call Attended';
  } else if (title.includes('Call Resolved')) {
    title = 'Call Resolved';
  } else if (title.includes('New Service Call Assigned') || title.includes('Call Assigned')) {
    title = 'Call Assigned';
  } else if (title.includes('Critical Service Call Alert') || title.includes('Marked Critical')) {
    title = 'Critical Alert';
  } else if (title.includes('SLA Deadline 50%') || title.includes('SLA 50% Warning')) {
    title = 'SLA 50% Warning';
  } else if (title.includes('SLA Breached')) {
    title = 'SLA Breached';
  } else if (title.includes('Escalation Exhausted') || title.includes('all level exhausted')) {
    title = 'Escalation Exhausted';
  }

  // Clean message: strip redundant prefixes and boilerplate
  if (message.includes('Product status updated to')) {
    const parts = message.split('Remarks:');
    if (parts.length > 1 && parts[1].trim() && parts[1].trim() !== 'None') {
      message = parts[1].trim();
    } else {
      message = parts[0].replace(/Product status updated to "[^"]*" by /, 'Updated by ');
    }
  } else if (message.includes('was reverse-escalated back to')) {
    const reasonMatch = message.match(/Reason:\s*(.*?)(\.|$)/);
    const byMatch = message.match(/by\s+([^.]+)/);
    const toMatch = message.match(/back to\s+([^\s]+)/);
    const who = byMatch ? byMatch[1].split('.')[0].trim() : 'previous engineer';
    const toName = toMatch ? toMatch[1].trim() : '';
    const reason = reasonMatch && reasonMatch[1] && reasonMatch[1] !== 'Needs review' ? ` (${reasonMatch[1].trim()})` : '';
    message = `Returned by ${who}${toName && toName !== 'you' ? ` to ${toName}` : ''}${reason}`;
  } else if (message.includes('will be escalated') || message.includes('50% SLA time')) {
    message = '50% of SLA time reached. Approaching escalation.';
  } else if (message.includes('was breached by') && (message.includes('has been escalated to') || message.includes('escalated to'))) {
    const byMatch = message.match(/breached by\s+([^\s]+)/);
    const toMatch = message.match(/escalated to\s+([^\s.]+)/);
    const who = byMatch ? byMatch[1] : 'engineer';
    const toName = toMatch ? toMatch[1] : 'you';
    message = `SLA breached by ${who} and escalated to ${toName}.`;
  } else if (message.includes('all level exhausted and it assigned to')) {
    const toMatch = message.match(/assigned to the\s+"?([^"]+)"?/);
    const who = toMatch ? toMatch[1] : 'admin';
    message = `All escalation levels exhausted. Assigned to ${who}.`;
  }

  return { title, message, callNum };
};
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n._id);
    setSelectedNotification(n);
  };

  const handleNavigateToTarget = (n) => {
    setIsOpen(false);
    setSelectedNotification(null);

    const currentUser = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const targetUrl = getNotificationTargetUrl(n, currentUser);
    navigate(targetUrl);
  };
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
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      // Latest notification always comes first by default
      return timeB - timeA;
    });
  }, [notifications, activeMainTab, activeSubTab, onlyUnread]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestPermission();
        }}
        className={`relative p-2 rounded-full border transition-all cursor-pointer group ${isOpen ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-350 hover:border-indigo-300'}`}
      >
        <Bell className={`w-4 h-4 transition-colors ${isOpen ? 'text-indigo-650' : 'text-slate-800 group-hover:text-indigo-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-[1px] -right-[1px] bg-indigo-600 text-white text-xs font-bold px-1.5 py-px rounded-full border border-white">
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
            className="absolute right-0 mt-2.5 w-[432px] bg-white rounded-2xl border border-slate-200/80 z-[2000] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-3.5 pb-2.5 flex items-center justify-between bg-white relative">
              <h3 className="text-xs font-bold text-indigo-950">Notifications</h3>

              {/* Action Icons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-1.5 py-1 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer text-sm font-bold"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1 px-1.5 py-1 text-slate-700 hover:text-red-650 hover:bg-red-50 rounded-md transition-all cursor-pointer text-sm font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    title="Notification Settings"
                    className="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Settings Panel Popover */}
                  <AnimatePresence>
                    {settingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-1.5 w-[173px] bg-white rounded-xl border border-slate-200 shadow-lg z-[2100] p-2.5 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-955">Only Unread</span>
                          <button
                            onClick={() => {
                              const nextVal = !onlyUnread;
                              setOnlyUnread(nextVal);
                              updateSettings({ onlyUnread: nextVal, sortOrder });
                            }}
                            className={`relative w-6.5 h-3.5 rounded-full transition-colors border ${onlyUnread ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                          >
                            <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full transition-all ${onlyUnread ? 'left-[14px]' : 'left-[1px]'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-955">Sort</span>
                          <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-px rounded">
                            Latest First
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Modern Single-Tier Navigation Bar */}
            <div className="px-3.5 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'all', label: 'All', count: getUnreadCount('All') },
                  { id: 'Service Call', label: 'Service Calls', count: getUnreadCount('Service Call') },
                  { id: 'Service Material', label: 'Materials', count: getUnreadCount('Service Material') }
                ].map((tab) => {
                  const isActive = activeMainTab === (tab.id === 'all' ? 'All' : tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveMainTab(tab.id === 'all' ? 'All' : tab.id);
                        setActiveSubTab('all');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`text-xs px-1.5 py-0 rounded-full font-bold ${
                          isActive ? 'bg-white text-slate-900' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List Content */}
            <div className="max-h-[403px] overflow-y-auto bg-slate-50/50 flex flex-col min-h-[230px] divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center text-center my-auto">
                  <div className="w-[52px] h-[52px] rounded-full border border-slate-200/80 bg-white shadow-sm flex items-center justify-center mb-3">
                    <Inbox className="w-6 h-6 text-slate-350" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">You're all caught up!</p>
                  <p className="text-sm text-slate-700 max-w-[75%] mt-1 leading-relaxed">
                    No new alerts or escalations pending in this category.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col p-2.5 gap-1.5">
                  <AnimatePresence initial={false}>
                    {filteredNotifications.map((n) => {
                      const visuals = getNotificationVisuals(n);
                      const { title: cleanTitle, message: cleanMessage } = getCleanNotificationContent(n);
                      const IconComp = visuals.icon;
                      const isUnread = !n.isRead;

                      return (
                        <motion.div
                          key={n._id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                          className={`group relative rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer border ${
                            isUnread
                              ? 'bg-white border-slate-200 shadow-[0_3px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.12)]'
                              : 'bg-white/90 border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md'
                          } ${visuals.accentGlow}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          {/* Circular App-Themed Icon on the Left without extra distracting dot */}
                          <div className="relative shrink-0">
                            <div className={`w-[33px] h-[33px] rounded-full flex items-center justify-center border shadow-2xs ${visuals.iconBg}`}>
                              <IconComp className={`w-4 h-4 ${visuals.iconColor}`} />
                            </div>
                          </div>

                          {/* Content Body: Clean layout with non-wrapping title row */}
                          <div className="flex-1 min-w-0 pr-1">
                            {/* Row 1: Title without noisy badge tags */}
                            <div className="flex items-center justify-between">
                              <h4 className={`text-xs truncate ${
                                isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                              }`}>
                                {cleanTitle}
                              </h4>
                            </div>

                            {/* Row 2: Clean, straightforward message */}
                            <p className="text-xs text-slate-650 leading-snug mt-px line-clamp-2 break-words">
                              {cleanMessage}
                            </p>

                            {/* Row 3: Timestamp & Call Number */}
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-700 font-medium">
                              <span>{formatTimeShort(n.createdAt)}</span>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold font-mono text-sm">
                                {n.data?.callNumber || (n.type === 'Service Material' ? 'Material Dispatch' : 'Akira Service')}
                              </span>
                            </div>
                          </div>

                          {/* Right Side: Unread indicator & absolute-pinned dismiss button so it never causes title wrapping */}
                          <div className="relative w-5 flex items-center justify-end shrink-0 self-center">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shadow-xs group-hover:opacity-0 transition-opacity" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n._id);
                              }}
                              title="Dismiss notification"
                              className="absolute right-0 opacity-0 group-hover:opacity-100 p-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
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
            <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center gap-1 text-sm font-bold text-indigo-955 opacity-70">
                <Bell className="w-3 h-3 text-indigo-650" />
                Akira Service Tool
              </div>
              <div className="text-xs font-bold text-slate-700">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Information / Detail Popup Modal */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3.5 animate-in fade-in duration-200"
          onClick={() => setSelectedNotification(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[461px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const visuals = getNotificationVisuals(selectedNotification);
              const IconComp = visuals.icon;
              return (
                <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-xs ${visuals.iconBg}`}>
                      <IconComp className={`w-5 h-5 ${visuals.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-1.5 py-px rounded-sm border uppercase tracking-wider ${visuals.badgeBg}`}>
                          {visuals.badgeText}
                        </span>
                        <span className="text-sm text-slate-700 font-medium">
                          {formatTimeShort(selectedNotification.createdAt)}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mt-1 leading-tight">
                        {selectedNotification.title}
                      </h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="p-1.5 text-slate-700 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 text-slate-700">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Context Details Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {selectedNotification.data?.callNumber && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-xs font-semibold text-slate-700 block uppercase">Call Number</span>
                    <span className="font-bold text-indigo-700 text-xs">
                      #{selectedNotification.data.callNumber}
                    </span>
                  </div>
                )}
                {selectedNotification.priority && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-xs font-semibold text-slate-700 block uppercase">Priority</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedNotification.priority}
                    </span>
                  </div>
                )}
                {selectedNotification.type && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-xs font-semibold text-slate-700 block uppercase">Notification Type</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedNotification.type}
                    </span>
                  </div>
                )}
                {selectedNotification.createdAt && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-xs font-semibold text-slate-700 block uppercase">Received Time</span>
                    <span className="font-semibold text-slate-700 text-xs">
                      {new Date(selectedNotification.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/60">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                Close
              </button>
              {(selectedNotification.data?.callNumber || selectedNotification.type === 'Service Material') && (
                <button
                  onClick={() => handleNavigateToTarget(selectedNotification)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
