'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Grade Papers', href: '/', icon: '📝' },
    { name: 'Analytics', href: '/analytics', icon: '📊' },
    { name: 'Worksheets', href: '/worksheets', icon: '📋' },
    { name: 'Knowledge Base', href: '/knowledge', icon: '🧠' },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-indigo-600 text-white font-black text-xl rounded-lg w-8 h-8 flex items-center justify-center shadow-lg shadow-indigo-500/30">O</div>
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block tracking-tight">OmniLearn</span>
          </div>

          {/* Nav Links */}
          <div className="flex gap-1 md:gap-4 overflow-x-auto no-scrollbar ml-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className={isActive ? 'opacity-100' : 'opacity-90'}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
