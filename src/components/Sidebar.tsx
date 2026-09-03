import React from 'react';
import { Home, FolderHeart, LayoutDashboard, ShieldCheck, HelpCircle, User } from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'playlists' | 'creator-hub' | 'copyright' | 'profile';
  setActiveTab: (tab: 'home' | 'playlists' | 'creator-hub' | 'copyright' | 'profile') => void;
  playlistCount: number;
  scheduledCount: number;
}

export default function Sidebar({ activeTab, setActiveTab, playlistCount, scheduledCount }: SidebarProps) {
  const navItems = [
    { 
      id: 'home' as const, 
      label: 'Home Feed', 
      icon: Home,
      badge: null
    },
    { 
      id: 'playlists' as const, 
      label: 'Playlists', 
      icon: FolderHeart,
      badge: playlistCount > 0 ? playlistCount : null
    },
    { 
      id: 'creator-hub' as const, 
      label: 'Creator Hub', 
      icon: LayoutDashboard,
      badge: scheduledCount > 0 ? `${scheduledCount} pending` : null
    },
    { 
      id: 'copyright' as const, 
      label: 'Copyright Central', 
      icon: ShieldCheck,
      badge: 'active'
    },
    {
      id: 'profile' as const,
      label: 'My Profile',
      icon: User,
      badge: null
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-100 p-5 shrink-0 hidden md:flex flex-col bg-white justify-between h-[calc(100vh-64px)] sticky top-16">
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-3 mb-2">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isActive 
                      ? 'bg-violet-200/50 text-violet-800' 
                      : item.badge === 'active' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand footer */}
      <div className="pt-4 border-t border-slate-50 space-y-1.5 pl-3">
        <p className="text-[10px] text-slate-400 font-semibold">ForosLiveVideo Platform</p>
        <p className="text-[9px] text-slate-400 font-medium">Version 1.4.0 • Secure Local Storage</p>
      </div>
    </aside>
  );
}
