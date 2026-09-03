import React, { useState } from 'react';
import { User } from '../types';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { saveUserToServer, fetchServerUsers } from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isSignUp && !username)) {
      setError('Please fill in all required fields.');
      return;
    }

    // Retrieve existing users from localStorage and server
    const existingUsersRaw = localStorage.getItem('foros_users');
    let users: User[] = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
    try {
      const serverUsers = await fetchServerUsers();
      if (serverUsers && serverUsers.length > 0) {
        // Merge without duplicates
        const map = new Map<string, User>();
        users.forEach(u => map.set(u.email.toLowerCase(), u));
        serverUsers.forEach(u => map.set(u.email.toLowerCase(), u));
        users = Array.from(map.values());
      }
    } catch (e) {
      // Continue with local
    }

    if (isSignUp) {
      // Check if email already exists
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        setError('An account with this email already exists.');
        return;
      }

      // Generate a beautiful, vibrant avatar color class
      const colors = [
        'bg-blue-500',
        'bg-indigo-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-rose-500',
        'bg-orange-500',
        'bg-emerald-500',
        'bg-teal-500'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        avatarColor: randomColor,
        joinedDate: new Date().toISOString(),
        subscribers: 0
      };

      users.push(newUser);
      localStorage.setItem('foros_users', JSON.stringify(users));
      localStorage.setItem('foros_current_user', JSON.stringify(newUser));
      
      // Save to server so other devices recognize this creator channel
      try {
        await saveUserToServer(newUser);
      } catch (err) {
        console.warn('Failed to sync new user to server:', err);
      }

      onAuthSuccess(newUser);
      onClose();
    } else {
      // Login flow
      const foundUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!foundUser) {
        setError('Account not found. Please create an account.');
        return;
      }

      localStorage.setItem('foros_current_user', JSON.stringify(foundUser));
      onAuthSuccess(foundUser);
      onClose();
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div id="auth-modal-content" className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-600 w-full" />
        
        {/* Close button */}
        <button
          id="close-auth-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 id="auth-modal-title" className="text-2xl font-bold text-slate-800">
              {isSignUp ? 'Create your Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isSignUp ? 'Join ForosLiveVideo to upload, playlist, and comment.' : 'Log in to manage your videos and interactions.'}
            </p>
          </div>

          {error && (
            <div id="auth-error-alert" className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs rounded-lg font-medium border border-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-username-input"
                    type="text"
                    required
                    placeholder="e.g. CreatorPro"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-sm hover:shadow-md"
            >
              {isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              id="toggle-auth-mode"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs text-violet-600 hover:text-violet-800 font-semibold transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
