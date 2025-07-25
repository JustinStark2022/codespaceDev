import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ParentLayout from "@/components/layout/parent-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { fetchChildren } from "@/api/children";
import { getFlaggedContent } from "@/api/monitoring";
import {
  User,
  Home,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Book,
  Loader2,
  Plus,
  Minus,
  Settings,
  Gamepad2,
  Heart,
  Search,
  Globe,
  Youtube,
  MessageCircle,
  Send,
  Calendar
} from "lucide-react";

interface ScreenTimeData {
  allowedTimeMinutes: number;
  additionalRewardMinutes: number;
  usedTimeMinutes: number;
}

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
}

const initialMessages: ChatMessage[] = [
  {
    sender: "bot",
    text: "👋 Hi! I'm your Faith Fortress AI assistant. How can I help you manage your family's digital wellness today?",
  },
];

export default function ParentalControlCenter() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State management
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState(15);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  // Navigation helper
  const navigateToSettings = (tab?: string) => {
    const url = tab ? `/settings?tab=${tab}` : '/settings';
    setLocation(url);
  };

  // Data fetching
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  const { data: screenTime, isLoading: screenTimeLoading, refetch: refetchScreenTime } = useQuery<ScreenTimeData>({
    queryKey: ["screentime", selectedChild, selectedDate],
    enabled: !!selectedChild,
    queryFn: async () => {
      console.log("Fetching screen time for:", { selectedChild, selectedDate });
      const res = await apiRequest("GET", `/api/screentime?userId=${selectedChild}&date=${selectedDate}`);
      const data = await res.json();
      console.log("Screen time data received:", data);
      return data;
    },
  });

  const {
    data: flaggedContent = [],
    isLoading: isLoadingFlagged,
  } = useQuery<FlaggedContent[]>({
    queryKey: ["flaggedContent", selectedChild],
    queryFn: getFlaggedContent,
  });

  // Overview data query for dashboard metrics
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["overview", selectedChild, selectedDate],
    enabled: !!selectedChild,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedChild) { params.append("childId", selectedChild); }
      if (selectedDate) {
        params.append("date", selectedDate);
      }

      const res = await apiRequest("GET", `/api/parental-control/overview?${params.toString()}`);
      return res.json();
    },
  });

  // Mutations
  const updateScreenTimeMutation = useMutation({
    mutationFn: async (data: { userId: number, date: string, allowedTimeMinutes: number }) => {
      const res = await apiRequest("POST", "/api/screentime/update", data);
      return res.json();
    },
    onSuccess: async (data, variables) => {
      console.log("Screen time update successful:", { data, variables });

      // Invalidate the specific query for this user and date
      await queryClient.invalidateQueries({
        queryKey: ["screentime", variables.userId.toString(), variables.date]
      });
      // Also invalidate all screentime queries to refresh any overview data
      await queryClient.invalidateQueries({
        queryKey: ["screentime"]
      });
      // Invalidate overview data to refresh dashboard
      await queryClient.invalidateQueries({
        queryKey: ["overview", variables.userId.toString(), variables.date]
      });
      await queryClient.invalidateQueries({
        queryKey: ["overview"]
      });

      // Force refetch the current screen time data
      refetchScreenTime();

      toast({ title: "Screen time updated", description: "Time limits adjusted successfully with God's guidance." });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message || "Could not update limits", variant: "destructive" });
    },
  });

  const approveContentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/games/approve/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flaggedContent"] });
      toast({ title: "Content approved", description: "This content has been deemed appropriate for your family." });
    },
    onError: (error: any) => {
      toast({ title: "Error approving content", description: error.message, variant: "destructive" });
    },
  });

  const blockContentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/games/block/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flaggedContent"] });
      toast({ title: "Content blocked", description: "This content has been protected from your family." });
    },
    onError: (error: any) => {
      toast({ title: "Error blocking content", description: error.message, variant: "destructive" });
    },
  });

  const analyzeContentMutation = useMutation({
    mutationFn: async (data: { name: string; platform: string; description: string }) => {
      const res = await apiRequest("POST", "/api/ai/analyze-game", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["flaggedContent"] });
      toast({
        title: data.flagged ? "Content flagged for review" : "Content approved",
        description: data.flagged
          ? `${data.name} requires your attention: ${data.flagReason}`
          : `${data.name} appears safe for your family.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  // Effects
  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0].id.toString());
    }
  }, [children, selectedChild]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper functions
  const formatMinutes = (minutes: number) => {
    // Handle invalid or undefined values
    if (!minutes || isNaN(minutes) || minutes < 0) {
      return "0h 0m";
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateTimeUsedPercentage = () => {
    if (!screenTime || !screenTime.allowedTimeMinutes || !screenTime.usedTimeMinutes) {
      return 0;
    }
    const total = screenTime.allowedTimeMinutes + (screenTime.additionalRewardMinutes || 0);
    return total > 0 ? Math.min(100, Math.round((screenTime.usedTimeMinutes / total) * 100)) : 0;
  };

  const adjustAllowedTime = (amount: number) => {
    if (!screenTime || !selectedChild) {
      console.log("Cannot adjust time:", { screenTime, selectedChild });
      return;
    }
    const newAllowedTime = Math.max(15, screenTime.allowedTimeMinutes + amount);
    const mutationData = {
      userId: parseInt(selectedChild),
      date: selectedDate,
      allowedTimeMinutes: newAllowedTime
    };
    console.log("Adjusting screen time:", { amount, currentTime: screenTime.allowedTimeMinutes, newAllowedTime, mutationData });
    updateScreenTimeMutation.mutate(mutationData);
  };

  const getSelectedChildName = () => {
    if (!selectedChild || children.length === 0) {
      return "Child";
    }
    const child = children.find((c) => c.id.toString() === selectedChild);
    return child ? `${child.first_name} ${child.last_name}` : "Child";
  };

  const getRemainingTime = () => {
    if (!screenTime || !screenTime.allowedTimeMinutes) {
      return "No data";
    }
    const total = (screenTime.allowedTimeMinutes || 0) + (screenTime.additionalRewardMinutes || 0);
    const remaining = total - (screenTime.usedTimeMinutes || 0);
    return remaining > 0 ? formatMinutes(remaining) : "0m";
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("content-name") as HTMLInputElement)?.value;
    const platform = (form.elements.namedItem("content-platform") as HTMLSelectElement)?.value;
    const description = (form.elements.namedItem("content-description") as HTMLTextAreaElement)?.value;

    if (!name || !platform) {
      toast({
        title: "Missing information",
        description: "Please provide the content name and platform.",
        variant: "destructive",
      });
      return;
    }

    analyzeContentMutation.mutate({ name, platform, description });
    form.reset();
  };

  const handleSend = async () => {
    if (!input.trim()) { return; }
    
    const userMessage: ChatMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    try {
      const response = await apiRequest("POST", "/api/ai/chat", {
        message: input,
        context: "parental control guidance"
      });
      const data = await response.json();
      
      const botMessage: ChatMessage = {
        sender: "bot",
        text: data.response || "I'm having trouble right now. Please try again."
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        sender: "bot",
        text: "I'm having trouble connecting right now. Please try again in a moment."
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const filteredContent = flaggedContent.filter((content) =>
    content.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (content.flagReason && content.flagReason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ParentLayout title="Parental Control Center">
      <div className="flex flex-col h-full">
        {/* Sticky Controls Section */}
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="child-selector" className="block text-sm font-medium text-gray-700 mb-1">
                Select Child
              </label>
              <Select value={selectedChild || ""} onValueChange={setSelectedChild}>
                <SelectTrigger id="child-selector" className="w-full">
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {child.first_name} {child.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="date-selector" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                id="date-selector"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reset to Today
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 pt-4 min-h-0">
          {/* Left side - Main controls (3/4 width) */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
              <ScrollArea className="w-full mb-4">
                <TabsList className="inline-flex w-max min-w-full">
                  <TabsTrigger value="overview" className="flex items-center text-xs px-3 whitespace-nowrap">
                    <Home className="h-3 w-3 mr-1" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="screentime" className="flex items-center text-xs px-3 whitespace-nowrap">
                    <Clock className="h-3 w-3 mr-1" />
                    Screen Time
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center text-xs px-3 whitespace-nowrap">
                    <Shield className="h-3 w-3 mr-1" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="flex items-center text-xs px-3 whitespace-nowrap">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Monitoring
                  </TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <div className="flex-1 overflow-y-auto">

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base flex items-center text-blue-800">
                      <Clock className="h-4 w-4 mr-2" />
                      Today's Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {screenTimeLoading ? (
                      <div className="animate-pulse text-sm">Loading...</div>
                    ) : screenTime ? (
                      <div>
                        <div className="text-xl font-bold text-blue-900">
                          {formatMinutes(screenTime.usedTimeMinutes || 0)}
                        </div>
                        <div className="text-xs text-blue-600">
                          of {formatMinutes((screenTime.allowedTimeMinutes || 0) + (screenTime.additionalRewardMinutes || 0))} allowed
                        </div>
                        <Progress value={calculateTimeUsedPercentage()} className="mt-1 h-1.5" />
                      </div>
                    ) : (
                      <div>
                        <div className="text-xl font-bold text-blue-900">0h 0m</div>
                        <div className="text-xs text-blue-600">of 2h 0m allowed</div>
                        <Progress value={0} className="mt-1 h-1.5" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base flex items-center text-green-800">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Content Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xl font-bold text-green-900">
                      {flaggedContent.length}
                    </div>
                    <div className="text-xs text-green-600">items need review</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base flex items-center text-amber-800">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Family Wellness
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xl font-bold text-amber-900">Good</div>
                    <div className="text-xs text-amber-600">healthy digital habits</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-h-[120px] flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recent Family Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <div className="flex-1 flex items-center justify-center">
                    {selectedChild ? (
                      <div className="text-center text-gray-500">
                        <Book className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Activity monitoring for {getSelectedChildName()}</p>
                        <p className="text-xs">Choose the Screen Time or Content tabs for detailed management</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Select a child to view their activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screen Time Tab */}
            <TabsContent value="screentime" className="space-y-3">
              {!selectedChild ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h3 className="text-base font-medium">Select a Child</h3>
                    <p className="text-xs text-gray-600">Choose a child to manage their screen time</p>
                  </CardContent>
                </Card>
              ) : screenTimeLoading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Loading screen time data...</p>
                  </CardContent>
                </Card>
              ) : !screenTime ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h3 className="text-base font-medium">No Screen Time Data</h3>
                    <p className="text-xs text-gray-600">No data available for {selectedDate}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {/* Top Row - Current Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Card className="bg-white border-2 border-blue-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-blue-800 text-base">Daily Usage</CardTitle>
                        <CardDescription className="text-xs">
                          {formatMinutes(screenTime.usedTimeMinutes)} of {formatMinutes(screenTime.allowedTimeMinutes + screenTime.additionalRewardMinutes)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Progress value={calculateTimeUsedPercentage()} className="h-2 rounded-full" />
                        <div className="mt-1 text-xs text-gray-600">
                          {getRemainingTime()} remaining
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-green-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-800 text-base">Quick Adjust</CardTitle>
                        <CardDescription className="text-xs">Modify time limits with wisdom</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => adjustAllowedTime(-adjustmentAmount)}
                            variant="outline"
                            className="flex-1 text-xs h-8"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            -{adjustmentAmount}m
                          </Button>
                          <Button
                            onClick={() => adjustAllowedTime(adjustmentAmount)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            +{adjustmentAmount}m
                          </Button>
                        </div>
                        <Select value={adjustmentAmount.toString()} onValueChange={(value) => setAdjustmentAmount(parseInt(value))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-2 border-purple-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-purple-800 text-base">Rewards Earned</CardTitle>
                        <CardDescription className="text-xs">Bonus time for good behavior</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-purple-900">
                          {formatMinutes(screenTime.additionalRewardMinutes)}
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Extra time through faithful choices
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weekly Timeline Chart */}
                  <Card className="bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-base">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        Weekly Screen Time Timeline
                      </CardTitle>
                      <CardDescription className="text-xs">Track {getSelectedChildName()}'s daily usage patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                          const dayUsage = Math.floor(Math.random() * 180) + 30; // Mock data
                          const dayLimit = 120;
                          const percentage = Math.min(100, (dayUsage / dayLimit) * 100);
                          const isToday = index === new Date().getDay() - 1;

                          return (
                            <div key={day} className={`p-2 rounded-lg ${isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`font-medium text-sm ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                                  {day} {isToday && '(Today)'}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {formatMinutes(dayUsage)} / {formatMinutes(dayLimit)}
                                </span>
                              </div>
                              <Progress value={percentage} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* App Usage Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card className="bg-white">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center text-base">
                          <Gamepad2 className="h-4 w-4 mr-2 text-purple-600" />
                          Top Apps Today
                        </CardTitle>
                        <CardDescription className="text-xs">Most used applications</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {[
                            { name: 'Roblox', time: 45, icon: '🎮', color: 'bg-purple-100 text-purple-800' },
                            { name: 'YouTube Kids', time: 30, icon: '📺', color: 'bg-red-100 text-red-800' },
                            { name: 'Minecraft', time: 25, icon: '⛏️', color: 'bg-green-100 text-green-800' },
                            { name: 'Bible App for Kids', time: 15, icon: '📖', color: 'bg-blue-100 text-blue-800' }
                          ].map((app, index) => (
                            <div key={app.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                              <div className="flex items-center">
                                <span className="text-sm mr-2">{app.icon}</span>
                                <span className="font-medium text-sm">{app.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={`${app.color} text-xs`}>{formatMinutes(app.time)}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center text-base">
                          <Clock className="h-4 w-4 mr-2 text-orange-600" />
                          Schedule Settings
                        </CardTitle>
                        <CardDescription className="text-xs">Quick schedule management</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="font-medium text-sm">School Days</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">2h limit</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => navigateToSettings('screentime')}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="font-medium text-sm">Weekends</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">3h limit</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => navigateToSettings('screentime')}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="font-medium text-sm">Bedtime Block</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">9PM - 7AM</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => navigateToSettings('screentime')}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700 h-8 text-xs"
                          onClick={() => navigateToSettings('screentime')}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Advanced Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Content Analysis Section */}
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Shield className="h-4 w-4 mr-2 text-blue-600" />
                      Content Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">Analyze new content with biblical wisdom</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <form onSubmit={handleAnalyzeSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <Input
                          id="content-name"
                          name="content-name"
                          placeholder="e.g., Minecraft"
                          required
                          className="border-gray-300 h-8 text-sm"
                        />
                        <Select defaultValue="Roblox" name="content-platform">
                          <SelectTrigger id="content-platform" className="h-8 text-sm">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Roblox">Roblox</SelectItem>
                            <SelectItem value="YouTube">YouTube</SelectItem>
                            <SelectItem value="Android">Android</SelectItem>
                            <SelectItem value="iOS">iOS</SelectItem>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <textarea
                        id="content-description"
                        name="content-description"
                        placeholder="Describe the content for biblical evaluation..."
                        className="min-h-[60px] w-full rounded-md border border-gray-300 p-2 text-xs"
                        rows={3}
                      />
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs" disabled={analyzeContentMutation.isPending}>
                        {analyzeContentMutation.isPending ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Analyzing with biblical wisdom...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-1 h-3 w-3" />
                            Analyze Content
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Content Categories */}
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Book className="h-4 w-4 mr-2 text-green-600" />
                      Content Categories
                    </CardTitle>
                    <CardDescription className="text-xs">Manage content by category</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {[
                        { name: 'Educational', count: 12, color: 'bg-green-100 text-green-800', icon: '📚' },
                        { name: 'Entertainment', count: 8, color: 'bg-blue-100 text-blue-800', icon: '🎬' },
                        { name: 'Games', count: 15, color: 'bg-purple-100 text-purple-800', icon: '🎮' },
                        { name: 'Faith-Based', count: 6, color: 'bg-yellow-100 text-yellow-800', icon: '✝️' },
                        { name: 'Blocked', count: 3, color: 'bg-red-100 text-red-800', icon: '🚫' }
                      ].map((category) => (
                        <div key={category.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center">
                            <span className="text-sm mr-2">{category.icon}</span>
                            <span className="font-medium text-sm">{category.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${category.color} text-xs`}>{category.count}</Badge>
                            <Button size="sm" variant="outline" className="h-6 text-xs">Manage</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Content Filters & Rules */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                      Content Filters
                    </CardTitle>
                    <CardDescription className="text-xs">Active filtering rules</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {[
                        { name: 'Violence Filter', active: true, level: 'Strict' },
                        { name: 'Language Filter', active: true, level: 'Moderate' },
                        { name: 'Age Appropriateness', active: true, level: 'Auto' },
                        { name: 'Biblical Values', active: true, level: 'Enabled' }
                      ].map((filter) => (
                        <div key={filter.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium text-xs">{filter.name}</span>
                            <div className="text-xs text-gray-500">{filter.level}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${filter.active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full mt-3 h-7 text-xs"
                      variant="outline"
                      onClick={() => navigateToSettings('content')}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure Filters
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Heart className="h-4 w-4 mr-2 text-pink-600" />
                      Approved Content
                    </CardTitle>
                    <CardDescription className="text-xs">Family-safe content</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {[
                        { name: 'Bible App for Kids', platform: 'iOS' },
                        { name: 'Minecraft Education', platform: 'PC' },
                        { name: 'Khan Academy Kids', platform: 'Web' },
                        { name: 'VeggieTales', platform: 'YouTube' }
                      ].map((content) => (
                        <div key={content.name} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div>
                            <span className="font-medium text-xs">{content.name}</span>
                            <div className="text-xs text-gray-500">{content.platform}</div>
                          </div>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-3 h-7 text-xs" variant="outline">
                      View All Approved
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Search className="h-4 w-4 mr-2 text-blue-600" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription className="text-xs">Common content tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      <Button className="w-full justify-start h-7 text-xs" variant="outline">
                        <Plus className="h-3 w-3 mr-2" />
                        Add Trusted Website
                      </Button>
                      <Button className="w-full justify-start h-7 text-xs" variant="outline">
                        <Shield className="h-3 w-3 mr-2" />
                        Block New App
                      </Button>
                      <Button className="w-full justify-start h-7 text-xs" variant="outline">
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Sync Content Rules
                      </Button>
                      <Button className="w-full justify-start h-7 text-xs" variant="outline">
                        <Book className="h-3 w-3 mr-2" />
                        Export Content Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Content Activity */}
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center text-base">
                      <RefreshCw className="h-4 w-4 mr-2 text-gray-600" />
                      Recent Content Activity
                    </span>
                    <div className="flex w-[200px]">
                      <Input
                        placeholder="Search content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-7 text-xs"
                      />
                      <Button variant="ghost" className="ml-1 h-7 w-7 p-0">
                        <Search className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="text-xs">Track what content your children are accessing</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {[
                      { name: 'Roblox: Adopt Me', time: '2 hours ago', child: 'Jimmy', status: 'approved', platform: 'Roblox' },
                      { name: 'YouTube: Bible Stories', time: '4 hours ago', child: 'Sarah', status: 'approved', platform: 'YouTube' },
                      { name: 'Minecraft: Creative Mode', time: '1 day ago', child: 'Jimmy', status: 'approved', platform: 'PC' },
                      { name: 'TikTok Video', time: '2 days ago', child: 'Sarah', status: 'blocked', platform: 'TikTok' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${activity.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <span className="font-medium text-sm">{activity.name}</span>
                            <div className="text-xs text-gray-500">{activity.child} • {activity.platform} • {activity.time}</div>
                          </div>
                        </div>
                        <Badge variant={activity.status === 'approved' ? 'default' : 'destructive'} className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-3">
              {/* Monitoring Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-800">Active Alerts</p>
                        <p className="text-xl font-bold text-blue-900">{filteredContent.length}</p>
                      </div>
                      <AlertCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-800">Content Approved</p>
                        <p className="text-xl font-bold text-green-900">24</p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-800">Content Blocked</p>
                        <p className="text-xl font-bold text-red-900">7</p>
                      </div>
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-800">Auto-Filtered</p>
                        <p className="text-xl font-bold text-purple-900">156</p>
                      </div>
                      <RefreshCw className="h-6 w-6 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monitoring Tools */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Clock className="h-4 w-4 mr-2 text-orange-600" />
                      Real-Time Monitoring
                    </CardTitle>
                    <CardDescription className="text-xs">Live activity tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-xs font-medium">Jimmy</span>
                        </div>
                        <span className="text-xs text-gray-500">Playing Minecraft</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-xs font-medium">Sarah</span>
                        </div>
                        <span className="text-xs text-gray-500">Watching YouTube Kids</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                          <span className="text-xs font-medium">Emma</span>
                        </div>
                        <span className="text-xs text-gray-500">Offline</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3 h-7 text-xs"
                      variant="outline"
                      onClick={() => navigateToSettings('monitoring')}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure Monitoring
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Globe className="h-4 w-4 mr-2 text-blue-600" />
                      Website Monitoring
                    </CardTitle>
                    <CardDescription className="text-xs">Track web browsing</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {[
                        { site: 'youtube.com', visits: 12, status: 'allowed' },
                        { site: 'roblox.com', visits: 8, status: 'allowed' },
                        { site: 'inappropriate-site.com', visits: 1, status: 'blocked' },
                        { site: 'bible.com', visits: 5, status: 'allowed' }
                      ].map((site, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-xs font-medium">{site.site}</span>
                            <div className="text-xs text-gray-500">{site.visits} visits today</div>
                          </div>
                          <Badge variant={site.status === 'allowed' ? 'default' : 'destructive'} className="text-xs">
                            {site.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full mt-3 h-7 text-xs"
                      variant="outline"
                      onClick={() => navigateToSettings('content')}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage Website Rules
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base">
                      <Gamepad2 className="h-4 w-4 mr-2 text-purple-600" />
                      App Monitoring
                    </CardTitle>
                    <CardDescription className="text-xs">Application usage tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {[
                        { app: 'Roblox', time: '2h 15m', status: 'active' },
                        { app: 'Minecraft', time: '1h 30m', status: 'active' },
                        { app: 'TikTok', time: '0m', status: 'blocked' },
                        { app: 'Bible App', time: '45m', status: 'active' }
                      ].map((app, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-xs font-medium">{app.app}</span>
                            <div className="text-xs text-gray-500">{app.time} today</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${app.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full mt-3 h-7 text-xs"
                      variant="outline"
                      onClick={() => navigateToSettings('screentime')}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure App Limits
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Flagged Content Review */}
              <Card className="border-slate-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center text-slate-800">
                      <Shield className="h-5 w-5 mr-2 text-blue-600" />
                      Content Monitoring Dashboard
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="flex w-[300px]">
                        <Input
                          placeholder="Search flagged content..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border-slate-300 focus:border-blue-500"
                        />
                        <Button variant="ghost" className="ml-1" size="icon">
                          <Search className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Review and manage flagged content to keep your family safe
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {isLoadingFlagged ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                      <p className="text-slate-600">Loading flagged content...</p>
                    </div>
                  ) : filteredContent.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-green-800 mb-2">All Clear!</h3>
                      <p className="text-green-600 text-lg">No flagged content requires your attention</p>
                      <p className="text-green-500 text-sm mt-2">Your family's digital environment is secure</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredContent.map((flag, index) => (
                        <div
                          key={flag.id}
                          className={`group p-5 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg ${
                            index % 2 === 0
                              ? "border-l-red-500 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"
                              : "border-l-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-3">
                                {flag.contentType === 'game' && <Gamepad2 className="h-5 w-5 mr-2 text-slate-600" />}
                                {flag.contentType === 'video' && <Youtube className="h-5 w-5 mr-2 text-slate-600" />}
                                {flag.contentType === 'website' && <Globe className="h-5 w-5 mr-2 text-slate-600" />}
                                {flag.contentType === 'app' && <Shield className="h-5 w-5 mr-2 text-slate-600" />}
                                <h4 className="font-semibold text-lg text-slate-800">{flag.name}</h4>
                              </div>

                              <div className="mb-3">
                                <Badge
                                  variant="outline"
                                  className={`mr-3 font-medium ${
                                    flag.contentType === 'game' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                    flag.contentType === 'video' ? 'bg-red-100 text-red-800 border-red-300' :
                                    flag.contentType === 'website' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  {flag.contentType.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-slate-500 font-medium">
                                  Platform: {flag.platform}
                                </span>
                              </div>

                              <p className={`text-sm font-medium ${
                                index % 2 === 0 ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                ⚠️ {flag.flagReason}
                              </p>
                            </div>

                            <div className="flex flex-col space-y-2 ml-6">
                              <Button
                                size="sm"
                                onClick={() => approveContentMutation.mutate(flag.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm min-w-[100px]"
                                disabled={approveContentMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => blockContentMutation.mutate(flag.id)}
                                className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm min-w-[100px]"
                                disabled={blockContentMutation.isPending}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Block
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Summary Footer */}
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                            <span className="text-blue-800 font-medium">
                              {filteredContent.length} item{filteredContent.length !== 1 ? 's' : ''} requiring attention
                            </span>
                          </div>
                          <div className="text-sm text-blue-600">
                            Review each item carefully before making a decision
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monitoring Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                      Alert Settings
                    </CardTitle>
                    <CardDescription>Configure monitoring notifications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: 'Inappropriate Content Detected', enabled: true },
                        { name: 'New App Installation', enabled: true },
                        { name: 'Screen Time Limit Exceeded', enabled: false },
                        { name: 'Suspicious Website Access', enabled: true }
                      ].map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{alert.name}</span>
                          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${alert.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${alert.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-blue-600" />
                      Monitoring Reports
                    </CardTitle>
                    <CardDescription>Generate family safety reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Weekly Activity Report
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Content Safety Summary
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Clock className="h-4 w-4 mr-2" />
                        Screen Time Analysis
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Security Incidents Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right side - Faith Fortress Chatbot (1/4 width) */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <Card className="flex flex-col h-full sticky top-0">
              <CardContent className="p-0 h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-blue-50 rounded-t-lg">
                  <MessageCircle className="text-blue-500 h-4 w-4" />
                  <span className="font-semibold text-blue-900 text-base">Faith Fortress Chat</span>
                </div>
                <div className="overflow-y-auto px-3 py-2 space-y-2 bg-blue-50 flex-1">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-2 py-1 rounded-lg text-xs max-w-[80%] ${
                          msg.sender === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-white border text-gray-800"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex items-center gap-2 px-2 py-2 border-t bg-white rounded-b-lg">
                  <input
                    className="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-1.5 transition"
                    onClick={handleSend}
                    aria-label="Send"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}

interface Child {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  created_at: string;
  role: "child";
  parent_id: number;
  age?: number;
  profile_picture?: string;
  totalLessons?: number;
  completedLessons?: number;
  screenTime?: {
    allowedTimeMinutes: number;
    usedTimeMinutes: number;
  } | null;
}

interface FlaggedContent {
  id: number;
  name: string;
  platform: string;
  contentType: 'game' | 'video' | 'website' | 'app';
  flagReason: string;
  flaggedAt: string;
}