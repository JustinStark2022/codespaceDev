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
    displayName: "",
    email: "",
    firstName: "",
    lastName: "",
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
        const user = await login(form.username, form.password);
        setUser(user);
        const redirectPath =
          user.role === "parent" ? "/dashboard" : "/child-dashboard";
        navigate(redirectPath);
      } else {
        // Registration
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            email: form.email,
            display_name: form.displayName,
            first_name: form.firstName,
            last_name: form.lastName,
            role: "parent",
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Registration failed" }));
          throw new Error(errorData.message || "Registration failed");
        }

        const { user } = await response.json();
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
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    autoComplete="nickname"
                    value={form.displayName}
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