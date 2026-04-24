import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, GraduationCap, Building2, Calendar, UserPlus,
  ClipboardCheck, Theater, Trophy, Shirt, CreditCard, Home,
  Sparkles, Ticket, ShoppingBag, Heart, Package, Music,
  Award, Ruler, Video, Camera, Clock, Star, Sun, RefreshCw, BarChart3
} from 'lucide-react';
import { apiGet } from '../utils/api';

const sections = [
  {
    title: 'Core Management',
    cards: [
      { icon: BookOpen, label: 'Classes', path: '/classes', endpoint: '/classes', desc: 'Manage dance classes' },
      { icon: Calendar, label: 'Schedules', path: '/schedules', endpoint: '/schedules', desc: 'Class schedules' },
      { icon: UserPlus, label: 'Enrollment', path: '/enrollment', endpoint: '/enrollment', desc: 'Student enrollments' },
      { icon: ClipboardCheck, label: 'Attendance', path: '/attendance', endpoint: '/attendance', desc: 'Track attendance' },
      { icon: Building2, label: 'Studios', path: '/studios', endpoint: '/studios', desc: 'Studio rooms' },
    ],
  },
  {
    title: 'People',
    cards: [
      { icon: Users, label: 'Students', path: '/students', endpoint: '/students', desc: 'Student directory' },
      { icon: GraduationCap, label: 'Teachers', path: '/teachers', endpoint: '/teachers', desc: 'Instructor roster' },
      { icon: Home, label: 'Families', path: '/families', endpoint: '/families', desc: 'Family accounts' },
      { icon: Heart, label: 'Volunteers', path: '/volunteers', endpoint: '/volunteers', desc: 'Volunteer management' },
    ],
  },
  {
    title: 'Events & Performances',
    cards: [
      { icon: Theater, label: 'Recitals', path: '/recitals', endpoint: '/recitals', desc: 'Recital planning' },
      { icon: Trophy, label: 'Competitions', path: '/competitions', endpoint: '/competitions', desc: 'Competition tracking' },
      { icon: Ticket, label: 'Tickets', path: '/tickets', endpoint: '/tickets', desc: 'Event tickets' },
      { icon: Star, label: 'Trial Classes', path: '/trial-classes', endpoint: '/trial-classes', desc: 'Trial sessions' },
      { icon: Sun, label: 'Summer Intensives', path: '/summer-intensives', endpoint: '/summer-intensives', desc: 'Summer programs' },
      { icon: RefreshCw, label: 'Makeup Classes', path: '/makeup-classes', endpoint: '/makeup-classes', desc: 'Makeup sessions' },
    ],
  },
  {
    title: 'Finance',
    cards: [
      { icon: CreditCard, label: 'Billing', path: '/billing', endpoint: '/billing', desc: 'Invoices & payments' },
      { icon: ShoppingBag, label: 'Merchandise', path: '/merchandise', endpoint: '/merchandise', desc: 'Studio merchandise' },
      { icon: BarChart3, label: 'Financial Reports', path: '/financial-reports', endpoint: '/financial-reports', desc: 'Revenue analytics' },
    ],
  },
  {
    title: 'Resources',
    cards: [
      { icon: Shirt, label: 'Costumes', path: '/costumes', endpoint: '/costumes', desc: 'Costume inventory' },
      { icon: Package, label: 'Props', path: '/props', endpoint: '/props', desc: 'Prop inventory' },
      { icon: Music, label: 'Music Licensing', path: '/music', endpoint: '/music', desc: 'Music rights' },
      { icon: Video, label: 'Videos', path: '/videos', endpoint: '/videos', desc: 'Video library' },
      { icon: Camera, label: 'Photos', path: '/photos', endpoint: '/photos', desc: 'Photo gallery' },
      { icon: Award, label: 'Achievements', path: '/achievements', endpoint: '/achievements', desc: 'Awards & badges' },
      { icon: Ruler, label: 'Measurements', path: '/measurements', endpoint: '/measurements', desc: 'Student measurements' },
      { icon: Clock, label: 'Waitlist', path: '/waitlist', endpoint: '/waitlist', desc: 'Waitlist management' },
    ],
  },
  {
    title: 'AI Features',
    cards: [
      { icon: Sparkles, label: 'AI Features', path: '/ai', endpoint: null, desc: 'AI-powered tools', count: 6 },
    ],
  },
];

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const allCards = sections.flatMap((s) => s.cards).filter((c) => c.endpoint);
    allCards.forEach(async (card) => {
      try {
        const data = await apiGet(card.endpoint);
        const arr = Array.isArray(data) ? data : data?.data || data?.results || [];
        setCounts((prev) => ({ ...prev, [card.endpoint]: Array.isArray(arr) ? arr.length : 0 }));
      } catch {
        setCounts((prev) => ({ ...prev, [card.endpoint]: 0 }));
      }
    });
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome to AI Dance Studio Manager</h1>
        <p>Manage every aspect of your dance studio with AI-powered tools</p>
      </div>
      {sections.map((section) => (
        <div key={section.title} className="dashboard-section">
          <h2 className="section-title">{section.title}</h2>
          <div className="card-grid">
            {section.cards.map((card) => {
              const Icon = card.icon;
              const count = card.count ?? counts[card.endpoint] ?? '...';
              return (
                <div key={card.path} className="dashboard-card" onClick={() => navigate(card.path)}>
                  <div className="card-icon-wrap">
                    <Icon size={28} />
                  </div>
                  <div className="card-info">
                    <h3>{card.label}</h3>
                    <p>{card.desc}</p>
                  </div>
                  <span className="card-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
