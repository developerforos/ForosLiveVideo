import React, { useState } from 'react';
import { User, Notification } from '../types';
import { Play, Search, Upload, Bell, UserPlus, LogOut, Trash2, CheckCircle2, User as UserIcon, X } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: Notification[];
  onClearNotifications: () => void;
  onReadNotification: (id: string) => void;
  onOpenProfile?: () => void;
  onBrandClick?: () => void;
}

export default function Navbar({
  currentUser,
  onOpenAuth,
  onOpenUpload,
  onLogout,
  searchQuery,
  setSearchQuery,
  notifications,
  onClearNotifications,
  onReadNotification,
  onOpenProfile,
  onBrandClick
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="h-16 border-b border-slate-100 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Logo - hidden if mobile search is open */}
      <div 
        onClick={onBrandClick} 
        className={`items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity ${
          showMobileSearch ? 'hidden' : 'flex'
        }`}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-slate-800">Foros<span className="text-violet-600 font-extrabold">LiveVideo</span></span>
          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-[-2px]">Streaming Hub</p>
        </div>
      </div>

      {/* Global Search Bar (Desktop) */}
      <div className="flex-1 max-w-md mx-6 hidden sm:block">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="navbar-search"
            type="text"
            placeholder="Search channels, creators, or videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 focus:bg-white transition-all font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile-Only Full Search Bar */}
      {showMobileSearch && (
        <div className="flex-1 flex items-center gap-2 animate-fade-in sm:hidden">
          <div className="relative flex-1 flex items-center">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="navbar-mobile-search"
              type="text"
              placeholder="Search channels, creators, videos..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 focus:bg-white transition-all font-semibold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button 
            onClick={() => {
              setShowMobileSearch(false);
              setSearchQuery('');
            }}
            className="p-2 text-slate-400 hover:text-slate-600 shrink-0"
            title="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Right actions */}
      <div className={`items-center gap-2.5 sm:gap-3 ${showMobileSearch ? 'hidden sm:flex' : 'flex'}`}>
        {/* Mobile Search Toggle Trigger */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors sm:hidden cursor-pointer"
          title="Search Videos & Channels"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Upload Trigger */}
        <button
          id="navbar-upload-btn"
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">Upload Video</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            id="navbar-notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileDropdown(false);
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-700">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <p className="text-xs font-medium">No alerts or notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onReadNotification(notif.id)}
                      className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-slate-50/50 flex items-start gap-2.5 ${
                        notif.read ? 'opacity-60' : 'bg-violet-50/10 font-medium'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                        notif.type === 'success' ? 'text-emerald-500' : notif.type === 'warning' ? 'text-rose-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <p className="font-bold text-slate-800 leading-snug">{notif.title}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{notif.message}</p>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile / Signup Trigger */}
        {currentUser ? (
          <div className="relative">
            <button
              id="navbar-profile-btn"
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 border border-slate-100">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-full h-full ${currentUser.avatarColor} text-white font-bold flex items-center justify-center text-xs uppercase`}>
                    {currentUser.username.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 pr-1 max-w-[80px] truncate hidden sm:inline">
                {currentUser.username}
              </span>
            </button>

             {showProfileDropdown && (
              <div className="absolute right-0 mt-2.5 w-48 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
                <div className="p-3 bg-slate-50/60 border-b border-slate-50 text-xs">
                  <p className="font-black text-slate-700 truncate">{currentUser.username}</p>
                  <p className="text-slate-400 text-[10px] truncate mt-0.5">{currentUser.email}</p>
                </div>

                {onOpenProfile && (
                  <button
                    id="navbar-profile-view"
                    onClick={() => {
                      onOpenProfile();
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-bold text-left transition-colors border-b border-slate-50"
                  >
                    <UserIcon className="w-4 h-4 text-violet-600" />
                    My Profile
                  </button>
                )}
                
                <button
                  id="navbar-profile-logout"
                  onClick={() => {
                    onLogout();
                    setShowProfileDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-xs font-bold text-left transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            id="navbar-signin-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-violet-600" />
            <span>Create Account</span>
          </button>
        )}
      </div>
    </nav>
  );
}
