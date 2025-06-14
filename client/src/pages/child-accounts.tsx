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
import { Badge } from "@/components/ui/badge";
import { Child } from "@/types/user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Plus,
  Edit,
  Clock,
  Shield,
  BookOpen,
  Settings,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";

export default function ChildAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    display_name: "",
    age: undefined as number | undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch children
  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/user/children"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/children");
      return res.json();
    },
  });

  // Create child mutation
  const createChildMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/user/children", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/children"] });
      toast({ title: "Success", description: "Child account created successfully!" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create child account",
        variant: "destructive"
      });
    },
  });

  // Update child mutation
  const updateChildMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Child> }) => {
      const res = await apiRequest("PUT", `/api/user/children/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/children"] });
      toast({ title: "Success", description: "Child account updated successfully!" });
      setIsEditDialogOpen(false);
      setSelectedChild(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update child account",
        variant: "destructive"
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      email: "",
      first_name: "",
      last_name: "",
      display_name: "",
      age: undefined,
    });
  };

  const handleCreateChild = () => {
    createChildMutation.mutate(formData);
  };

  const handleEditChild = (child: Child) => {
    setSelectedChild(child);
    setFormData({
      username: child.username,
      password: "",
      email: child.email || "",
      first_name: child.first_name,
      last_name: child.last_name,
      display_name: child.display_name,
      age: child.age,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateChild = () => {
    if (!selectedChild) return;
    const updateData: any = { ...formData };
    if (!updateData.password) {
      // Use delete on any type to avoid TypeScript error
      const { password, ...dataWithoutPassword } = updateData;
      updateChildMutation.mutate({ id: selectedChild.id, data: dataWithoutPassword });
    } else {
      updateChildMutation.mutate({ id: selectedChild.id, data: updateData });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'age') {
      // Handle age conversion to number
      setFormData({ ...formData, [name]: value ? parseInt(value) : undefined });
    } else {
      setFormData({ ...formData, [name]: value });
    }
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
    if (!formData.username || !formData.password || !formData.display_name || !formData.email || !formData.first_name || !formData.last_name) {
      setFormError("All fields are required.");
      return;
    }

    // Validate age
    if (!formData.age || formData.age < 1 || formData.age > 18) {
      setFormError("Please enter a valid age between 1 and 18.");
      return;
    }

    // Submit with profile picture
    createChildMutation.mutate({
      ...formData,
      age: formData.age, // This is now guaranteed to be a number
      ...(profilePicture ? { profilePicture } : {})
    });
  };

  return (
    <ParentLayout title="Child Accounts">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Child Accounts</h1>
              <p className="text-gray-600">Manage your children's Kingdom Kids accounts</p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Child Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                      autoComplete="username"
                      value={formData.username}
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
                      autoComplete="new-password"
                      value={formData.password}
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
                      autoComplete="given-name"
                      value={formData.first_name}
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
                      autoComplete="family-name"
                      value={formData.last_name}
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
                      autoComplete="nickname"
                      value={formData.display_name}
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
                      value={formData.age || ""}
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
                      autoComplete="email"
                      value={formData.email}
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

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateChild}
                    disabled={createChildMutation.isPending}
                    className="flex-1"
                  >
                    {createChildMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Children List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading child accounts...</p>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Child Accounts Yet</h3>
              <p className="text-gray-500 mb-6">Create your first child account to get started with Kingdom Kids.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card key={child.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {child.first_name} {child.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">@{child.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditChild(child)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Display Name</span>
                      <span className="font-medium">{child.display_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{formatDate(child.created_at)}</span>
                    </div>
                    {child.age && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Age</span>
                        <Badge variant="outline">{child.age} years old</Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Lessons</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {child.completedLessons || 0}/{child.totalLessons || 0}
                      </Badge>
                    </div>
                    <Progress
                      value={getProgressPercentage(child.completedLessons || 0, child.totalLessons || 1)}
                      className="h-2"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Screen Time</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {child.screenTime?.usedTimeMinutes || 0}m / {child.screenTime?.allowedTimeMinutes || 120}m
                      </span>
                    </div>
                    <Progress
                      value={
                        child.screenTime
                          ? (child.screenTime.usedTimeMinutes / child.screenTime.allowedTimeMinutes) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Shield className="h-3 w-3 mr-1" />
                      Controls
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Child Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    autoComplete="given-name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    autoComplete="family-name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_display_name">Display Name</Label>
                <Input
                  id="edit_display_name"
                  autoComplete="nickname"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Enter display name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_age">Age</Label>
                <Input
                  id="edit_age"
                  name="age"
                  type="number"
                  value={formData.age || ""}
                  onChange={handleChange}
                  placeholder="Enter age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_password">New Password (Optional)</Label>
                <div className="relative">
                  <Input
                    id="edit_password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedChild(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateChild}
                  disabled={updateChildMutation.isPending}
                  className="flex-1"
                >
                  {updateChildMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Account"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ParentLayout>
  );
}

