import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import ParentLayout from "@/components/layout/parent-layout";
import ChildLayout from "@/components/layout/child-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Play, 
  Pause,
  CheckCircle2, 
  Clock, 
  Trophy,
  Star,
  Search,
  Filter,
  Calendar,
  User,
  Award,
  Heart,
  Share2,
  Bookmark,
  ChevronRight,
  Target,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_time: number;
  scripture_reference: string;
  content: string;
  created_at: string;
}

interface LessonProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  progress_percentage: number;
  time_spent: number;
  completed_at: string | null;
}

interface Child {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 border-yellow-300",
  advanced: "bg-red-100 text-red-800 border-red-300"
};

const categoryIcons = {
  "Bible Stories": BookOpen,
  "Prayer": Heart,
  "Faith": Star,
  "Character": Award,
  "Scripture": BookOpen,
  "Worship": Heart
};

export default function Lessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isChild = user?.role === "child";
  const Layout = isChild ? ChildLayout : ParentLayout;

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonStarted, setIsLessonStarted] = useState(false);

  // Fetch lessons - Updated to handle real database response
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lessons");
      const json = await res.json();
      // Handle both array and object responses
      return Array.isArray(json) ? json : (json.data || []);
    },
  });

  // Fetch children (for parents) - Updated
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    enabled: !isChild,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/children");
      const json = await res.json();
      // Handle both array and object responses
      return Array.isArray(json) ? json : (json.data || json || []);
    },
  });

  // Fetch lesson progress - Updated
  const { data: lessonProgress = [] } = useQuery<LessonProgress[]>({
    queryKey: ["lessonProgress", selectedChild || user?.id],
    enabled: !!(selectedChild || user?.id),
    queryFn: async () => {
      const userId = selectedChild || user?.id;
      const res = await apiRequest("GET", `/api/lessons/progress?userId=${userId}`);
      const json = await res.json();
      // Handle both array and object responses
      return Array.isArray(json) ? json : (json.data || []);
    },
  });

  // Mark lesson as completed - Updated
  const completeLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: number; userId: number }) => {
      const res = await apiRequest("POST", "/api/lessons/complete", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessonProgress"] });
      toast({ 
        title: "Lesson Completed! 🎉", 
        description: "Great job! You've earned screen time rewards." 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete lesson",
        variant: "destructive"
      });
    }
  });

  // Auto-select first child for parents
  useEffect(() => {
    if (!isChild && !selectedChild && children.length > 0) {
      setSelectedChild(children[0].id.toString());
    }
  }, [children, selectedChild, isChild]);

  // Filter and search lessons
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.scripture_reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || lesson.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || lesson.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Get lesson progress for a specific lesson
  const getLessonProgress = (lessonId: number) => {
    return lessonProgress.find(p => p.lesson_id === lessonId);
  };

  // Calculate overall progress
  const overallProgress = lessons.length > 0 
    ? Math.round((lessonProgress.filter(p => p.completed).length / lessons.length) * 100)
    : 0;

  // Get unique categories from actual lesson data
  const categories = lessons.length > 0 ? [...new Set(lessons.map(l => l.category))] : [];

  const handleStartLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsLessonStarted(true);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      const userId = isChild ? user!.id : parseInt(selectedChild);
      completeLessonMutation.mutate({ 
        lessonId: selectedLesson.id, 
        userId 
      });
      setIsLessonStarted(false);
      setSelectedLesson(null);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Layout title="My Faith Fortress Bible Lessons">
      <div className="h-full flex flex-col max-w-7xl mx-auto overflow-hidden">
        {/* Header Controls */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 flex-shrink-0">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-purple-900">Bible Lessons</h1>
                  <p className="text-purple-600 text-xs">Learn and grow in faith</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Heart className="w-3 h-3 mr-1" />
                  Favorite
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="py-3 space-y-3">
            {/* Navigation and Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {!isChild && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Child</label>
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger className="bg-white border-gray-300 h-7 text-sm">
                      <SelectValue placeholder="Select Child" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id.toString()}>
                          {child.first_name} {child.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white border-gray-300 h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Difficulty</label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="bg-white border-gray-300 h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-medium text-gray-700">Search Lessons</label>
                <div className="relative">
                  <Input
                    placeholder="Search by title, description, or scripture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-sm pr-8"
                  />
                  <Search className="absolute right-2 top-1.5 h-3 w-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-purple-200">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-600">Overall Progress</div>
                <div className="text-lg font-bold text-purple-900">{overallProgress}%</div>
                <Progress value={overallProgress} className="h-1 mt-1" />
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-600">Completed</div>
                <div className="text-lg font-bold text-green-900">
                  {lessonProgress.filter(p => p.completed).length}
                </div>
                <div className="text-xs text-gray-500">of {lessons.length} lessons</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-600">Time Spent</div>
                <div className="text-lg font-bold text-blue-900">
                  {formatTime(lessonProgress.reduce((acc, p) => acc + (p.time_spent || 0), 0))}
                </div>
                <div className="text-xs text-gray-500">learning together</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-600">Achievements</div>
                <div className="text-lg font-bold text-yellow-900">
                  {lessonProgress.filter(p => p.completed).length}
                </div>
                <div className="text-xs text-gray-500">lessons mastered</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="flex-1 flex gap-4 mt-3 min-h-0">
          {/* Lessons List */}
          <Card className="flex-2 flex flex-col min-h-0" style={{ flex: '2' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-600" />
                  Available Lessons ({filteredLessons.length})
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {selectedCategory === "all" ? "All Categories" : selectedCategory}
                  </Badge>
                  {selectedDifficulty !== "all" && (
                    <Badge variant="outline" className={difficultyColors[selectedDifficulty as keyof typeof difficultyColors]}>
                      {selectedDifficulty}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {lessonsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading lessons...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Lessons Available</h3>
                  <p className="text-gray-500">Check back later for new faith-building content.</p>
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Matching Lessons</h3>
                  <p className="text-gray-500">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLessons.map((lesson) => {
                    const progress = getLessonProgress(lesson.id);
                    const IconComponent = categoryIcons[lesson.category as keyof typeof categoryIcons] || BookOpen;
                    
                    return (
                      <div
                        key={lesson.id}
                        className="group p-4 border rounded-xl hover:border-purple-300 hover:shadow-md transition-all cursor-pointer bg-white"
                        onClick={() => handleStartLesson(lesson)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <IconComponent className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 group-hover:text-purple-700">
                                  {lesson.title}
                                </h3>
                                <p className="text-sm text-gray-600">{lesson.scripture_reference}</p>
                              </div>
                              {progress?.completed && (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {lesson.description}
                            </p>
                            
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={difficultyColors[lesson.difficulty]}>
                                {lesson.difficulty}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {lesson.category}
                              </Badge>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(lesson.estimated_time)}
                              </div>
                            </div>
                            
                            {progress && !progress.completed && progress.progress_percentage > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Progress</span>
                                  <span>{progress.progress_percentage}%</span>
                                </div>
                                <Progress value={progress.progress_percentage} className="h-1" />
                              </div>
                            )}
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 ml-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lesson Viewer */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                {selectedLesson ? "Lesson Viewer" : "Select a Lesson"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {!selectedLesson ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Ready to Learn?</h3>
                  <p className="text-gray-500">Click on any lesson from the list to start your faith journey.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lesson Header */}
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedLesson.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      <Badge variant="outline" className={difficultyColors[selectedLesson.difficulty]}>
                        {selectedLesson.difficulty}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {selectedLesson.category}
                      </Badge>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(selectedLesson.estimated_time)}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center mb-1">
                        <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-800">Scripture Reference</span>
                      </div>
                      <p className="text-blue-700">{selectedLesson.scripture_reference}</p>
                    </div>
                  </div>

                  {/* Lesson Content */}
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    {!isLessonStarted ? (
                      <Button 
                        onClick={() => setIsLessonStarted(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Lesson
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleCompleteLesson}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        disabled={completeLessonMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {completeLessonMutation.isPending ? "Completing..." : "Complete Lesson"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
