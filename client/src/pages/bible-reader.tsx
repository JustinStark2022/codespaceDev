import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Heart,
  Share2,
  Bookmark
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Bible {
  id: string;
  abbreviation: string;
  name: string;
  description: string;
  language: any;
}

interface Book {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

interface Chapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

interface Verse {
  id: string;
  orgId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

interface ChapterContent {
  id: string;
  bibleId: string;
  bookId: string;
  reference: string;
  content: string;
}

export default function BibleReader() {
  const { user } = useAuth();
  const isChild = user?.role === "child";
  const Layout = isChild ? ChildLayout : ParentLayout;

  const [selectedBible, setSelectedBible] = useState<string>("");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedVerse, setSelectedVerse] = useState<string>("");
  const [fontSize, setFontSize] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch Bibles
  const { data: bibles = [] } = useQuery<Bible[]>({
    queryKey: ["bibles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bible/bibles");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Books when Bible is selected
  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ["books", selectedBible],
    enabled: !!selectedBible,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible/bibles/${selectedBible}/books`);
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Chapters when Book is selected
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["chapters", selectedBible, selectedBook],
    enabled: !!selectedBible && !!selectedBook,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible/bibles/${selectedBible}/books/${selectedBook}/chapters`);
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Verses when Chapter is selected
  const { data: verses = [] } = useQuery<Verse[]>({
    queryKey: ["verses", selectedBible, selectedChapter],
    enabled: !!selectedBible && !!selectedChapter,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible/bibles/${selectedBible}/chapters/${selectedChapter}/verses`);
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch Chapter Content
  const { data: chapterContent, isLoading: contentLoading } = useQuery<ChapterContent>({
    queryKey: ["chapterContent", selectedBible, selectedChapter],
    enabled: !!selectedBible && !!selectedChapter,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible/bibles/${selectedBible}/chapters/${selectedChapter}?content-type=html`);
      return res.json();
    },
  });

  // Reset dependent selections when parent changes
  useEffect(() => {
    setSelectedBook("");
    setSelectedChapter("");
    setSelectedVerse("");
  }, [selectedBible]);

  useEffect(() => {
    setSelectedChapter("");
    setSelectedVerse("");
  }, [selectedBook]);

  useEffect(() => {
    setSelectedVerse("");
  }, [selectedChapter]);

  // Auto-select first Bible if none selected
  useEffect(() => {
    if (!selectedBible && bibles.length > 0) {
      setSelectedBible(bibles[0].id);
    }
  }, [bibles, selectedBible]);

  const playTTS = () => {
    if (!chapterContent?.content) return;
    
    const utterance = new SpeechSynthesisUtterance(chapterContent.content.replace(/<[^>]*>/g, ''));
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopTTS = () => {
    setIsPlaying(false);
    window.speechSynthesis.cancel();
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex((ch: Chapter) => ch.id === selectedChapter);
  };

  const goToPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      setSelectedChapter(chapters[currentIndex - 1].id);
    }
  };

  const goToNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      setSelectedChapter(chapters[currentIndex + 1].id);
    }
  };

  const getSelectedBookName = () => {
    const book = books.find((b: Book) => b.id === selectedBook);
    return book ? book.name : "";
  };

  return (
    <Layout title="Bible Reader">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card with Navigation */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-900">Bible Reader</h1>
                  <p className="text-blue-600 text-sm">Read and listen to God's Word</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Favorite
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Bible Navigation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Version</label>
                <Select value={selectedBible} onValueChange={setSelectedBible}>
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder="Select Bible Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {bibles.map((bible: Bible) => (
                      <SelectItem key={bible.id} value={bible.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{bible.abbreviation}</span>
                          <span className="text-xs text-gray-500">{bible.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Book</label>
                <Select 
                  value={selectedBook} 
                  onValueChange={setSelectedBook}
                  disabled={!selectedBible || books.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder={!selectedBible ? "Select Version First" : "Select Book"} />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book: Book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Chapter</label>
                <Select 
                  value={selectedChapter} 
                  onValueChange={setSelectedChapter}
                  disabled={!selectedBook || chapters.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder={!selectedBook ? "Select Book First" : "Select Chapter"} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter: Chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        Chapter {chapter.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Verse</label>
                <Select 
                  value={selectedVerse || "all"} 
                  onValueChange={(val) => setSelectedVerse(val === "all" ? "" : val)}
                  disabled={!selectedChapter || verses.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder={!selectedChapter ? "Select Chapter First" : "All Verses"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verses</SelectItem>
                    {verses.map((verse: Verse) => (
                      <SelectItem key={verse.id} value={verse.id}>
                        Verse {verse.reference.split('.').pop()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Controls */}
            {selectedChapter && (
              <div className="flex items-center justify-between pt-4 border-t border-blue-200">
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={isPlaying ? stopTTS : playTTS} 
                    disabled={!chapterContent}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-4 h-4 mr-2" />
                        Stop Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Play Audio
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={goToPreviousChapter}
                      disabled={getCurrentChapterIndex() <= 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={goToNextChapter}
                      disabled={getCurrentChapterIndex() >= chapters.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <label className="text-sm text-gray-600">Font Size:</label>
                    <Select value={fontSize.toString()} onValueChange={(val) => setFontSize(Number(val))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                        <SelectItem value="20">20px</SelectItem>
                        <SelectItem value="24">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Bookmark
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Display */}
        <Card className="min-h-[600px]">
          <CardContent className="p-8">
            {!selectedBible ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Welcome to Bible Reader</h3>
                <p className="text-gray-500">Please select a Bible version to begin reading God's Word.</p>
              </div>
            ) : !selectedBook ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Choose a Book</h3>
                <p className="text-gray-500">Select a book from the Bible to continue reading.</p>
              </div>
            ) : !selectedChapter ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Chapter</h3>
                <p className="text-gray-500">Choose a chapter from {getSelectedBookName()} to read.</p>
              </div>
            ) : contentLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading Scripture</h3>
                <p className="text-gray-500">Please wait while we prepare God's Word for you...</p>
              </div>
            ) : chapterContent ? (
              <div className="max-w-4xl mx-auto">
                {/* Chapter Header */}
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {chapterContent.reference}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {bibles.find((b: Bible) => b.id === selectedBible)?.abbreviation || 'Bible'}
                    </span>
                    <span>{verses.length} verses</span>
                    {isPlaying && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Volume2 className="w-4 h-4" />
                        Audio Playing
                      </span>
                    )}
                  </div>
                </div>

                {/* Scripture Content */}
                <div 
                  className="prose prose-lg max-w-none leading-relaxed text-gray-800"
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: chapterContent.content }}
                />

                {/* Chapter Navigation Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center">
                  <Button 
                    variant="outline"
                    onClick={goToPreviousChapter}
                    disabled={getCurrentChapterIndex() <= 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Chapter
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Chapter {chapters.find((ch: Chapter) => ch.id === selectedChapter)?.number} of {chapters.length}
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline"
                    onClick={goToNextChapter}
                    disabled={getCurrentChapterIndex() >= chapters.length - 1}
                    className="flex items-center gap-2"
                  >
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Content Not Available</h3>
                <p className="text-gray-500">This chapter content is currently unavailable. Please try another chapter.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
