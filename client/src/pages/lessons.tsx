import { useState, useRef, useEffect } from "react";
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
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Trophy,
  Star,
  Users,
  Target,
  Award,
  Heart,
  Zap,
  Gift,
  Calendar,
  User,
  MessageCircle,
  Send,
  Bot,
  Lightbulb,
  HelpCircle,
  Sparkles
} from "lucide-react";

// Enhanced lesson data with more features
const sampleLessons = [
  {
    id: 1,
    title: "David and Goliath",
    description: "Learn about courage and faith through the story of David and Goliath.",
    category: "Bible Stories",
    difficulty: "beginner" as const,
    estimated_time: 15,
    scripture_reference: "1 Samuel 17",
    age_range: "6-10",
    rewards: { screen_time: 30, points: 100 },
    objectives: [
      "Understand that God gives us courage",
      "Learn about trusting in God's power",
      "Recognize that size doesn't determine strength"
    ],
    activities: [
      { type: "video", title: "Watch: David's Story", duration: 5 },
      { type: "quiz", title: "Test Your Knowledge", duration: 3 },
      { type: "reflection", title: "Personal Reflection", duration: 7 }
    ],
    content: `
      <div class="lesson-content">
        <h3>🏹 The Story of David and Goliath</h3>
        <div class="story-section">
          <p><strong>Setting the Scene:</strong> Long ago in ancient Israel, there was a young shepherd boy named David. He spent his days watching over sheep and playing his harp, but most importantly, he loved and trusted God with all his heart.</p>

          <p><strong>The Challenge:</strong> One day, a giant warrior named Goliath from the enemy army challenged Israel. He was over 9 feet tall and wore heavy armor. For 40 days, he taunted God's people, and everyone was terrified!</p>

          <p><strong>David's Courage:</strong> When David heard Goliath mocking God, he was upset. "Who is this giant to defy the armies of the living God?" he asked. While everyone else saw an impossible enemy, David saw an opportunity for God to show His power.</p>

          <p><strong>The Victory:</strong> With just a sling, a stone, and unwavering faith in God, David defeated the mighty giant! The stone struck Goliath in the forehead, and he fell to the ground.</p>
        </div>

        <div class="lesson-points">
          <h4>🌟 What We Learn:</h4>
          <ul>
            <li><strong>God is always with us</strong> - Even when we face scary situations</li>
            <li><strong>Faith over fear</strong> - We can be brave when we trust in God</li>
            <li><strong>Size doesn't matter</strong> - God's power is greater than any problem</li>
            <li><strong>Stand up for what's right</strong> - David defended God's honor</li>
          </ul>
        </div>

        <div class="memory-verse">
          <h4>📖 Memory Verse:</h4>
          <blockquote>"The Lord your God will be with you wherever you go." - Joshua 1:9</blockquote>
        </div>
      </div>
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
    age_range: "5-12",
    rewards: { screen_time: 25, points: 80 },
    objectives: [
      "Learn about showing kindness to others",
      "Understand what it means to be a good neighbor",
      "Practice compassion in daily life"
    ],
    activities: [
      { type: "story", title: "Interactive Story", duration: 6 },
      { type: "discussion", title: "Talk About It", duration: 4 },
      { type: "activity", title: "Kindness Challenge", duration: 2 }
    ],
    content: `
      <div class="lesson-content">
        <h3>❤️ The Good Samaritan</h3>
        <div class="story-section">
          <p><strong>Jesus Tells a Story:</strong> One day, someone asked Jesus, "Who is my neighbor?" Instead of giving a simple answer, Jesus told an amazing story that would change how we think about helping others.</p>

          <p><strong>The Journey:</strong> A man was traveling from Jerusalem to Jericho when robbers attacked him. They took his money, hurt him badly, and left him on the side of the road.</p>

          <p><strong>Those Who Passed By:</strong> First, a priest came along. He saw the hurt man but crossed to the other side of the road. Then a Levite (a temple helper) did the same thing. Both were too busy or afraid to help.</p>

          <p><strong>The Hero:</strong> Finally, a Samaritan man came by. Even though Samaritans and Jews didn't usually get along, this man's heart was filled with compassion. He stopped, bandaged the man's wounds, put him on his donkey, and took him to an inn to recover.</p>

          <p><strong>Going the Extra Mile:</strong> The Samaritan even paid the innkeeper and promised to cover any extra costs when he returned!</p>
        </div>

        <div class="lesson-points">
          <h4>🌟 What We Learn:</h4>
          <ul>
            <li><strong>Everyone is our neighbor</strong> - Even people who are different from us</li>
            <li><strong>Actions speak louder than words</strong> - The Samaritan showed love through helping</li>
            <li><strong>Kindness costs something</strong> - Real love requires sacrifice</li>
            <li><strong>Don't make excuses</strong> - We can always find ways to help</li>
          </ul>
        </div>

        <div class="memory-verse">
          <h4>📖 Memory Verse:</h4>
          <blockquote>"Love your neighbor as yourself." - Mark 12:31</blockquote>
        </div>

        <div class="application">
          <h4>🎯 This Week's Challenge:</h4>
          <p>Look for three ways to be a "Good Samaritan" in your daily life. It could be helping a classmate, being kind to a sibling, or helping with chores without being asked!</p>
        </div>
      </div>
    `,
  },
  {
    id: 3,
    title: "Daniel in the Lion's Den",
    description: "Learn about staying faithful to God even when it's difficult.",
    category: "Bible Stories",
    difficulty: "intermediate" as const,
    estimated_time: 18,
    scripture_reference: "Daniel 6",
    age_range: "8-14",
    rewards: { screen_time: 35, points: 120 },
    objectives: [
      "Understand the importance of staying faithful to God",
      "Learn about the consequences of jealousy",
      "See how God protects those who trust Him"
    ],
    activities: [
      { type: "video", title: "Daniel's Story", duration: 7 },
      { type: "quiz", title: "Comprehension Check", duration: 5 },
      { type: "prayer", title: "Prayer Time", duration: 6 }
    ],
    content: `
      <div class="lesson-content">
        <h3>🦁 Daniel in the Lion's Den</h3>
        <div class="story-section">
          <p><strong>A Faithful Man:</strong> Daniel was a man who loved God deeply. Even though he lived in Babylon, far from his homeland, he prayed to God three times every day by his window that faced Jerusalem.</p>

          <p><strong>The Trap:</strong> Some jealous officials noticed Daniel's faithfulness and came up with an evil plan. They convinced King Darius to make a law that for 30 days, people could only pray to the king. Anyone who prayed to another god would be thrown into the lion's den!</p>

          <p><strong>Daniel's Choice:</strong> When Daniel heard about the new law, he had a choice to make. He could hide his prayers, stop praying, or continue as usual. What did he do? He went home, opened his windows, and prayed to God just like always!</p>

          <p><strong>The Consequence:</strong> The officials caught Daniel praying and reported him to the king. King Darius was very sad because he liked Daniel, but he had to keep his word. Daniel was thrown into the den of hungry lions.</p>

          <p><strong>God's Protection:</strong> That night, God sent an angel to shut the lions' mouths! When the king came in the morning, Daniel was completely safe. God had protected His faithful servant!</p>
        </div>

        <div class="lesson-points">
          <h4>🌟 What We Learn:</h4>
          <ul>
            <li><strong>Stay faithful no matter what</strong> - Daniel didn't compromise his beliefs</li>
            <li><strong>God sees our faithfulness</strong> - He rewards those who trust Him</li>
            <li><strong>Prayer is powerful</strong> - It connects us with God's strength</li>
            <li><strong>God protects His people</strong> - Even in dangerous situations</li>
          </ul>
        </div>

        <div class="memory-verse">
          <h4>📖 Memory Verse:</h4>
          <blockquote>"My God sent his angel, and he shut the mouths of the lions." - Daniel 6:22</blockquote>
        </div>
      </div>
    `,
  }
];

// Chat interface types
interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  message: string;
  timestamp: Date;
  type?: "suggestion" | "question" | "guidance";
}

// Initial AI messages for lesson guidance
const initialChatMessages: ChatMessage[] = [
  {
    id: "1",
    sender: "ai",
    message: "👋 Hello! I'm your Kingdom Kids AI assistant. I'm here to help you guide your children through their faith journey. How can I assist you today?",
    timestamp: new Date(),
    type: "guidance"
  },
  {
    id: "2",
    sender: "ai",
    message: "💡 **Quick Tips:**\n• Assign age-appropriate lessons\n• Review lesson objectives before assigning\n• Use rewards to motivate completion\n• Discuss lessons together as a family",
    timestamp: new Date(),
    type: "suggestion"
  }
];

// Add custom styles for lesson content
const lessonStyles = `
  .lesson-content-styled h3 {
    color: #1f2937;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lesson-content-styled .story-section p {
    margin-bottom: 1rem;
    line-height: 1.7;
  }

  .lesson-content-styled .lesson-points ul {
    list-style: none;
    padding: 0;
  }

  .lesson-content-styled .lesson-points li {
    margin-bottom: 0.75rem;
    padding-left: 1.5rem;
    position: relative;
  }

  .lesson-content-styled .lesson-points li::before {
    content: "✨";
    position: absolute;
    left: 0;
    top: 0;
  }

  .lesson-content-styled .memory-verse {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    padding: 1.5rem;
    border-radius: 0.75rem;
    border-left: 4px solid #f59e0b;
  }

  .lesson-content-styled .memory-verse blockquote {
    font-style: italic;
    font-size: 1.1rem;
    margin: 0;
    color: #92400e;
  }

  .lesson-content-styled .application {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    padding: 1.5rem;
    border-radius: 0.75rem;
    border-left: 4px solid #3b82f6;
  }
`;

export default function LessonsSimple() {
  const { user } = useAuth();
  const isChild = user?.role === "child";
  const Layout = isChild ? ChildLayout : ParentLayout;

  // Sample children data for parents
  const sampleChildren = [
    { id: 1, name: "Emma", age: 8, avatar: "👧" },
    { id: 2, name: "Noah", age: 10, avatar: "👦" },
    { id: 3, name: "Sophia", age: 6, avatar: "👧" }
  ];

  const [selectedLesson, setSelectedLesson] = useState<typeof sampleLessons[0] | null>(null);
  const [completedLessons, setCompletedLessons] = useState<number[]>([1]); // Sample: lesson 1 completed
  const [assignedLessons, setAssignedLessons] = useState<{[key: number]: number[]}>({
    1: [1, 2], // Emma has lessons 1 and 2 assigned
    2: [1], // Noah has lesson 1 assigned
    3: [1] // Sophia has lesson 1 assigned
  });
  const [selectedChildren, setSelectedChildren] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [lessonToAssign, setLessonToAssign] = useState<number | null>(null);

  // Chat interface state (for parents only)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleStartLesson = (lesson: typeof sampleLessons[0]) => {
    setSelectedLesson(lesson);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      setCompletedLessons(prev => [...prev, selectedLesson.id]);
      setSelectedLesson(null);
    }
  };

  const handleAssignLesson = (lessonId: number) => {
    setLessonToAssign(lessonId);
    setShowAssignModal(true);
  };

  const confirmAssignment = () => {
    if (lessonToAssign && selectedChildren.length > 0) {
      setAssignedLessons(prev => {
        const updated = { ...prev };
        selectedChildren.forEach(childId => {
          if (!updated[childId]) updated[childId] = [];
          if (!updated[childId].includes(lessonToAssign)) {
            updated[childId].push(lessonToAssign);
          }
        });
        return updated;
      });
      setShowAssignModal(false);
      setSelectedChildren([]);
      setLessonToAssign(null);
    }
  };

  const isCompleted = (lessonId: number) => completedLessons.includes(lessonId);
  const isAssigned = (lessonId: number, childId: number) => assignedLessons[childId]?.includes(lessonId) || false;
  const getAssignedChildrenCount = (lessonId: number) => {
    return Object.values(assignedLessons).filter(lessons => lessons.includes(lessonId)).length;
  };

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      message: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsAiTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse = generateAIResponse(chatInput);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        message: aiResponse,
        timestamp: new Date(),
        type: "guidance"
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setIsAiTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes("assign") || input.includes("lesson")) {
      return "🎯 **Lesson Assignment Tips:**\n\n• Consider your child's age and reading level\n• Start with beginner lessons for younger children\n• Review the lesson objectives to ensure they align with your goals\n• Set up rewards to motivate completion\n\nWould you like me to suggest specific lessons for any of your children?";
    }

    if (input.includes("reward") || input.includes("motivation")) {
      return "🏆 **Motivation Strategies:**\n\n• Use screen time rewards for lesson completion\n• Create a family lesson completion chart\n• Celebrate milestones with special activities\n• Discuss lessons together at dinner\n\nRemember: Intrinsic motivation grows when children see the value in what they're learning!";
    }

    if (input.includes("age") || input.includes("appropriate")) {
      return "👶 **Age-Appropriate Guidelines:**\n\n• **Ages 4-6:** Focus on simple stories with pictures\n• **Ages 7-9:** Interactive lessons with activities\n• **Ages 10-12:** Deeper discussions and applications\n• **Ages 13+:** Complex themes and real-world connections\n\nEach lesson shows the recommended age range to help you choose wisely.";
    }

    if (input.includes("help") || input.includes("how")) {
      return "🤝 **I'm here to help with:**\n\n• Choosing age-appropriate lessons\n• Setting up reward systems\n• Creating family discussion questions\n• Troubleshooting engagement issues\n• Biblical parenting guidance\n\nWhat specific area would you like assistance with?";
    }

    return "✨ That's a great question! As your Kingdom Kids AI assistant, I'm here to help you nurture your children's faith journey. \n\nI can help with lesson selection, age-appropriate content, motivation strategies, and creating meaningful family discussions around biblical lessons. \n\nWhat specific aspect of your children's spiritual education would you like to explore?";
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Render different versions for parents and children
  if (isChild) {
    return (
      <Layout title="Bible Lessons">
        <style dangerouslySetInnerHTML={{ __html: lessonStyles }} />
        <div className="h-full flex flex-col max-w-6xl mx-auto overflow-hidden">
          {/* Simple Child Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-900">My Bible Adventures! 📖</h1>
                <p className="text-blue-600 text-sm">Learn amazing stories about God's love</p>
              </div>
            </div>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <Star className="w-3 h-3 mr-1" />
              {completedLessons.length} Completed!
            </Badge>
          </div>

          {/* Child Content Area */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Simplified Lessons List for Children */}
            <Card className="w-96 flex-shrink-0 flex flex-col min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  My Lessons ({sampleLessons.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {sampleLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="group p-4 border-2 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer bg-white"
                      onClick={() => handleStartLesson(lesson)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                          <BookOpen className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-700">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-blue-600 font-medium">{lesson.scripture_reference}</p>
                        </div>
                        {isCompleted(lesson.id) && (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">Done!</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                        {lesson.description}
                      </p>

                      {/* Child-friendly stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-gray-600">{lesson.estimated_time} min</span>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            {lesson.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600 font-medium">{lesson.rewards.points}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Gift className="h-4 w-4 text-purple-500" />
                            <span className="text-purple-600 font-medium">+{lesson.rewards.screen_time}min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Child Lesson Viewer */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  {selectedLesson ? "Reading Time! 📚" : "Pick a Story! 🌟"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                {selectedLesson ? (
                  <div className="space-y-6">
                    {/* Child-friendly lesson header */}
                    <div className="text-center border-b pb-6">
                      <h2 className="text-4xl font-bold text-gray-800 mb-3">
                        {selectedLesson.title}
                      </h2>
                      <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-800 font-medium">{selectedLesson.scripture_reference}</span>
                      </div>
                    </div>

                    {/* Lesson content with child-friendly styling */}
                    <div className="prose prose-lg max-w-none">
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                        className="lesson-content-styled text-lg leading-relaxed"
                      />
                    </div>

                    {/* Big completion button */}
                    <div className="text-center pt-6">
                      <Button
                        onClick={handleCompleteLesson}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 text-lg rounded-2xl shadow-lg"
                        size="lg"
                      >
                        <CheckCircle2 className="h-6 w-6 mr-3" />
                        I Finished This Lesson! 🎉
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-8 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
                      <BookOpen className="h-16 w-16 text-purple-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-700 mb-4">
                      Ready for an Adventure? 🚀
                    </h3>
                    <p className="text-gray-500 text-xl max-w-md leading-relaxed">
                      Pick a Bible story from the list to start learning about God's amazing love!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Parent version with AI chat
  return (
    <Layout title="Bible Lessons">
      <style dangerouslySetInnerHTML={{ __html: lessonStyles }} />
      <div className="h-full flex flex-col max-w-7xl mx-auto overflow-hidden">
        {/* Simple Parent Header */}
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-900">Bible Lessons</h1>
            <p className="text-purple-600 text-sm">Manage your children's faith journey</p>
          </div>
        </div>

        {/* Parent Content Area with Chat */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Lessons List */}
          <Card className="w-80 flex-shrink-0 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle>Available Lessons ({sampleLessons.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {sampleLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="group border rounded-xl hover:border-purple-300 hover:shadow-lg transition-all bg-white overflow-hidden"
                  >
                    {/* Lesson Header */}
                    <div className="p-4 cursor-pointer" onClick={() => handleStartLesson(lesson)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <BookOpen className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 group-hover:text-purple-700 text-lg">
                              {lesson.title}
                            </h3>
                            <p className="text-sm text-blue-600 font-medium">{lesson.scripture_reference}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted(lesson.id) && (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          )}
                          {!isChild && getAssignedChildrenCount(lesson.id) > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              <Users className="h-3 w-3 mr-1" />
                              {getAssignedChildrenCount(lesson.id)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {lesson.description}
                      </p>

                      {/* Lesson Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">{lesson.estimated_time} minutes</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Ages {lesson.age_range}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Gift className="h-4 w-4 text-yellow-500" />
                            <span className="text-gray-600">+{lesson.rewards.screen_time}min screen time</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-gray-600">{lesson.rewards.points} points</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className={
                          lesson.difficulty === 'beginner' ? 'bg-green-50 text-green-700 border-green-200' :
                          lesson.difficulty === 'intermediate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }>
                          {lesson.difficulty}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {lesson.category}
                        </Badge>
                      </div>

                      {/* Activities Preview */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Activities:</h4>
                        <div className="flex gap-2">
                          {lesson.activities.map((activity, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {activity.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Parent Controls */}
                    {!isChild && (
                      <div className="border-t bg-gray-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Assigned to {getAssignedChildrenCount(lesson.id)} child{getAssignedChildrenCount(lesson.id) !== 1 ? 'ren' : ''}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignLesson(lesson.id);
                            }}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Assign to Children
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Lesson Viewer */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lesson Viewer
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {selectedLesson ? (
                <div className="space-y-6">
                  {/* Lesson Header */}
                  <div className="border-b pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">
                          {selectedLesson.title}
                        </h2>
                        <p className="text-blue-600 font-medium text-lg">
                          {selectedLesson.scripture_reference}
                        </p>
                      </div>
                      <Button
                        onClick={handleCompleteLesson}
                        className="bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Complete Lesson
                      </Button>
                    </div>

                    {/* Lesson Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-blue-800">{selectedLesson.estimated_time} min</div>
                        <div className="text-xs text-blue-600">Duration</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <Target className="h-5 w-5 text-green-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-green-800">{selectedLesson.objectives.length}</div>
                        <div className="text-xs text-green-600">Objectives</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <Star className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-yellow-800">{selectedLesson.rewards.points}</div>
                        <div className="text-xs text-yellow-600">Points</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <Gift className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-purple-800">+{selectedLesson.rewards.screen_time}min</div>
                        <div className="text-xs text-purple-600">Screen Time</div>
                      </div>
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Learning Objectives
                    </h3>
                    <ul className="space-y-2">
                      {selectedLesson.objectives.map((objective, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-blue-700">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-500" />
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Activities Overview */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Activities ({selectedLesson.activities.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedLesson.activities.map((activity, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-green-700 font-medium">{activity.title}</span>
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Clock className="h-3 w-3" />
                            {activity.duration} min
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lesson Content */}
                  <div className="prose prose-lg max-w-none">
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                      className="lesson-content-styled"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-6 bg-purple-100 rounded-full mb-6">
                    <BookOpen className="h-12 w-12 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                    Select a Lesson to Begin
                  </h3>
                  <p className="text-gray-500 text-lg max-w-md">
                    Choose a lesson from the list to start your faith journey. Each lesson includes interactive activities, videos, and reflection time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Chat Assistant */}
          <Card className="w-80 flex-shrink-0 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                AI Parenting Assistant
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="ml-auto"
                >
                  {isChatOpen ? "Hide" : "Show"}
                </Button>
              </CardTitle>
            </CardHeader>
            {isChatOpen && (
              <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.sender === "user"
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {message.sender === "ai" && (
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-blue-600">Kingdom Kids AI</span>
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">Kingdom Kids AI is typing...</span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about lesson guidance..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isAiTyping}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick suggestion buttons */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setChatInput("How do I choose age-appropriate lessons?")}
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Age Guide
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setChatInput("What rewards work best for motivation?")}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Rewards
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Assign Lesson to Children</h3>

              <div className="space-y-3 mb-6">
                {sampleChildren.map((child) => (
                  <div key={child.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`child-${child.id}`}
                      checked={selectedChildren.includes(child.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedChildren(prev => [...prev, child.id]);
                        } else {
                          setSelectedChildren(prev => prev.filter(id => id !== child.id));
                        }
                      }}
                    />
                    <label htmlFor={`child-${child.id}`} className="flex items-center gap-2 cursor-pointer">
                      <span className="text-2xl">{child.avatar}</span>
                      <div>
                        <div className="font-medium">{child.name}</div>
                        <div className="text-sm text-gray-500">Age {child.age}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedChildren([]);
                    setLessonToAssign(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAssignment}
                  disabled={selectedChildren.length === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Assign Lesson
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Chat Toggle for Mobile */}
        {!isChild && (
          <Button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg lg:hidden z-40"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>
    </Layout>
  );
}
