import React, { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ParentLayout from "@/components/layout/parent-layout";
import { createChild, fetchChildren } from "../api/children";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, Camera } from "lucide-react";

export default function ChildAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
    first_name: "",
    last_name: "",
    age: "",
    role: "child"
  });
  const [formError, setFormError] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: children = [] } = useQuery({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form & { profilePicture?: File }) => {
      return createChild(data);
    },
    onSuccess: () => {
      toast({ title: "Child account created successfully" });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      setForm({
        username: "",
        password: "",
        display_name: "",
        email: "",
        first_name: "",
        last_name: "",
        age: "",
        role: "child"
      });
      setProfilePicture(null);
      setProfilePicturePreview("");
      setFormError("");
    },
    onError: (error: any) => {
      setFormError(error.message || "Failed to create child");
      toast({
        title: "Failed to create child",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, role: e.target.value });
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFormError("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Image file must be less than 5MB");
        return;
      }

      setProfilePicture(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setFormError("");
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate required fields
    if (!form.username || !form.password || !form.display_name || !form.email || !form.first_name || !form.last_name) {
      setFormError("All fields are required.");
      return;
    }

    // Validate age
    if (!form.age || parseInt(form.age) < 1 || parseInt(form.age) > 18) {
      setFormError("Please enter a valid age between 1 and 18.");
      return;
    }

    // Submit with profile picture
    mutation.mutate({
      ...form,
      age: parseInt(form.age),
      profilePicture
    });
  };

  return (
    <ParentLayout title="Child Accounts">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create New Child Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 cursor-pointer" onClick={handleProfilePictureClick}>
                    <AvatarImage src={profilePicturePreview} />
                    <AvatarFallback className="bg-gray-100">
                      {profilePicturePreview ? (
                        <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Camera className="h-8 w-8 text-gray-400" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={handleProfilePictureClick}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 text-center">
                  Click to upload profile picture<br />
                  <span className="text-xs">Max 5MB, JPG/PNG only</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    value={form.display_name}
                    onChange={handleChange}
                    required
                    placeholder="How they'll appear in the app"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="18"
                    value={form.age}
                    onChange={handleChange}
                    required
                    placeholder="Enter age"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? "Creating Account..." : "Create Child Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Existing Children</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map(child => (
            <Card key={child.id} className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={child.profile?.profile_picture || ""}
                    alt={child.display_name}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {child.first_name?.[0]}{child.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{child.display_name}</h3>
                  <p className="text-sm text-gray-600">@{child.username}</p>
                  <p className="text-sm text-gray-500">{child.first_name} {child.last_name}</p>
                  {child.profile?.age && (
                    <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">
                      Age {child.profile.age}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-800">{child.completedLessons || 0}</div>
                  <div className="text-blue-600">Lessons Done</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-800">{child.totalLessons || 0}</div>
                  <div className="text-green-600">Total Assigned</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ParentLayout>
  );
}
