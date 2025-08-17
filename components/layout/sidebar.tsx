'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  BarChart3,
  Users,
  Phone,
  Briefcase,
  MessageSquare,
  Package,
  ShoppingCart,
  Wallet,
  FileText,
  Calendar,
  PieChart,
  TrendingUp,
  Settings,
  Building,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  {
    name: 'CRM',
    icon: Users,
    children: [
      { name: 'Contacts', href: '/crm/contacts', icon: Phone },
      { name: 'Opportunities', href: '/crm/opportunities', icon: Briefcase },
      { name: 'Communications', href: '/crm/communications', icon: MessageSquare },
    ],
  },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Wallet & Investments', href: '/wallet', icon: Wallet },
  {
    name: 'Compliance',
    icon: FileText,
    children: [
      { name: 'Tasks & Deadlines', href: '/compliance/tasks', icon: Calendar },
      { name: 'Cap Table & ESOPs', href: '/compliance/cap-table', icon: PieChart },
      { name: 'Runway & Scenarios', href: '/compliance/runway', icon: TrendingUp },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Company Profile', href: '/settings/company', icon: Building },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['CRM', 'Compliance']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">SME Platform</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => !collapsed && toggleExpanded(item.name)}
                  className={cn(
                    'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                    collapsed && 'justify-center'
                  )}
                >
                  <item.icon className={cn('flex-shrink-0 w-5 h-5', !collapsed && 'mr-3')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 transition-transform',
                          expandedItems.includes(item.name) && 'rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && expandedItems.includes(item.name) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                          pathname === child.href
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <child.icon className="mr-3 w-4 h-4" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                  collapsed && 'justify-center'
                )}
              >
                <item.icon className={cn('flex-shrink-0 w-5 h-5', !collapsed && 'mr-3')} />
                {!collapsed && item.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}