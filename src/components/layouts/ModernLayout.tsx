import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Clock, 
  CheckSquare, 
  LayoutDashboard, 
  Database, 
  Menu, 
  X, 
  LogOut, 
  User,
  ChevronDown,
  Wallet
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletConnector from '../Wallet/WalletConnector';
import './ModernLayout.css';

interface ModernLayoutProps {
  children: ReactNode;
  user: any;
  onSignOut: () => void;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ children, user, onSignOut }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const location = useLocation();
  const { connected } = useWallet();

  const handleWalletConnection = (connected: boolean) => {
    setWalletConnected(connected);
  };

  const navItems = [
    { path: '/', icon: <Clock size={20} />, label: 'LockIn' },
    { path: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/sql-playground', icon: <Database size={20} />, label: 'Playground' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <div className="modern-layout">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="text-gradient">Web3</span>Lock
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {location.pathname === item.path && <div className="active-indicator" />}
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="wallet-status">
            <Wallet size={16} />
            <span>{walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}</span>
            <div className={`status-dot ${walletConnected ? 'connected' : 'disconnected'}`} />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main-content">
        {/* Top navigation bar */}
        <header className="top-navbar">
          <div className="mobile-toggle" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </div>
          
          <div className="navbar-brand">
            <span className="text-gradient">Web3</span>Lock
          </div>
          
          <div className="navbar-actions">
            <WalletConnector 
              onConnectionChange={handleWalletConnection} 
              isUserLoggedIn={!!user}
            />
            
            <div className="user-menu-container">
              <button className="user-menu-button" onClick={toggleUserMenu}>
                <div className="user-avatar">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <span className="user-name">{user?.displayName || user?.email}</span>
                <ChevronDown size={16} />
              </button>
              
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-avatar large">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user?.displayName || 'User'}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider" />
                  
                  <button className="dropdown-item">
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  
                  <button className="dropdown-item" onClick={onSignOut}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu">
            <nav className="mobile-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
        
        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ModernLayout; 