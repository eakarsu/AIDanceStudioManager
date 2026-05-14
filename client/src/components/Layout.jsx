import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, GraduationCap, Building2, Calendar, UserPlus,
  ClipboardCheck, Theater, Trophy, Shirt, CreditCard, Home,
  Sparkles, Ticket, ShoppingBag, Heart, Package, Music,
  Award, Ruler, Video, Camera, Clock, Star, Sun, RefreshCw,
  BarChart3, LayoutDashboard, LogOut, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { heading: 'Core' },
  { path: '/classes', label: 'Classes', icon: BookOpen },
  { path: '/schedules', label: 'Schedules', icon: Calendar },
  { path: '/enrollment', label: 'Enrollment', icon: UserPlus },
  { path: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { path: '/studios', label: 'Studios', icon: Building2 },
  { heading: 'People' },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/teachers', label: 'Teachers', icon: GraduationCap },
  { path: '/families', label: 'Families', icon: Home },
  { path: '/volunteers', label: 'Volunteers', icon: Heart },
  { heading: 'Events' },
  { path: '/recitals', label: 'Recitals', icon: Theater },
  { path: '/competitions', label: 'Competitions', icon: Trophy },
  { path: '/tickets', label: 'Tickets', icon: Ticket },
  { path: '/trial-classes', label: 'Trial Classes', icon: Star },
  { path: '/summer-intensives', label: 'Summer Intensives', icon: Sun },
  { path: '/makeup-classes', label: 'Makeup Classes', icon: RefreshCw },
  { heading: 'Finance' },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/merchandise', label: 'Merchandise', icon: ShoppingBag },
  { path: '/financial-reports', label: 'Financial Reports', icon: BarChart3 },
  { heading: 'Resources' },
  { path: '/costumes', label: 'Costumes', icon: Shirt },
  { path: '/props', label: 'Props', icon: Package },
  { path: '/music', label: 'Music', icon: Music },
  { path: '/videos', label: 'Videos', icon: Video },
  { path: '/photos', label: 'Photos', icon: Camera },
  { path: '/achievements', label: 'Achievements', icon: Award },
  { path: '/measurements', label: 'Measurements', icon: Ruler },
  { path: '/waitlist', label: 'Waitlist', icon: Clock },
  { heading: 'AI' },
  { path: '/ai', label: 'AI Features', icon: Sparkles },
  { path: '/ai-advanced', label: 'AI Advanced', icon: Sparkles },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={`layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && <h2 className="sidebar-brand">AI Dance Studio</h2>}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.heading) {
              return sidebarOpen ? (
                <div key={i} className="nav-heading">{item.heading}</div>
              ) : (
                <div key={i} className="nav-divider" />
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="main-area">
        <header className="top-header">
          {!sidebarOpen && (
            <button className="sidebar-toggle-mobile" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
          )}
          <div className="header-brand">AI Dance Studio Manager</div>
          <div className="header-actions">
            <span className="header-user">Admin</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
