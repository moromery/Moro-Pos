import React, { useState } from 'react';
import { Page, Notification, User } from '../types';
import { NAV_ITEMS } from '../constants';
import { PERMISSIONS } from '../permissions';
import { useTranslation } from '../contexts/LanguageContext';
import { logo } from '../assets/logo';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User | null;
  logout: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, currentUser, logout }) => {
  const { t, language } = useTranslation();
  if (!currentUser) return null;

  const visibleNavItems = NAV_ITEMS.filter(item => 
    PERMISSIONS[currentUser.role].includes(item.id)
  );

  return (
    <aside className="w-64 bg-white text-gray-800 flex flex-col shadow-lg">
      <div className="p-4 border-b">
        <img src={logo} alt="Moro POS Logo" className="h-12 w-auto mx-auto mb-4" />
        <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-800 text-lg">{t('sidebarWelcome', currentUser.username)}</p>
            <p className="text-sm text-gray-500 capitalize bg-blue-100 text-blue-700 font-medium inline-block px-2 py-0.5 rounded-full mt-1">{currentUser.role}</p>
            
            <button
                onClick={logout}
                className="w-full mt-4 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="font-semibold">{t('sidebarLogout')}</span>
            </button>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {visibleNavItems.map((item) => (
            <li key={item.id} className="mb-2">
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                  activePage === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                {item.icon}
                <span className={`${language === 'ar' ? 'mr-4' : 'ml-4'} font-semibold`}>{t(item.label)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t text-center">
        <p className="text-xs text-gray-400">&copy; 2024 - Moro POS</p>
      </div>
    </aside>
  );
};

export default Sidebar;