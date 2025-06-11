import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import ParentLayout from "../components/layout/parent-layout";
import ChildLayout from "../components/layout/child-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { BookOpen, Play, CheckCircle2 } from "lucide-react";

// Sample lesson data for testing
const sampleLessons = [
  {
    id: 1,
    title: "David and Goliath",
    description: "Learn about courage and faith through the story of David and Goliath.",
    category: "Bible Stories",
    difficulty: "beginner" as const,
    estimated_time: 15,
    scripture_reference: "1 Samuel 17",
    content: `
      <h3>The Story of David and Goliath</h3>
      <p>Long ago, there was a young shepherd boy named David. He was brave and trusted in God.</p>
      <p>One day, a giant named Goliath challenged the army of Israel. Everyone was afraid, but David stepped forward.</p>
      <p>With just a sling and a stone, and faith in God, David defeated the giant!</p>
      <h4>What We Learn:</h4>
      <ul>
        <li>God is always with us</li>
        <li>We can be brave when we trust in God</li>
        <li>Size doesn't matter when God is on our side</li>
      </ul>
    `,
  },
  {
    id: 2,
    title: "The Good Samaritan",
    description: "Discover the importance of helping others through this parable of Jesus.",
    category: "Bible Stories",
    difficulty: "beginner" as const,
    estimated_time: 12,
    scripture_reference: "Luke 10:25-37",
    content: `
      <h3>The Good Samaritan</h3>
      <p>Jesus told a story about a man who was hurt on the road. Many people passed by without helping.</p>
      <p>But one man, a Samaritan, stopped to help. He took care of the hurt man and made sure he was safe.</p>
      <h4>What We Learn:</h4>
      <ul>
        <li>We should help others when they need it</li>
        <li>Being kind is more important than being busy</li>
        <li>Everyone is our neighbor</li>
      </ul>
    `,
  },
];

export default function LessonsSimple() {
  const { user } = useAuth();
  const isChild = user?.role === "child";
  const Layout = isChild ? ChildLayout : ParentLayout;

  const [selectedLesson, setSelectedLesson] = useState<typeof sampleLessons[0] | null>(null);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  const handleStartLesson = (lesson: typeof sampleLessons[0]) => {
    setSelectedLesson(lesson);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      setCompletedLessons(prev => [...prev, selectedLesson.id]);
      setSelectedLesson(null);
    }
  };

  const isCompleted = (lessonId: number) => completedLessons.includes(lessonId);

  return (
    <Layout title="Bible Lessons">
      <div className="h-full flex flex-col max-w-7xl mx-auto overflow-hidden">
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-purple-900">Bible Lessons</h1>
                <p className="text-purple-600 text-xs">Learn and grow in faith</p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Content Area */}
        <div className="flex-1 flex gap-4 mt-3 min-h-0">
          {/* Lessons List */}
          <Card className="flex-2 flex flex-col min-h-0" style={{ flex: '2' }}>
            <CardHeader className="pb-3">
              <CardTitle>Available Lessons ({sampleLessons.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {sampleLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="group p-4 border rounded-xl hover:border-purple-300 hover:shadow-md transition-all cursor-pointer bg-white"
                    onClick={() => handleStartLesson(lesson)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <BookOpen className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 group-hover:text-purple-700">
                              {lesson.title}
                            </h3>
                            <p className="text-sm text-gray-600">{lesson.scripture_reference}</p>
                          </div>
                          {isCompleted(lesson.id) && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {lesson.description}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {lesson.difficulty}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {lesson.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {lesson.estimated_time} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lesson Viewer */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle>
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
                    <Button 
                      onClick={handleCompleteLesson}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Lesson
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
