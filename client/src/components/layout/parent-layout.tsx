import { useState, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import Castle from "@/components/ui/castle";

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
    { path: "/parental-control-center", label: "Control Center", icon: <ShieldAlert className="mr-3 h-5 w-5" /> },
    { path: "/bible", label: "Bible Reader", icon: <BookOpen className="mr-3 h-5 w-5" /> },
    { path: "/lessons", label: "Bible Lessons", icon: <BookMarked className="mr-3 h-5 w-5" /> },
    { path: "/location", label: "Location Tracking", icon: <MapPin className="mr-3 h-5 w-5" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="mr-3 h-5 w-5" /> },
    { path: "/support", label: "Support", icon: <HelpCircle className="mr-3 h-5 w-5" /> },
  ];

  // Define the profile image variable
  const parentProfileImage = "/images/Justin-faithfortress.png";

  return (
    <div className="flex h-screen dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-48 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col`}>
        <div className="w-36 h-36 relative border-b dark:border-gray-700 bg-white dark:bg-gray-800 p-0 m-0 overflow-hidden flex-shrink-0">
          <Castle />
          <button onClick={closeSidebar} className="absolute top-4 right-4 text-gray-500 lg:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
          <div className="px-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative">
                {/* Profile Picture */}
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow flex items-center justify-center">
                  <img
                    src={parentProfileImage}
                    alt={`${user?.first_name} ${user?.last_name} Profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <div className="font-small text-base">{user?.first_name} {user?.last_name}</div>
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
              className="w-full justify-center bg-primary-500 hover:bg-primary-600 text-white text-base py-3 rounded-lg shadow"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 text-black h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800">
          <button onClick={toggleSidebar} className="text-gray-500">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-4">
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

        {/* Content Area */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
