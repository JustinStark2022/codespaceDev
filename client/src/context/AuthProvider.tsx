import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/use-auth";

const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

// Auth context provides: user, children, verseOfDay, isLoading, isError, fetchUser, logout, setUser
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}
