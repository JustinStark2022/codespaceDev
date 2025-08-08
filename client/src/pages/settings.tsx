import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ParentLayout from "@/components/layout/parent-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Child } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { fetchChildren } from "@/api/children";
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  Bell,
  User,
  Lock,
  BookOpen,
  Smile,
  Loader2,
  Gift,
  Monitor,
  Globe,
  AlertTriangle,
  CheckCircle,
  Eye,
  Palette,
  Database,
  Wifi,
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [location] = useLocation();

  // Get tab from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "general";

  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Update URL when tab changes
  useEffect(() => {
    const newUrl = `/settings?tab=${activeTab}`;
    if (location !== newUrl) {
      window.history.replaceState({}, "", newUrl);
    }
  }, [activeTab, location]);

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["/api/users/children"],
    queryFn: fetchChildren,
  });

  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [notifications, setNotifications] = useState({
    contentAlerts: true,
    screenTimeAlerts: true,
    lessonCompletions: true,
    deviceUsage: true,
    biblePlan: true,
  });
  const [contentFilters, setContentFilters] = useState({
    blockViolence: true,
    blockLanguage: true,
    blockOccult: true,
    blockBullying: true,
    blockSexual: true,
    blockBlasphemy: true,
  });
  const [screenTimeSettings, setScreenTimeSettings] = useState({
    weekdayLimit: 120,
    weekendLimit: 180,
    lockafter9pm: true,
    pauseDuringBedtime: true,
    allowRewards: true,
    maxRewardTime: 60,
  });

  const saveGeneralSettings = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your general settings have been updated successfully.",
      });
    } catch {
      toast({
        title: "Error saving settings",
        description:
          "There was a problem saving your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveContentFilters = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Content filters updated",
        description: `Content filters have been updated for ${
          selectedChild === "all" ? "all children" : selectedChild
        }.`,
      });
    } catch {
      toast({
        title: "Error saving content filters",
        description:
          "There was a problem saving your content filters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveScreenTimeSettings = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Screen time settings updated",
        description: `Screen time settings have been updated for ${
          selectedChild === "all" ? "all children" : selectedChild
        }.`,
      });
    } catch {
      toast({
        title: "Error saving screen time settings",
        description:
          "There was a problem saving your screen time settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ParentLayout title="Settings">
      <div className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-3">
              <SettingsIcon className="h-5 w-5 text-primary mr-2" />
              <h1 className="text-xl font-bold">Account Settings</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-6xl mx-auto w-full pt-4 min-h-0">
          <Card className="shadow-md border-0 h-full flex flex-col">
            <CardContent className="pt-3 flex-1 flex flex-col min-h-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v)}
                className="w-full flex flex-col h-full"
              >
                <ScrollArea className="w-full mb-4">
                  <TabsList className="inline-flex w-max min-w-full">
                    <TabsTrigger
                      value="general"
                      className="flex items-center text-xs px-3 whitespace-nowrap"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      General
                    </TabsTrigger>
                    <TabsTrigger
                      value="content"
                      className="flex items-center text-xs px-3 whitespace-nowrap"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger
                      value="screentime"
                      className="flex items-center text-xs px-3 whitespace-nowrap"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Screen Time
                    </TabsTrigger>
                    <TabsTrigger
                      value="monitoring"
                      className="flex items-center text-xs px-3 whitespace-nowrap"
                    >
                      <Monitor className="h-3 w-3 mr-1" />
                      Monitoring
                    </TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <div className="flex-1 overflow-y-auto">
                  {/* General Tab */}
                  <TabsContent value="general" className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Notification Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Bell className="h-4 w-4 mr-2 text-primary-500" />
                            Notification Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Configure alert preferences
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label
                                htmlFor="content-alerts"
                                className="font-medium text-sm"
                              >
                                Content Alerts
                              </Label>
                              <p className="text-xs text-gray-500">
                                Inappropriate content detected
                              </p>
                            </div>
                            <Switch
                              id="content-alerts"
                              checked={notifications.contentAlerts}
                              onCheckedChange={(checked) =>
                                setNotifications({
                                  ...notifications,
                                  contentAlerts: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label
                                htmlFor="screentime-alerts"
                                className="font-medium text-sm"
                              >
                                Screen Time Alerts
                              </Label>
                              <p className="text-xs text-gray-500">
                                Time limit notifications
                              </p>
                            </div>
                            <Switch
                              id="screentime-alerts"
                              checked={notifications.screenTimeAlerts}
                              onCheckedChange={(checked) =>
                                setNotifications({
                                  ...notifications,
                                  screenTimeAlerts: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label
                                htmlFor="lesson-completions"
                                className="font-medium text-sm"
                              >
                                Lesson Completions
                              </Label>
                              <p className="text-xs text-gray-500">
                                Bible lesson achievements
                              </p>
                            </div>
                            <Switch
                              id="lesson-completions"
                              checked={notifications.lessonCompletions}
                              onCheckedChange={(checked) =>
                                setNotifications({
                                  ...notifications,
                                  lessonCompletions: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label
                                htmlFor="device-usage"
                                className="font-medium text-sm"
                              >
                                Device Usage
                              </Label>
                              <p className="text-xs text-gray-500">
                                New logins & unusual activity
                              </p>
                            </div>
                            <Switch
                              id="device-usage"
                              checked={notifications.deviceUsage}
                              onCheckedChange={(checked) =>
                                setNotifications({
                                  ...notifications,
                                  deviceUsage: checked,
                                })
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Account Security */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-green-500" />
                            Account Security
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Password and security settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label htmlFor="current-password" className="text-sm">
                              Current Password
                            </Label>
                            <Input
                              id="current-password"
                              type="password"
                              placeholder="••••••••"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-sm">
                              New Password
                            </Label>
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="••••••••"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="text-sm">
                              Confirm New Password
                            </Label>
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="••••••••"
                              className="h-8 text-xs"
                            />
                          </div>
                          <Button className="w-full h-7 text-xs" variant="outline">
                            Update Password
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Bible Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-accent-500" />
                            Bible Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Reading preferences and plans
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label
                              htmlFor="default-translation"
                              className="text-sm"
                            >
                              Default Bible Translation
                            </Label>
                            <Select defaultValue="NIV">
                              <SelectTrigger
                                id="default-translation"
                                className="h-8 text-xs"
                              >
                                <SelectValue placeholder="Select translation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NIrV">
                                  NIrV (Reader&apos;s Version)
                                </SelectItem>
                                <SelectItem value="NIV">
                                  NIV (New International)
                                </SelectItem>
                                <SelectItem value="NLT">
                                  NLT (New Living)
                                </SelectItem>
                                <SelectItem value="ERV">
                                  ERV (Easy-to-Read)
                                </SelectItem>
                                <SelectItem value="CSB">
                                  CSB (Christian Standard)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reading-plan" className="text-sm">
                              Daily Reading Plan
                            </Label>
                            <Select defaultValue="chronological">
                              <SelectTrigger
                                id="reading-plan"
                                className="h-8 text-xs"
                              >
                                <SelectValue placeholder="Select plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="chronological">
                                  Chronological
                                </SelectItem>
                                <SelectItem value="beginner">
                                  Beginner&apos;s Journey
                                </SelectItem>
                                <SelectItem value="wisdom">
                                  Wisdom Literature
                                </SelectItem>
                                <SelectItem value="gospels">
                                  Through the Gospels
                                </SelectItem>
                                <SelectItem value="psalms">
                                  Psalms &amp; Proverbs
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label
                                htmlFor="bible-plan-notifications"
                                className="font-medium text-sm"
                              >
                                Daily Reminders
                              </Label>
                              <p className="text-xs text-gray-500">
                                Bible reading notifications
                              </p>
                            </div>
                            <Switch
                              id="bible-plan-notifications"
                              checked={notifications.biblePlan}
                              onCheckedChange={(checked) =>
                                setNotifications({
                                  ...notifications,
                                  biblePlan: checked,
                                })
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* App Preferences */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Palette className="h-4 w-4 mr-2 text-purple-500" />
                            App Preferences
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Interface and display settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label htmlFor="theme-mode" className="text-sm">
                              Theme Mode
                            </Label>
                            <Select defaultValue="light">
                              <SelectTrigger id="theme-mode" className="h-8 text-xs">
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light Mode</SelectItem>
                                <SelectItem value="dark">Dark Mode</SelectItem>
                                <SelectItem value="auto">Auto (System)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="language" className="text-sm">
                              Language
                            </Label>
                            <Select defaultValue="en">
                              <SelectTrigger id="language" className="h-8 text-xs">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Español</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="sound-effects" className="font-medium text-sm">
                                Sound Effects
                              </Label>
                              <p className="text-xs text-gray-500">
                                App sounds and notifications
                              </p>
                            </div>
                            <Switch id="sound-effects" defaultChecked />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Button
                      onClick={saveGeneralSettings}
                      className="w-full h-8 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save General Settings"
                      )}
                    </Button>
                  </TabsContent>

                  {/* Content Filters Tab */}
                  <TabsContent value="content" className="space-y-3">
                    <div className="mb-3">
                      <Label htmlFor="child-selector" className="text-sm font-medium">
                        Apply Settings To:
                      </Label>
                      <Select value={selectedChild} onValueChange={(v) => setSelectedChild(v)}>
                        <SelectTrigger id="child-selector" className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Select child" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Children</SelectItem>
                          {children.map((child) => (
                            <SelectItem key={child.id} value={child.first_name}>
                              {child.first_name} {child.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Content Filtering */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Content Filtering
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Block inappropriate content for{" "}
                            {selectedChild === "all" ? "all children" : selectedChild}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-violence" className="font-medium text-sm">
                                Block Violent Content
                              </Label>
                              <p className="text-xs text-gray-500">
                                Games, videos with violent themes
                              </p>
                            </div>
                            <Switch
                              id="filter-violence"
                              checked={contentFilters.blockViolence}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockViolence: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-language" className="font-medium text-sm">
                                Block Bad Language
                              </Label>
                              <p className="text-xs text-gray-500">
                                Profanity and inappropriate language
                              </p>
                            </div>
                            <Switch
                              id="filter-language"
                              checked={contentFilters.blockLanguage}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockLanguage: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-occult" className="font-medium text-sm">
                                Block Occult Content
                              </Label>
                              <p className="text-xs text-gray-500">
                                Witchcraft, magic, occult themes
                              </p>
                            </div>
                            <Switch
                              id="filter-occult"
                              checked={contentFilters.blockOccult}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockOccult: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-bullying" className="font-medium text-sm">
                                Block Bullying Content
                              </Label>
                              <p className="text-xs text-gray-500">
                                Promotes bullying or harmful behavior
                              </p>
                            </div>
                            <Switch
                              id="filter-bullying"
                              checked={contentFilters.blockBullying}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockBullying: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-sexual" className="font-medium text-sm">
                                Block Sexual Content
                              </Label>
                              <p className="text-xs text-gray-500">
                                Sexual themes or inappropriate imagery
                              </p>
                            </div>
                            <Switch
                              id="filter-sexual"
                              checked={contentFilters.blockSexual}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockSexual: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="filter-blasphemy" className="font-medium text-sm">
                                Block Blasphemous Content
                              </Label>
                              <p className="text-xs text-gray-500">
                                Blasphemy against Christian beliefs
                              </p>
                            </div>
                            <Switch
                              id="filter-blasphemy"
                              checked={contentFilters.blockBlasphemy}
                              onCheckedChange={(checked) =>
                                setContentFilters({ ...contentFilters, blockBlasphemy: checked })
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Approved Content & Whitelist */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Approved Content
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Manage trusted apps and websites
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <div className="space-y-2">
                            <Label className="text-sm">Trusted Websites</Label>
                            <div className="space-y-1">
                              {["bible.com", "youtube.com/kids", "khan-academy.org"].map(
                                (site) => (
                                  <div
                                    key={site}
                                    className="flex items-center justify-between p-2 bg-green-50 rounded text-xs"
                                  >
                                    <span>{site}</span>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                      ×
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add website..."
                                className="h-7 text-xs flex-1"
                              />
                              <Button size="sm" className="h-7 text-xs">
                                Add
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Approved Apps</Label>
                            <div className="space-y-1">
                              {[
                                "Bible App for Kids",
                                "Minecraft Education",
                                "Khan Academy Kids",
                              ].map((app) => (
                                <div
                                  key={app}
                                  className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs"
                                >
                                  <span>{app}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    Approved
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Kingdom AI Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Smile className="h-4 w-4 mr-2 text-green-500" />
                            Kingdom AI Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Configure AI content analysis
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label htmlFor="filter-sensitivity" className="text-sm">
                              Filter Sensitivity
                            </Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Low</span>
                              <Slider
                                id="filter-sensitivity"
                                defaultValue={[7]}
                                max={10}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-xs text-gray-500">High</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ai-detection-mode" className="text-sm">
                              AI Detection Mode
                            </Label>
                            <Select defaultValue="balanced">
                              <SelectTrigger id="ai-detection-mode" className="h-8 text-xs">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="relaxed">
                                  Relaxed - Less false positives
                                </SelectItem>
                                <SelectItem value="balanced">
                                  Balanced - Recommended
                                </SelectItem>
                                <SelectItem value="strict">
                                  Strict - Maximum protection
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Real-time Scanning</Label>
                              <p className="text-xs text-gray-500">
                                Scan content as it loads
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Content Statistics */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Database className="h-4 w-4 mr-2 text-blue-500" />
                            Content Statistics
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Filter performance overview
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="text-lg font-bold text-green-700">156</div>
                              <div className="text-xs text-green-600">Blocked Today</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="text-lg font-bold text-blue-700">24</div>
                              <div className="text-xs text-blue-600">Approved Today</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded">
                              <div className="text-lg font-bold text-yellow-700">7</div>
                              <div className="text-xs text-yellow-600">Pending Review</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded">
                              <div className="text-lg font-bold text-purple-700">98%</div>
                              <div className="text-xs text-purple-600">Accuracy Rate</div>
                            </div>
                          </div>

                          <Button variant="outline" className="w-full h-7 text-xs">
                            View Detailed Report
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <Button
                      onClick={saveContentFilters}
                      className="w-full h-8 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Content Filters"
                      )}
                    </Button>
                  </TabsContent>

                  {/* Screen Time Tab */}
                  <TabsContent value="screentime" className="space-y-3">
                    <div className="mb-3">
                      <Label
                        htmlFor="child-time-selector"
                        className="text-sm font-medium"
                      >
                        Apply Settings To:
                      </Label>
                      <Select value={selectedChild} onValueChange={(v) => setSelectedChild(v)}>
                        <SelectTrigger id="child-time-selector" className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Select child" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Children</SelectItem>
                          {children.map((child) => (
                            <SelectItem key={child.id} value={child.first_name}>
                              {child.first_name} {child.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Daily Time Limits */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                            Daily Time Limits
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Set screen time allowances
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="weekday-limit" className="text-sm">
                                Weekday Limit
                              </Label>
                              <span className="text-xs text-gray-500">
                                {Math.floor(screenTimeSettings.weekdayLimit / 60)}h{" "}
                                {screenTimeSettings.weekdayLimit % 60}m
                              </span>
                            </div>
                            <Slider
                              id="weekday-limit"
                              value={[screenTimeSettings.weekdayLimit]}
                              min={30}
                              max={360}
                              step={15}
                              onValueChange={(value) =>
                                setScreenTimeSettings({
                                  ...screenTimeSettings,
                                  weekdayLimit: value[0],
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="weekend-limit" className="text-sm">
                                Weekend Limit
                              </Label>
                              <span className="text-xs text-gray-500">
                                {Math.floor(screenTimeSettings.weekendLimit / 60)}h{" "}
                                {screenTimeSettings.weekendLimit % 60}m
                              </span>
                            </div>
                            <Slider
                              id="weekend-limit"
                              value={[screenTimeSettings.weekendLimit]}
                              min={30}
                              max={480}
                              step={15}
                              onValueChange={(value) =>
                                setScreenTimeSettings({
                                  ...screenTimeSettings,
                                  weekendLimit: value[0],
                                })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <Button variant="outline" className="h-7 text-xs">
                              Quick: 1h
                            </Button>
                            <Button variant="outline" className="h-7 text-xs">
                              Quick: 2h
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Schedule Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Wifi className="h-4 w-4 mr-2 text-purple-500" />
                            Schedule Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Bedtime and break schedules
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label className="text-sm">Bedtime Schedule</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Sleep Time</Label>
                                <Input type="time" defaultValue="21:00" className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">Wake Time</Label>
                                <Input type="time" defaultValue="07:00" className="h-7 text-xs" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Break Intervals</Label>
                            <Select defaultValue="30">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">Every 15 minutes</SelectItem>
                                <SelectItem value="30">Every 30 minutes</SelectItem>
                                <SelectItem value="60">Every hour</SelectItem>
                                <SelectItem value="none">No breaks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Break Duration</Label>
                            <Select defaultValue="5">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 minutes</SelectItem>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Additional Controls */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <User className="h-4 w-4 mr-2 text-purple-500" />
                            Additional Controls
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Device management options
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="lock-after-9" className="font-medium text-sm">
                                Auto-Lock at Bedtime
                              </Label>
                              <p className="text-xs text-gray-500">
                                Lock devices at scheduled bedtime
                              </p>
                            </div>
                            <Switch
                              id="lock-after-9"
                              checked={screenTimeSettings.lockafter9pm}
                              onCheckedChange={(checked) =>
                                setScreenTimeSettings({
                                  ...screenTimeSettings,
                                  lockafter9pm: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="pause-bedtime" className="font-medium text-sm">
                                Pause During Bedtime
                              </Label>
                              <p className="text-xs text-gray-500">
                                Pause apps during sleep hours
                              </p>
                            </div>
                            <Switch
                              id="pause-bedtime"
                              checked={screenTimeSettings.pauseDuringBedtime}
                              onCheckedChange={(checked) =>
                                setScreenTimeSettings({
                                  ...screenTimeSettings,
                                  pauseDuringBedtime: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Location-Based Rules</Label>
                              <p className="text-xs text-gray-500">
                                Different limits at school/home
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Emergency Override</Label>
                              <p className="text-xs text-gray-500">
                                Allow emergency access
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Reward Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Gift className="h-4 w-4 mr-2 text-accent-500" />
                            Reward Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Bible lesson incentives
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="allow-rewards" className="font-medium text-sm">
                                Allow Bible Rewards
                              </Label>
                              <p className="text-xs text-gray-500">
                                Extra time for completing lessons
                              </p>
                            </div>
                            <Switch
                              id="allow-rewards"
                              checked={screenTimeSettings.allowRewards}
                              onCheckedChange={(checked) =>
                                setScreenTimeSettings({
                                  ...screenTimeSettings,
                                  allowRewards: checked,
                                })
                              }
                            />
                          </div>

                          {screenTimeSettings.allowRewards && (
                            <>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <Label htmlFor="max-reward" className="text-sm">
                                    Max Daily Reward
                                  </Label>
                                  <span className="text-xs text-gray-500">
                                    {Math.floor(screenTimeSettings.maxRewardTime / 60)}h{" "}
                                    {screenTimeSettings.maxRewardTime % 60}m
                                  </span>
                                </div>
                                <Slider
                                  id="max-reward"
                                  value={[screenTimeSettings.maxRewardTime]}
                                  min={15}
                                  max={120}
                                  step={15}
                                  onValueChange={(value) =>
                                    setScreenTimeSettings({
                                      ...screenTimeSettings,
                                      maxRewardTime: value[0],
                                    })
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Reward Per Lesson</Label>
                                <Select defaultValue="15">
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10">10 minutes</SelectItem>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="20">20 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="font-medium text-sm">Weekend Bonus</Label>
                                  <p className="text-xs text-gray-500">
                                    Double rewards on weekends
                                  </p>
                                </div>
                                <Switch defaultChecked />
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Button
                      onClick={saveScreenTimeSettings}
                      className="w-full h-8 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Screen Time Settings"
                      )}
                    </Button>
                  </TabsContent>

                  {/* Monitoring Tab */}
                  <TabsContent value="monitoring" className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Real-time Monitoring */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-blue-500" />
                            Real-time Monitoring
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Live activity tracking settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Live Activity Feed</Label>
                              <p className="text-xs text-gray-500">
                                Real-time app usage tracking
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Screenshot Monitoring</Label>
                              <p className="text-xs text-gray-500">
                                Periodic screen captures
                              </p>
                            </div>
                            <Switch />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Keystroke Logging</Label>
                              <p className="text-xs text-gray-500">
                                Track typed content (privacy mode)
                              </p>
                            </div>
                            <Switch />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Monitoring Frequency</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low - Every 5 minutes</SelectItem>
                                <SelectItem value="medium">Medium - Every 2 minutes</SelectItem>
                                <SelectItem value="high">High - Every 30 seconds</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Alert Settings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                            Alert Settings
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Configure monitoring notifications
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Instant Alerts</Label>
                              <p className="text-xs text-gray-500">
                                Immediate inappropriate content alerts
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Daily Summary</Label>
                              <p className="text-xs text-gray-500">
                                End-of-day activity report
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Weekly Reports</Label>
                              <p className="text-xs text-gray-500">
                                Comprehensive weekly analysis
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Alert Delivery Method</Label>
                            <Select defaultValue="push">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="push">Push Notifications</SelectItem>
                                <SelectItem value="email">Email Only</SelectItem>
                                <SelectItem value="both">Push + Email</SelectItem>
                                <SelectItem value="sms">SMS Alerts</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Location Tracking */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Globe className="h-4 w-4 mr-2 text-green-500" />
                            Location Tracking
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Device location monitoring
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">GPS Tracking</Label>
                              <p className="text-xs text-gray-500">Track device location</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Geofencing Alerts</Label>
                              <p className="text-xs text-gray-500">
                                Alerts when leaving safe zones
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Location Update Frequency</Label>
                            <Select defaultValue="5">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Every minute</SelectItem>
                                <SelectItem value="5">Every 5 minutes</SelectItem>
                                <SelectItem value="15">Every 15 minutes</SelectItem>
                                <SelectItem value="30">Every 30 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button variant="outline" className="w-full h-7 text-xs">
                            Manage Safe Zones
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Data & Privacy */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Database className="h-4 w-4 mr-2 text-purple-500" />
                            Data & Privacy
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Data retention and privacy settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label className="text-sm">Data Retention Period</Label>
                            <Select defaultValue="90">
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                                <SelectItem value="180">6 months</SelectItem>
                                <SelectItem value="365">1 year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm">Anonymous Analytics</Label>
                              <p className="text-xs text-gray-500">
                                Help improve our services
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-7 text-xs">
                              Export Data
                            </Button>
                            <Button variant="outline" className="h-7 text-xs">
                              Delete Data
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Button
                      onClick={() => {
                        setIsSubmitting(true);
                        setTimeout(() => {
                          setIsSubmitting(false);
                          toast({
                            title: "Monitoring settings saved",
                            description:
                              "Your monitoring preferences have been updated successfully.",
                          });
                        }, 1000);
                      }}
                      className="w-full h-8 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Monitoring Settings"
                      )}
                    </Button>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </ParentLayout>
  );
}
