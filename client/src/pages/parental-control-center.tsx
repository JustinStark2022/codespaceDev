import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Shield,
  Clock,
  MessageCircle,
  Send,
  Gamepad2,
  Youtube,
  Globe,
  Calendar,
  User,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Heart,
  Book,
  Home
} from "lucide-react";
import { Child } from "@/types/user";
import { fetchChildren } from "@/api/children";
import { getFlaggedContent, FlaggedContent } from "@/api/monitoring";

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState(15);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  // Data fetching
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });

  const { data: screenTime, isLoading: screenTimeLoading } = useQuery<ScreenTimeData>({
    queryKey: [`/api/screentime?userId=${selectedChild}&date=${selectedDate}`],
    enabled: !!selectedChild,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/screentime?userId=${selectedChild}&date=${selectedDate}`);
      return res.json();
    },
  });

  const {
    data: flaggedContent = [],
    isLoading: isLoadingFlagged,
  } = useQuery<FlaggedContent[]>({
    queryKey: ["flaggedContent"],
    queryFn: getFlaggedContent,
  });

  // Mutations
  const updateScreenTimeMutation = useMutation({
    mutationFn: async (data: { userId: number, date: string, allowedTimeMinutes: number }) => {
      const res = await apiRequest("POST", "/api/screentime/update", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/screentime?userId=${selectedChild}&date=${selectedDate}`] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/games/flagged"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/games/flagged"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/games/flagged"] });
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
    if (!screenTime || !screenTime.allowedTimeMinutes || !screenTime.usedTimeMinutes) return 0;
    const total = screenTime.allowedTimeMinutes + (screenTime.additionalRewardMinutes || 0);
    return total > 0 ? Math.min(100, Math.round((screenTime.usedTimeMinutes / total) * 100)) : 0;
  };

  const adjustAllowedTime = (amount: number) => {
    if (!screenTime || !selectedChild) return;
    const newAllowedTime = Math.max(15, screenTime.allowedTimeMinutes + amount);
    updateScreenTimeMutation.mutate({
      userId: parseInt(selectedChild),
      date: selectedDate,
      allowedTimeMinutes: newAllowedTime
    });
  };

  const getSelectedChildName = () => {
    if (!selectedChild || children.length === 0) return "Child";
    const child = children.find((c) => c.id.toString() === selectedChild);
    return child ? `${child.first_name} ${child.last_name}` : "Child";
  };

  const getRemainingTime = () => {
    if (!screenTime || !screenTime.allowedTimeMinutes) return "No data";
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

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: ChatMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "I understand your concern about digital wellness. Let me help you find biblical guidance for managing screen time.",
        "Family protection starts with prayer and wisdom. How can I assist with your parental controls today?",
        "Remember Philippians 4:8 - focus on what is pure and lovely. I'm here to help filter content appropriately.",
        "Building healthy digital habits takes time and grace. What specific area would you like to address?"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const botMessage: ChatMessage = { sender: "bot", text: randomResponse };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
    
    setInput("");
  };

  const filteredContent = flaggedContent.filter((content) =>
    content.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (content.flagReason && content.flagReason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ParentLayout title="Parental Control Center">
      
      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left side - Main controls (3/4 width) */}
        <div className="lg:col-span-3">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="overview" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="screentime" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Screen Time
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Monitoring
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center text-blue-800">
                      <Clock className="h-5 w-5 mr-2" />
                      Today's Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {screenTimeLoading ? (
                      <div className="animate-pulse">Loading...</div>
                    ) : screenTime ? (
                      <div>
                        <div className="text-2xl font-bold text-blue-900">
                          {formatMinutes(screenTime.usedTimeMinutes || 0)}
                        </div>
                        <div className="text-sm text-blue-600">
                          of {formatMinutes((screenTime.allowedTimeMinutes || 0) + (screenTime.additionalRewardMinutes || 0))} allowed
                        </div>
                        <Progress value={calculateTimeUsedPercentage()} className="mt-2 h-2" />
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold text-blue-900">0h 0m</div>
                        <div className="text-sm text-blue-600">of 2h 0m allowed</div>
                        <Progress value={0} className="mt-2 h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center text-green-800">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Content Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">
                      {flaggedContent.length}
                    </div>
                    <div className="text-sm text-green-600">items need review</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center text-amber-800">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Family Wellness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-900">Good</div>
                    <div className="text-sm text-amber-600">healthy digital habits</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-h-[200px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Recent Family Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    {selectedChild ? (
                      <div className="text-center text-gray-500">
                        <Book className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>Activity monitoring for {getSelectedChildName()}</p>
                        <p className="text-sm">Choose the Screen Time or Content tabs for detailed management</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>Select a child to view their activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screen Time Tab */}
            <TabsContent value="screentime" className="space-y-6">
              {!selectedChild ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium">Select a Child</h3>
                    <p className="text-sm text-gray-600">Choose a child to manage their screen time</p>
                  </CardContent>
                </Card>
              ) : screenTimeLoading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-gray-600">Loading screen time data...</p>
                  </CardContent>
                </Card>
              ) : !screenTime ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium">No Screen Time Data</h3>
                    <p className="text-sm text-gray-600">No data available for {selectedDate}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-white border-2 border-blue-100">
                    <CardHeader>
                      <CardTitle className="text-blue-800">Daily Usage</CardTitle>
                      <CardDescription>
                        {formatMinutes(screenTime.usedTimeMinutes)} of {formatMinutes(screenTime.allowedTimeMinutes + screenTime.additionalRewardMinutes)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress value={calculateTimeUsedPercentage()} className="h-3 rounded-full" />
                      <div className="mt-2 text-sm text-gray-600">
                        {getRemainingTime()} remaining
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-2 border-green-100">
                    <CardHeader>
                      <CardTitle className="text-green-800">Quick Adjust</CardTitle>
                      <CardDescription>Modify time limits with wisdom</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => adjustAllowedTime(-adjustmentAmount)} 
                          variant="outline"
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          -{adjustmentAmount}m
                        </Button>
                        <Button 
                          onClick={() => adjustAllowedTime(adjustmentAmount)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          +{adjustmentAmount}m
                        </Button>
                      </div>
                      <Select value={adjustmentAmount.toString()} onValueChange={(value) => setAdjustmentAmount(parseInt(value))}>
                        <SelectTrigger>
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
                    <CardHeader>
                      <CardTitle className="text-purple-800">Rewards Earned</CardTitle>
                      <CardDescription>Bonus time for good behavior</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-900">
                        {formatMinutes(screenTime.additionalRewardMinutes)}
                      </div>
                      <p className="text-sm text-purple-600 mt-1">
                        Extra time through faithful choices
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Content Analysis
                    </span>
                    <div className="flex w-[300px]">
                      <Input
                        placeholder="Search content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                      <Button variant="ghost" className="ml-1" size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAnalyzeSubmit} className="space-y-4 mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        id="content-name" 
                        name="content-name" 
                        placeholder="e.g., Minecraft" 
                        required 
                      />
                      <Select defaultValue="Roblox" name="content-platform">
                        <SelectTrigger id="content-platform">
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
                      className="min-h-[80px] w-full rounded-md border p-3 text-sm"
                      rows={3}
                    />
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={analyzeContentMutation.isPending}>
                      {analyzeContentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing with biblical wisdom...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Analyze Content
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side - Faith Fortress Chatbot (1/4 width) */}
        <div className="lg:col-span-1">
          <Card className="h-[400px] flex flex-col">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-blue-50 rounded-t-lg">
                <MessageCircle className="text-blue-500" />
                <span className="font-semibold text-blue-900 text-lg">Faith Fortress Chat</span>
              </div>
              <div className="overflow-y-auto px-4 py-2 space-y-2 bg-blue-50 flex-1">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
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
              <div className="flex items-center gap-2 px-3 py-2 border-t bg-white rounded-b-lg">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 transition"
                  onClick={handleSend}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ParentLayout>
  );
}