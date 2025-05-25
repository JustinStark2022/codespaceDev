import { useState, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { 
  LayoutDashboard, 
  Clock, 
  ShieldAlert, 
  BookOpen, 
  BookMarked, 
  MapPin, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Moon, 
  Sun, 
  Users
} from "lucide-react";

interface ParentLayoutProps {
  children: ReactNode;
  title: string;
}

export default function ParentLayout({ children, title }: ParentLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
  };
  
  // Navigation items
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
    { path: "/children", label: "Child Accounts", icon: <Users className="mr-3 h-5 w-5" /> },
    { path: "/screentime", label: "Screen Time", icon: <Clock className="mr-3 h-5 w-5" /> },
    { path: "/monitoring", label: "Content Monitoring", icon: <ShieldAlert className="mr-3 h-5 w-5" /> },
    { path: "/bible", label: "Bible Reader", icon: <BookOpen className="mr-3 h-5 w-5" /> },
    { path: "/lessons", label: "Bible Lessons", icon: <BookMarked className="mr-3 h-5 w-5" /> },
    { path: "/location", label: "Location Tracking", icon: <MapPin className="mr-3 h-5 w-5" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="mr-3 h-5 w-5" /> },
    { path: "/support", label: "Support", icon: <HelpCircle className="mr-3 h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens and mobile when toggled */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-50">
              <img 
                src="https://images.unsplash.com/photo-1535957998253-26ae1ef29506?ixlib=rb-1.2.1&auto=format&fit=crop&w=40&h=40&q=80" 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-lg font-semibold text-primary">Kingdom Kids</span>
          </div>
          <button onClick={closeSidebar} className="text-gray-500 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto h-full scrollbar-hide py-4">
          <div className="px-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=48&h=48&q=80" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-medium text-sm">{user?.first_name} {user?.last_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Parent Account</div>
              </div>
            </div>
          </div>
          
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center px-3 py-2 text-sm rounded-md ${
                    location === item.path
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="px-4 mt-6">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
            <div className="flex items-center">
              <button onClick={toggleSidebar} className="text-gray-500 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="ml-4 lg:ml-0">
                <span className="text-xl font-semibold">{title}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">2</span>
                </button>
              </div>
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleTheme} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
