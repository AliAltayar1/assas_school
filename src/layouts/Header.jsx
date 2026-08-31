import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfileModal } from '../components/profile/UserProfileModal';

export function Header() {
  const { user, logout } = useAuthStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  const roleBadges = {
    school_admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    secretariat: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    supervisor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    teacher: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow">
              أ
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-none">منصة مدرسة أساس الأكاديمية</h1>
              <p className="text-xs text-teal-400 mt-0.5">Asas School Academic Platform</p>
            </div>
          </div>

          {/* Logged in User Details & Actions */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Clickable Profile Badge */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center space-x-3 space-x-reverse bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-700 transition-all text-right group"
              title="تعديل حسابي الشخصي"
            >
              <User className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${roleBadges[user?.role] || 'bg-slate-700 text-slate-300'}`}>
                  {user?.role_display || user?.role}
                </span>
              </div>
              <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-400 mr-1" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-800/80 p-2.5 rounded-xl transition-colors border border-slate-700 text-xs font-medium"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Profile Management Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
