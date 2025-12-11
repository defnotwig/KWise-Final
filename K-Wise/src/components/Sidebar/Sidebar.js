import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from "../../assets/logo.webp";
import {
    FiHome, FiPackage, FiClock, FiList,
    FiSettings, FiUsers, FiLogOut, FiActivity, FiTool, FiDatabase, FiCpu
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
    const { currentUser, logout } = useAuth();

    // Initialize user role from localStorage
    const [userRole, setUserRole] = useState(() => {
        try {
            // First try from currentUser
            if (currentUser?.role) {
                return currentUser.role;
            }

            // Then try from direct localStorage for currentUser
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser?.role) {
                    return parsedUser.role;
                }
            }

            // Then fall back to separate userRole in localStorage
            const role = localStorage.getItem('userRole');
            if (role) {
                return role;
            }
        } catch (e) {
            console.error('Error getting user role:', e);
        }

        // Default fallback role
        return 'admin';
    });

    const navItems = [
        {
            to: '/admin/dashboard',
            icon: <FiHome />,
            label: 'Dashboard',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'View system analytics and KPIs'
        },
        {
            to: '/admin/stock',
            icon: <FiPackage />,
            label: 'Stock',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'Manage inventory and stock levels'
        },
        {
            to: '/admin/history',
            icon: <FiClock />,
            label: 'Transaction History',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'View transaction records and reports'
        },
        {
            to: '/admin/order-queue',
            icon: <FiList />,
            label: 'Order Queue',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'Manage and process orders'
        },
        {
            to: '/admin/log-history',
            icon: <FiActivity />,
            label: 'Log History',
            roles: ['superadmin'],
            description: 'Monitor all user activities and system events'
        },
        {
            to: '/admin/cache-performance',
            icon: <FiDatabase />,
            label: 'Cache Performance',
            roles: ['superadmin', 'admin', 'developer'],
            description: 'Monitor cache performance and statistics'
        },
        {
            to: '/admin/system-metrics',
            icon: <FiCpu />,
            label: 'System Metrics',
            roles: ['superadmin', 'admin', 'developer'],
            description: 'Monitor system performance and health'
        },
        {
            to: '/admin/rule-builder',
            icon: <FiTool />,
            label: 'Rule Builder',
            roles: ['superadmin'],
            description: 'Create and manage compatibility rules'
        },
        {
            to: '/admin/accounts',
            icon: <FiUsers />,
            label: 'Accounts',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'Manage user accounts and permissions'
        },
        {
            to: '/admin/settings',
            icon: <FiSettings />,
            label: 'Settings',
            roles: ['admin', 'superadmin', 'developer'],
            description: 'Configure system settings'
        },
        {
            to: '/admin/developer-tools',
            icon: <FiTool />,
            label: 'Developer Tools',
            roles: ['superadmin', 'developer'],
            description: 'Access development and debugging tools'
        },
    ];

    // Update role when currentUser changes
    useEffect(() => {
        if (currentUser?.role) {
            console.log('Setting userRole from currentUser:', currentUser.role);
            setUserRole(currentUser.role);
            localStorage.setItem('userRole', currentUser.role);
        } else {
            try {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser?.role) {
                        console.log('Setting userRole from localStorage:', parsedUser.role);
                        setUserRole(parsedUser.role);
                        localStorage.setItem('userRole', parsedUser.role);
                    }
                }
            } catch (e) {
                console.error('Error updating user role:', e);
            }
        }
    }, [currentUser]);

    const handleLogout = () => {
        console.log('Logging out from sidebar');
        logout();
        // No need to navigate here as the logout function in AuthContext will handle redirection
    };

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} alt="PC WISE" className="logopcswise" />
                <h1>PC WISE</h1>
            </div>
            <nav className="nav-menu">
                {navItems.map((item) => {
                    // Check if user has permission to see this menu item
                    if (!userRole || !item.roles.includes(userRole)) {
                        return null;
                    }
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <span className="icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    );
                })}

                <button className="logout-btn nav-item" onClick={handleLogout}>
                    <span className="icon"><FiLogOut /></span>
                    <span className="nav-label">Logout</span>
                </button>
            </nav>
        </div>
    );
};

export default Sidebar;