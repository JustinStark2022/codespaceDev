import React, { useState } from "react";
import { login } from "@/api/user";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import Logo from "@/components/ui/logo";

export default function AuthPage() {
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        console.log("Attempting login with:", { username: form.username });

        const userData = await login(form.username, form.password);
        console.log("Login successful:", userData);


        // Transform the response to match User interface
        const user = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          display_name: userData.displayName,
          role: userData.role as "parent" | "child",
          parent_id: userData.parentId === null ? undefined : userData.parentId,
          first_name: userData.firstName,
          last_name: userData.lastName,
          created_at: userData.createdAt || new Date().toISOString(),
          isParent: userData.isParent,
        };

        setUser(user);

        // Navigate based on role
        const redirectPath =
          user.role === "parent" ? "/dashboard" : "/child-dashboard";
        console.log("Navigating to:", redirectPath);
        navigate(redirectPath);
      } else {
        // Registration
        console.log("Attempting registration with:", {
          ...form,
          role: "parent",
        });

        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...form, role: "parent" }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Registration failed" }));
          throw new Error(errorData.message || "Registration failed");
        }

        const userData = await response.json();
        console.log("Registration successful:", userData);

        // Transform response for registration
        const user = {
          id: userData.id,
          username: userData.username || form.username,
          email: userData.email || form.email,
          display_name: userData.display_name || form.display_name,
          role: "parent" as const,
          parent_id: undefined,
          first_name: userData.first_name || form.first_name,
          last_name: userData.last_name || form.last_name,
          created_at: userData.created_at || new Date().toISOString(),
          isParent: true,
        };

        setUser(user);
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-poppins">
      <Card className="w-full max-w-xl shadow-xl rounded-2xl border-0">
        <CardContent className="py-14 px-10 space-y-8">
          <div className="w-full flex justify-center items-center">
            <div className="w-48 h-48 flex items-center justify-center">
              <Logo />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white text-primary shadow"
                  : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
                mode === "register"
                  ? "bg-white text-primary shadow"
                  : "text-muted-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    autoComplete="given-name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    autoComplete="family-name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    autoComplete="nickname"
                    value={form.display_name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={form.password}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="text-right">
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                disabled={isSubmitting}
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Register"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}