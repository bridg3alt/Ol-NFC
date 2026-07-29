'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Pill,
  Calendar,
  Mic,
  Lightbulb,
  Bluetooth,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  Bell,
  ChevronLeft,
  LogOut,
  Accessibility,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import AuthGuard from '@/components/AuthGuard';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <DashboardChrome>{children}</DashboardChrome>
    </AuthGuard>
  );
}

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/medications', icon: Pill, label: 'Medications' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/voice', icon: Mic, label: 'Voice Prompts' },
  { href: '/led', icon: Lightbulb, label: 'LED Display' },
  { href: '/bottle', icon: Bluetooth, label: 'Bottle' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/help', icon: HelpCircle, label: 'Help' },
];

function DashboardChrome({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  // Notification state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const iconForNotification = (type: string) => {
    if (type === 'medication_taken') return CheckCircle;
    if (type === 'medication_missed' || type === 'battery_low') return AlertCircle;
    return Clock;
  };

  const toneForNotification = (type: string) => {
    if (type === 'medication_taken') return 'success';
    if (type === 'medication_missed' || type === 'battery_low') return 'warning';
    return 'info';
  };

  // Accessibility state
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [dyslexiaFriendly, setDyslexiaFriendly] = useState(false);
  const [textSpacing, setTextSpacing] = useState<'normal' | 'wide' | 'extra_wide'>('normal');
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('normal');

  // Get font size class
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  // Get text spacing class
  const getTextSpacingClass = () => {
    switch (textSpacing) {
      case 'wide': return 'text-spacing-wide';
      case 'extra_wide': return 'text-spacing-extra-wide';
      default: return '';
    }
  };

  // Get line height class
  const getLineHeightClass = () => {
    switch (lineHeight) {
      case 'relaxed': return 'line-height-relaxed';
      case 'loose': return 'line-height-loose';
      default: return '';
    }
  };

  // Get cursor class
  const getCursorClass = () => bigCursor ? 'cursor-big' : '';

  // Get dyslexia friendly class
  const getDyslexiaClass = () => dyslexiaFriendly ? 'font-dyslexia' : '';

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="Olvia Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-semibold text-lg text-gray-900">Olvia</span>
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAccessibilityOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Accessibility"
          >
            <Accessibility className="w-6 h-6 text-gray-600" />
          </button>
          <button 
            onClick={() => setIsNotificationOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 relative"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsSidebarOpen(false)}>
            <img src="/logo.jpeg" alt="Olvia Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-semibold text-lg text-gray-900">Olvia</span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40">
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Olvia Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl text-gray-900">Olvia</span>
          </Link>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsAccessibilityOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Accessibility"
            >
              <Accessibility className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
            </button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === item.href
                  ? 'bg-primary-50 text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-1">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`md:ml-64 min-h-screen pt-16 md:pt-0 ${getFontSizeClass()} ${getTextSpacingClass()} ${getLineHeightClass()} ${bigCursor ? 'cursor-big' : ''} ${getDyslexiaClass()} ${highContrast ? 'high-contrast' : ''}`}>
        <div className={`container-app py-6 md:py-8 ${highContrast ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 ${
              pathname === item.href ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Notification Panel */}
      {isNotificationOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsNotificationOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-gray-900">Notifications</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No notifications yet</p>
              ) : (
                notifications.map((notification) => {
                  const tone = toneForNotification(notification.type);
                  const Icon = iconForNotification(notification.type);

                  return (
                    <button
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-opacity ${
                        notification.isRead ? 'opacity-60' : ''
                      } ${
                        tone === 'success' ? 'bg-green-50 border-green-200' :
                        tone === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${
                          tone === 'success' ? 'text-green-600' :
                          tone === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            tone === 'success' ? 'text-green-900' :
                            tone === 'warning' ? 'text-yellow-900' :
                            'text-blue-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Accessibility Panel */}
      {isAccessibilityOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsAccessibilityOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-gray-900">Accessibility</h2>
              <button 
                onClick={() => setIsAccessibilityOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Font Size
                </label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`flex-1 py-2 px-4 rounded-lg border ${
                        fontSize === size 
                          ? 'border-primary-500 bg-primary-50 text-primary-600' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    High Contrast
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Increase contrast for better visibility
                  </p>
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    highContrast ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Accessibility Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Accessibility Mode
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable screen reader optimizations
                  </p>
                </div>
                <button
                  onClick={() => setAccessibilityMode(!accessibilityMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    accessibilityMode ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    accessibilityMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Big Cursor */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Big Cursor
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Larger cursor for easier clicking
                  </p>
                </div>
                <button
                  onClick={() => setBigCursor(!bigCursor)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    bigCursor ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    bigCursor ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Dyslexia Friendly */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dyslexia Friendly
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Use OpenDyslexic font for readability
                  </p>
                </div>
                <button
                  onClick={() => setDyslexiaFriendly(!dyslexiaFriendly)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    dyslexiaFriendly ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    dyslexiaFriendly ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Text Spacing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Text Spacing
                </label>
                <div className="flex gap-2">
                  {(['normal', 'wide', 'extra_wide'] as const).map((spacing) => (
                    <button
                      key={spacing}
                      onClick={() => setTextSpacing(spacing)}
                      className={`flex-1 py-2 px-4 rounded-lg border ${
                        textSpacing === spacing 
                          ? 'border-primary-500 bg-primary-50 text-primary-600' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {spacing === 'normal' ? 'Normal' : spacing === 'wide' ? 'Wide' : 'Extra Wide'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Line Height
                </label>
                <div className="flex gap-2">
                  {(['normal', 'relaxed', 'loose'] as const).map((height) => (
                    <button
                      key={height}
                      onClick={() => setLineHeight(height)}
                      className={`flex-1 py-2 px-4 rounded-lg border ${
                        lineHeight === height 
                          ? 'border-primary-500 bg-primary-50 text-primary-600' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {height === 'normal' ? 'Normal' : height === 'relaxed' ? 'Relaxed' : 'Loose'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className={`p-4 rounded-lg border ${highContrast ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`${highContrast ? 'text-white' : 'text-gray-900'} ${getFontSizeClass()} ${getTextSpacingClass()} ${getLineHeightClass()} font-medium`}>
                  Preview Text
                </p>
                <p className={`${highContrast ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1 ${getTextSpacingClass()} ${getLineHeightClass()}`}>
                  This is how your content will appear with current settings.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
