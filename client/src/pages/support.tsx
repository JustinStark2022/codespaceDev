import { useState, useEffect, useRef } from "react";
import ParentLayout from "@/components/layout/parent-layout";
import ChildLayout from "@/components/layout/child-layout";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  FileQuestion,
  Loader2,
  Send,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Settings,
  Shield,
  Heart,
  Star,
  Zap,
  Globe,
  Headphones,
  Video,
  Download,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  PlayCircle,
  FileText,
  Lightbulb,
  Coffee,
  Smile
} from "lucide-react";

// Chat message interface
interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  message: string;
  timestamp: Date;
  type?: "text" | "suggestion" | "action";
}

// FAQ categories and items
const faqCategories = {
  "Getting Started": [
    {
      question: "How do I create my first child account?",
      answer: "Navigate to 'Child Accounts' in your parent dashboard, click 'Add Child', and fill in their information. Each child gets their own personalized experience with age-appropriate content and lessons.",
      category: "setup",
      helpful: 24,
      icon: "👶"
    },
    {
      question: "What's the first thing I should do after signing up?",
      answer: "Start by setting up content filters in Settings, then create child accounts, and finally configure screen time limits. Our Getting Started guide walks you through each step.",
      category: "setup",
      helpful: 18,
      icon: "🚀"
    }
  ],
  "Content Filtering": [
    {
      question: "How does Kingdom AI content filtering work?",
      answer: "Our advanced AI analyzes games, videos, and websites using biblical values as the foundation. It checks for violence, inappropriate language, occult themes, and content that conflicts with Christian teachings.",
      category: "filtering",
      helpful: 42,
      icon: "🛡️"
    },
    {
      question: "Can I customize what gets blocked?",
      answer: "Absolutely! You can adjust filter sensitivity, create custom block lists, approve specific content, and set different rules for each child based on their age and maturity.",
      category: "filtering",
      helpful: 31,
      icon: "⚙️"
    },
    {
      question: "What happens when inappropriate content is found?",
      answer: "The content is immediately flagged and optionally blocked. You'll receive a notification and can review it in your dashboard to approve, block permanently, or adjust your filters.",
      category: "filtering",
      helpful: 28,
      icon: "🚨"
    }
  ],
  "Screen Time & Rewards": [
    {
      question: "How do Bible lesson rewards work?",
      answer: "When your child completes Bible lessons, memorizes verses, or engages in spiritual activities, they earn bonus screen time. Default is 15 minutes per lesson, but you can customize this.",
      category: "rewards",
      helpful: 35,
      icon: "🏆"
    },
    {
      question: "Can I set different limits for weekdays vs weekends?",
      answer: "Yes! You can set separate time limits for school days and weekends, plus special schedules for holidays or summer break. Each child can have their own unique schedule.",
      category: "time",
      helpful: 22,
      icon: "📅"
    }
  ],
  "Technical Support": [
    {
      question: "What devices are supported?",
      answer: "Kingdom Kids works on Windows, Mac, iOS, Android, and most web browsers. We also offer browser extensions for Chrome, Firefox, and Safari.",
      category: "technical",
      helpful: 19,
      icon: "📱"
    },
    {
      question: "Is my family's data secure?",
      answer: "Yes! We use enterprise-grade encryption, never sell your data, and comply with COPPA and GDPR. All data is stored securely and you maintain full control over your family's information.",
      category: "security",
      helpful: 41,
      icon: "🔒"
    }
  ]
};

// Chat agent responses
const agentResponses = [
  "Hi there! I'm Faith, your Kingdom Kids support assistant. How can I help you create a safer digital environment for your family today? 😊",
  "I'd be happy to help you with that! Let me guide you through the process step by step.",
  "That's a great question! Many parents ask about this. Here's what I recommend...",
  "I understand your concern about digital safety. Let me share some biblical wisdom and practical tips.",
  "Wonderful! It sounds like you're taking great steps to protect your family's digital wellness.",
  "Let me help you find the perfect solution for your family's needs.",
  "That's exactly the kind of thoughtful parenting that makes a difference! Here's how to set that up...",
  "I can definitely help with that! This is one of our most popular features."
];

// Quick action suggestions
const quickActions = [
  { text: "Set up content filters", icon: "🛡️", action: "filters" },
  { text: "Create child account", icon: "👶", action: "account" },
  { text: "Configure screen time", icon: "⏰", action: "screentime" },
  { text: "View Bible lessons", icon: "📖", action: "lessons" },
  { text: "Check app status", icon: "📊", action: "status" },
  { text: "Contact human support", icon: "👨‍💼", action: "human" }
];

export default function Support() {
  const { user } = useAuth();
  const isChild = user?.role === "child";
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "agent",
      message: "Hi there! I'm Faith, your Kingdom Kids support assistant. How can I help you create a safer digital environment for your family today? 😊",
      timestamp: new Date(),
      type: "text"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle contact form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !message) {
      toast({
        title: "Missing information",
        description: "Please fill out all fields in the contact form.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success message
      toast({
        title: "Message sent!",
        description: "We've received your message and will respond soon.",
      });

      // Reset form
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle chat message sending
  const handleChatSend = () => {
    if (!chatInput.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      message: chatInput,
      timestamp: new Date(),
      type: "text"
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        message: randomResponse,
        timestamp: new Date(),
        type: "text"
      };

      setChatMessages(prev => [...prev, agentMessage]);
      setIsChatTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  // Handle quick action clicks
  const handleQuickAction = (action: string) => {
    const actionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      message: `Help me with: ${quickActions.find(a => a.action === action)?.text}`,
      timestamp: new Date(),
      type: "text"
    };

    setChatMessages(prev => [...prev, actionMessage]);
    setIsChatTyping(true);

    setTimeout(() => {
      let response = "";
      switch (action) {
        case "filters":
          response = "Great choice! Content filtering is essential for family safety. Go to Settings > Content Filters to configure what gets blocked. I recommend starting with 'Balanced' mode and adjusting from there.";
          break;
        case "account":
          response = "Creating child accounts is easy! Go to Child Accounts > Add Child. You'll need their name, age, and can set their initial preferences. Each child gets their own personalized experience!";
          break;
        case "screentime":
          response = "Screen time management helps create healthy digital habits. In Settings > Screen Time, you can set daily limits, bedtime schedules, and reward systems for Bible study completion.";
          break;
        case "lessons":
          response = "Our Bible lessons are designed to be engaging and age-appropriate. Your children can access them from their dashboard, and completing lessons earns them bonus screen time!";
          break;
        case "status":
          response = "I can see your Kingdom Kids system is running smoothly! All filters are active, and your family's digital protection is working as intended. Is there anything specific you'd like to check?";
          break;
        case "human":
          response = "I'd be happy to connect you with our human support team! You can reach them via the contact form, phone at (555) 123-4567, or email support@kingdomkids.com. They're available Monday-Friday, 9 AM - 5 PM ET.";
          break;
        default:
          response = "I'm here to help with whatever you need! Feel free to ask me anything about Kingdom Kids.";
      }

      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        message: response,
        timestamp: new Date(),
        type: "text"
      };

      setChatMessages(prev => [...prev, agentMessage]);
      setIsChatTyping(false);
    }, 1500);
  };

  // Filter FAQs based on search and category
  const getFilteredFAQs = () => {
    let allFAQs: any[] = [];

    if (selectedCategory === "all") {
      Object.values(faqCategories).forEach(categoryItems => {
        allFAQs = [...allFAQs, ...categoryItems];
      });
    } else {
      allFAQs = faqCategories[selectedCategory as keyof typeof faqCategories] || [];
    }

    if (searchQuery) {
      allFAQs = allFAQs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return allFAQs;
  };
  
  const Layout = isChild ? ChildLayout : ParentLayout;

  return (
    <Layout title="Support">
      <div className="max-w-[1440px] mx-auto px-2 sm:px-4 py-4 space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center">
      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg mr-4">
        <HelpCircle className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-base text-gray-600">Get help, find answers, and connect with our support team</p>
      </div>
    </div>
    </div>

  </div>

  {/* Main Content Grid */}
  <div className="flex flex-col lg:flex-row gap-8 items-stretch w-full">
  {/* Left Sidebar */}
  <div className="w-full lg:w-1/4 flex flex-col gap-6 bg-gradient-to-b from-blue-50/70 to-white/80 rounded-2xl p-4 shadow-md min-h-[400px] h-full">
    {/* Quick Actions */}
    <Card className="flex-1 rounded-xl shadow-md flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            className="w-full justify-start h-9 text-sm rounded-lg"
            onClick={() => handleQuickAction(action.action)}
          >
            <span className="mr-2">{action.icon}</span>
            {action.text}
          </Button>
        ))}
      </CardContent>
    </Card>

    {/* Live Chat */}
    <Card className="flex-1 min-h-[600px] max-h-[930px] flex-col rounded-xl shadow-md bg-white/90">

              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-blue-500" />
                  Chat with Faith
                  <Badge variant="secondary" className="ml-2 text-xs">AI Assistant</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Get instant help from our AI support agent</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-full p-0 min-h-[600px]">
                <div className="flex flex-col h-full min-h-[500px]">
                  {/* --- messages area --- */}
                  <div className="flex-1 overflow-auto p-4">
                    {chatMessages.length === 0 && (
                      <div className="text-gray-400 text-center mt-8">No messages yet. Start the conversation!</div>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg text-xs ${
                          msg.sender === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          <div className="flex items-start space-x-1">
                            {msg.sender === "agent" && <Bot className="h-3 w-3 mt-0.5 text-blue-500" />}
                            {msg.sender === "user" && <User className="h-3 w-3 mt-0.5" />}
                            <span>{msg.message}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isChatTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-2 rounded-lg text-xs">
                          <div className="flex items-center space-x-1">
                            <Bot className="h-3 w-3 text-blue-500" />
                            <span>Faith is typing...</span>
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* --- chat input, always at bottom, visually separated --- */}
                  <div className="mt-auto flex space-x-2 p-4 border-t border-gray-200 bg-white/95 shadow-sm">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Faith anything..."
                      className="h-8 text-xs"
                      onKeyPress={(e) => e.key === "Enter" && handleChatSend()}
                    />
                    <Button size="sm" onClick={handleChatSend} className="h-8 w-8 p-0">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-6 flex-1 flex-col space-y-4 h-full">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <CardTitle className="text-lg flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Support Center
                </CardTitle>
                <CardDescription>Everything you need to get the most out of Kingdom Kids</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex-1">
                  <TabsList className="grid grid-cols-3 mb-6 h-10 bg-gray-100">
                    <TabsTrigger value="overview" className="text-sm font-medium">
                      <Star className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="faqs" className="text-sm font-medium">
                      <FileQuestion className="h-4 w-4 mr-2" />
                      FAQs
                    </TabsTrigger>
                    <TabsTrigger value="guides" className="text-sm font-medium">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Guides
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6 flex-1 overflow-y-auto">
                    {/* Feature Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-md rounded-xl flex flex-col justify-between h-full">
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex items-center mb-3">
        <Shield className="h-6 w-6 text-blue-600 mr-3" />
        <h3 className="font-bold text-lg text-blue-800">Content Protection</h3>
      </div>
      <p className="text-blue-700 mb-4 flex-1">AI-powered filtering keeps your family safe from inappropriate content across all devices and platforms</p>
      <Button variant="outline" size="sm" className="mt-2 h-8 text-sm border-blue-300 text-blue-700 hover:bg-blue-200">
        Learn More
      </Button>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-md rounded-xl flex flex-col justify-between h-full">
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex items-center mb-3">
        <Heart className="h-6 w-6 text-green-600 mr-3" />
        <h3 className="font-bold text-lg text-green-800">Biblical Values</h3>
      </div>
      <p className="text-green-700 mb-4 flex-1">Every feature is designed with Christian principles at its core, helping families grow in faith together</p>
      <Button variant="outline" size="sm" className="mt-2 h-8 text-sm border-green-300 text-green-700 hover:bg-green-200">
        Explore
      </Button>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-md rounded-xl flex flex-col justify-between h-full">
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex items-center mb-3">
        <Clock className="h-6 w-6 text-purple-600 mr-3" />
        <h3 className="font-bold text-lg text-purple-800">Screen Time Balance</h3>
      </div>
      <p className="text-purple-700 mb-4 flex-1">Healthy digital habits with Bible-based reward systems that encourage spiritual growth</p>
      <Button variant="outline" size="sm" className="mt-2 h-8 text-sm border-purple-300 text-purple-700 hover:bg-purple-200">
        Set Up
      </Button>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 shadow-md rounded-xl flex flex-col justify-between h-full">
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex items-center mb-3">
        <Headphones className="h-6 w-6 text-orange-600 mr-3" />
        <h3 className="font-bold text-lg text-orange-800">24/7 Support</h3>
      </div>
      <p className="text-orange-700 mb-4 flex-1">Get help whenever you need it from our caring support team who understand family needs</p>
      <Button variant="outline" size="sm" className="mt-2 h-8 text-sm border-orange-300 text-orange-700 hover:bg-orange-200">
        Contact Us
      </Button>
    </CardContent>
  </Card>
</div>

                    {/* Quick Stats */}
                    <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                      <CardHeader className="pb-4 flex-1">
                        <CardTitle className="text-xl font-bold text-center">Kingdom Kids by the Numbers</CardTitle>
                        <CardDescription className="text-center">Trusted by families worldwide</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 mt-2 mb-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center mt-2 mb-2 p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-blue-600 mb-1">50K+</div>
                            <div className="text-sm text-gray-600 font-medium">Families Protected</div>
                          </div>
                          <div className="text-center mt-2 mb-2 p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-green-600 mb-1">1M+</div>
                            <div className="text-sm text-gray-600 font-medium">Content Items Filtered</div>
                          </div>
                          <div className="text-center mt-2 mb-2 p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-purple-600 mb-1">99.9%</div>
                            <div className="text-sm text-gray-600 font-medium">Uptime</div>
                          </div>
                          <div className="text-center mt-2 mb-2 p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-orange-600 mb-1">4.9★</div>
                            <div className="text-sm text-gray-600 font-medium">Parent Rating</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* FAQs Tab */}
                  <TabsContent value="faqs" className="space-y-4 flex-1 overflow-y-auto">
                    {/* Search and Filter */}
                    <div className="flex space-x-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          placeholder="Search FAQs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-7 h-7 text-xs"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-1 border rounded-md text-xs"
                      >
                        <option value="all">All Categories</option>
                        {Object.keys(faqCategories).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* FAQ Items */}
                    <div className="space-y-3">
                      {getFilteredFAQs().map((faq, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <Accordion type="single" collapsible>
                              <AccordionItem value={`faq-${index}`} className="border-none">
                                <AccordionTrigger className="text-left font-medium text-sm py-2">
                                  <div className="flex items-center">
                                    <span className="mr-2">{faq.icon}</span>
                                    {faq.question}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-gray-600 pt-2">
                                  <p className="mb-3">{faq.answer}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                                        <Heart className="h-3 w-3 mr-1" />
                                        Helpful ({faq.helpful})
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Learn More
                                      </Button>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {faq.category}
                                    </Badge>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {getFilteredFAQs().length === 0 && (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No FAQs found</h3>
                        <p className="text-sm text-gray-500">Try adjusting your search or category filter</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Guides Tab */}
                  <TabsContent value="guides" className="space-y-4 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Getting Started Guide */}
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <PlayCircle className="h-4 w-4 mr-2 text-blue-500" />
                            Getting Started Guide
                          </CardTitle>
                          <CardDescription className="text-xs">Complete setup in 5 easy steps</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {[
                            { step: 1, title: "Create Child Accounts", desc: "Set up personalized accounts for each child" },
                            { step: 2, title: "Configure Content Filters", desc: "Align filtering with your family values" },
                            { step: 3, title: "Set Screen Time Limits", desc: "Establish healthy digital boundaries" },
                            { step: 4, title: "Enable Bible Rewards", desc: "Motivate spiritual growth with screen time" },
                            { step: 5, title: "Monitor & Adjust", desc: "Review activity and fine-tune settings" }
                          ].map((item) => (
                            <div key={item.step} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {item.step}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{item.title}</div>
                                <div className="text-xs text-gray-600">{item.desc}</div>
                              </div>
                            </div>
                          ))}
                          <Button className="w-full mt-3 h-7 text-xs">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Start Setup Wizard
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Video Tutorials */}
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Video className="h-4 w-4 mr-2 text-green-500" />
                            Video Tutorials
                          </CardTitle>
                          <CardDescription className="text-xs">Watch step-by-step guides</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {[
                            { title: "Setting Up Content Filters", duration: "3:45", views: "12K" },
                            { title: "Managing Screen Time", duration: "2:30", views: "8.5K" },
                            { title: "Creating Child Accounts", duration: "4:15", views: "15K" },
                            { title: "Understanding Reports", duration: "5:20", views: "6.2K" }
                          ].map((video, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-6 bg-red-500 rounded flex items-center justify-center">
                                  <PlayCircle className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-xs">{video.title}</div>
                                  <div className="text-xs text-gray-500">{video.duration} • {video.views} views</div>
                                </div>
                              </div>
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </div>
                          ))}
                          <Button variant="outline" className="w-full mt-3 h-7 text-xs">
                            <Video className="h-3 w-3 mr-1" />
                            View All Videos
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Troubleshooting */}
                      <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                            Troubleshooting
                          </CardTitle>
                          <CardDescription className="text-xs">Common issues and solutions</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {[
                            "App not blocking content properly",
                            "Child can't access approved websites",
                            "Screen time limits not working",
                            "Bible rewards not being added",
                            "Notifications not appearing"
                          ].map((issue, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                              <span className="text-xs">{issue}</span>
                              <Button variant="ghost" size="sm" className="h-5 text-xs">
                                Fix
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" className="w-full mt-3 h-7 text-xs">
                            <Lightbulb className="h-3 w-3 mr-1" />
                            More Solutions
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Downloads */}
                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Download className="h-4 w-4 mr-2 text-purple-500" />
                            Downloads & Resources
                          </CardTitle>
                          <CardDescription className="text-xs">Helpful documents and tools</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {[
                            { name: "Parent Setup Guide", type: "PDF", size: "2.1 MB" },
                            { name: "Family Digital Covenant", type: "PDF", size: "1.5 MB" },
                            { name: "Bible Verse Memory Cards", type: "PDF", size: "3.2 MB" },
                            { name: "Screen Time Tracker", type: "Excel", size: "0.8 MB" }
                          ].map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <div>
                                  <div className="font-medium text-xs">{file.name}</div>
                                  <div className="text-xs text-gray-500">{file.type} • {file.size}</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-5 text-xs">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

    {/* Right Sidebar - Grouped Panel */}
    <div className="w-full lg:w-1/4 flex flex-col h-full">
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white rounded-2xl shadow-md p-4 gap-6 h-full">
        {/* Contact Form */}
        <Card className="rounded-xl shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Mail className="h-4 w-4 mr-2 text-blue-500" />
              Contact Support
            </CardTitle>
            <CardDescription className="text-xs">Get personalized help from our team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-medium">Your Name</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-7 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-7 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="message" className="text-xs font-medium">Message</label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  rows={3}
                  className="text-xs"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-7 text-xs"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-3 w-3" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support Channels */}
        <Card className="rounded-xl shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Headphones className="h-4 w-4 mr-2 text-green-500" />
              Support Channels
            </CardTitle>
            <CardDescription className="text-xs">Multiple ways to get help</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-2 rounded-lg bg-blue-50">
                <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm text-blue-800">Phone Support</h3>
                  <p className="text-xs text-blue-600">(555) 123-4567</p>
                  <p className="text-xs text-blue-500">Mon-Fri, 9 AM - 5 PM ET</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2 rounded-lg bg-green-50">
                <Mail className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm text-green-800">Email Support</h3>
                  <p className="text-xs text-green-600">support@kingdomkids.com</p>
                  <p className="text-xs text-green-500">Response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2 rounded-lg bg-purple-50">
                <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm text-purple-800">Live Chat</h3>
                  <p className="text-xs text-purple-600">Available in-app</p>
                  <p className="text-xs text-purple-500">Daily, 10 AM - 8 PM ET</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Community */}
        <Card className="rounded-xl shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Heart className="h-4 w-4 mr-2 text-pink-500" />
              Community
            </CardTitle>
            <CardDescription className="text-xs">Connect with other families</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Button variant="outline" className="w-full justify-start h-7 text-xs">
              <MessageSquare className="h-3 w-3 mr-2" />
              Parent Forum
            </Button>
            <Button variant="outline" className="w-full justify-start h-7 text-xs">
              <Coffee className="h-3 w-3 mr-2" />
              Weekly Q&A
            </Button>
            <Button variant="outline" className="w-full justify-start h-7 text-xs">
              <BookOpen className="h-3 w-3 mr-2" />
                  Family Stories
                </Button>
                <Button variant="outline" className="w-full justify-start h-7 text-xs">
                  <Smile className="h-3 w-3 mr-2" />
                  Success Tips
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
