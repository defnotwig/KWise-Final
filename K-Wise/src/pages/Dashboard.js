import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../utils/networkConfig';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import GlobalSearch from '../components/GlobalSearch';
import NotificationCenter from '../components/NotificationCenter';
import MessagingCenter from '../components/MessagingCenter';
import {
  Bell,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Search,
  LogOut
} from 'lucide-react';

const baseLogger = globalThis.window?.console || globalThis.console || {
  log: () => {},
  warn: () => {},
  error: () => {}
};

const logger = process.env.NODE_ENV === 'test'
  ? { ...baseLogger, log: () => {}, warn: () => {}, error: () => {} }
  : baseLogger;

const getActivityKey = (activity) => (
  activity.id || `${activity.created_at || activity.timestamp || 'no-time'}-${activity.action || activity.description || 'no-action'}`
);

const getNotificationKey = (notification) => (
  notification.id || `${notification.created_at || notification.timestamp || 'no-time'}-${notification.message || notification.content || 'no-message'}`
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();

  usePresence();

  const fetchingRef = React.useRef(false);

  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentActivity: [],
    notifications: [],
    loading: true,
    error: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState({
    onlineUsers: 0,
    unreadMessages: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }

      if (event.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setDashboardData((previousState) => ({ ...previousState, loading: true, error: null }));

      logger.log(`[Dashboard] Fetching data for ${user.role}: ${user.name}`);

      const [statsRes, activityRes, notificationsRes] = await Promise.all([
        fetch(`${getServerBaseUrl()}/api/dashboard/stats`, {
          credentials: 'include'
        }),
        fetch(`${getServerBaseUrl()}/api/dashboard-enhanced/activity?limit=10`, {
          credentials: 'include'
        }),
        fetch(`${getServerBaseUrl()}/api/notifications?unread=true`, {
          credentials: 'include'
        })
      ]);

      if (!statsRes.ok) throw new Error(`Stats API error: ${statsRes.status}`);
      if (!activityRes.ok) throw new Error(`Activity API error: ${activityRes.status}`);
      if (!notificationsRes.ok) throw new Error(`Notifications API error: ${notificationsRes.status}`);

      const [stats, activity, notifications] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
        notificationsRes.json()
      ]);

      logger.log(`[Dashboard] Data received for ${user.role}:`, {
        stats: stats.success,
        activity: activity.success,
        notifications: notifications.success
      });

      setDashboardData({
        stats: stats.data || stats,
        recentActivity: activity.data || activity,
        notifications: notifications.data?.notifications || notifications.data || notifications,
        loading: false,
        error: null
      });
    } catch (error) {
      logger.error(`[Dashboard] Fetch error for ${user.role}:`, error);
      setDashboardData((previousState) => ({
        ...previousState,
        loading: false,
        error: `Failed to load dashboard data: ${error.message}`
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.id, user?.role, user?.name]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchDashboardData();
  }, [fetchDashboardData, user?.id]);

  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data) => {
      setRealTimeUpdates((previousState) => ({
        ...previousState,
        onlineUsers: data.onlineUsers || previousState.onlineUsers
      }));
    };

    const handleNewMessage = () => {
      setRealTimeUpdates((previousState) => ({
        ...previousState,
        unreadMessages: previousState.unreadMessages + 1
      }));
    };

    const handleNewNotification = (notification) => {
      setDashboardData((previousState) => ({
        ...previousState,
        notifications: [notification, ...previousState.notifications.slice(0, 4)]
      }));
    };

    const handleOrderUpdate = (data) => {
      if (data.status === 'pending') {
        setRealTimeUpdates((previousState) => ({
          ...previousState,
          pendingOrders: previousState.pendingOrders + 1
        }));
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:new', handleNewMessage);
    socket.on('notification:new', handleNewNotification);
    socket.on('order:update', handleOrderUpdate);
    socket.emit('presence:get-online-count');

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:new', handleNewMessage);
      socket.off('notification:new', handleNewNotification);
      socket.off('order:update', handleOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }

      if (event.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const enhancedStats = useMemo(() => {
    if (!dashboardData.stats) return null;

    return {
      totalUsers: dashboardData.stats.totalUsers || 0,
      activeUsers: Math.max(dashboardData.stats.activeUsers || 0, realTimeUpdates.onlineUsers),
      totalOrders: dashboardData.stats.totalOrders || 0,
      totalRevenue: dashboardData.stats.totalRevenue || dashboardData.stats.totalValue || 0,
      lowStockProducts: dashboardData.stats.lowStockProducts || 0,
      unreadMessages: realTimeUpdates.unreadMessages,
      pendingOrders: realTimeUpdates.pendingOrders
    };
  }, [dashboardData.stats, realTimeUpdates]);

  const handleRefresh = useCallback(() => {
    if (!dashboardData.loading && !fetchingRef.current) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, dashboardData.loading]);

  if (dashboardData.loading && !dashboardData.stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                K-Wise Admin Dashboard
              </h1>
              {user?.role === 'superadmin' && (
                <span className="ml-3 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                  SUPERADMIN
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {realTimeUpdates.onlineUsers} online
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Search (Ctrl+K)"
              >
                <Search className="h-5 w-5" />
              </button>

              <NotificationCenter />
              <MessagingCenter />

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, orders, products..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">Escape</kbd> to close
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {enhancedStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={enhancedStats.totalUsers}
              icon={Users}
              color="blue"
              subtitle={`${enhancedStats.activeUsers} online`}
            />
            <StatCard
              title="Total Orders"
              value={enhancedStats.totalOrders}
              icon={ShoppingCart}
              color="green"
              subtitle={`${enhancedStats.pendingOrders} pending`}
            />
            <StatCard
              title="Revenue"
              value={`₱${(enhancedStats.totalRevenue / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              color="yellow"
              subtitle="This month"
            />
            <StatCard
              title="Low Stock"
              value={enhancedStats.lowStockProducts}
              icon={Activity}
              color="red"
              subtitle="Items below 5"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <button
                onClick={handleRefresh}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
                disabled={dashboardData.loading}
              >
                {dashboardData.loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity) => (
                  <div key={getActivityKey(activity)} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {activity.description || activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.created_at || activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
            <div className="space-y-3">
              {dashboardData.notifications.length > 0 ? (
                dashboardData.notifications.map((notification) => (
                  <div key={getNotificationKey(notification)} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0">
                      <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {notification.message || notification.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(notification.created_at || notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No new notifications</p>
              )}
            </div>
          </div>
        </div>

        {dashboardData.error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{dashboardData.error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {showSearch && (
          <GlobalSearch
            isOpen={showSearch}
            onClose={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200 hover:shadow-xl">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.oneOf(['blue', 'green', 'yellow', 'red']).isRequired,
  subtitle: PropTypes.string
};

export default Dashboard;
