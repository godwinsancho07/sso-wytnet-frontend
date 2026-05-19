import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Shield, LogOut, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { getSidebarByRole, getRoleLabel, SidebarItem } from '@/config/sidebar';

export default function AdminLayout() {
  const { user, permissions, logout } = useAuthStore();
  const navigate = useNavigate();

  const items = getSidebarByRole(permissions);
  const brandLabel = getRoleLabel(permissions);
  const homeRoute = items.find((i) => i.section === 'main')?.to || '/dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const main = items.filter((i) => i.section === 'main');
  const self = items.filter((i) => i.section === 'self');

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link to={homeRoute} className="flex items-center gap-2 text-white font-bold">
            <Shield className="w-5 h-5" />
            {brandLabel}
          </Link>
          <p className="text-xs text-gray-500 mt-2 truncate">{user?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 text-sm">
          {main.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          {self.length > 0 && (
            <div className="border-t border-gray-800 mt-4 pt-4">
              {self.map((item) => (
                <SidebarLink key={item.to} item={item} />
              ))}
            </div>
          )}
        </nav>

        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      <main className="flex-1 bg-gray-50 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ item }: { item: SidebarItem }) {
  const Icon = item.icon;
  const { pathname } = useLocation();

  const hasActiveChild = item.children?.some(child => pathname.startsWith(child.to));
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  if (item.children) {
    return (
      <div className="space-y-1">
        <button
          onClick={toggleOpen}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded transition-colors text-left text-gray-300 hover:bg-gray-800 hover:text-white',
            hasActiveChild && 'bg-gray-800 text-white font-semibold'
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          <ChevronDown className={clsx(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )} />
        </button>

        {isOpen && (
          <div className="pl-6 space-y-1 border-l border-gray-800 ml-4">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = pathname.startsWith(child.to);
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
                    isChildActive
                      ? 'bg-gray-800 text-white font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to || '#'}
      end
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 px-3 py-2 rounded transition-colors',
          isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white',
        )
      }
    >
      <Icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  );
}
