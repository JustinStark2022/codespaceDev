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
    <Layout title="My Faith Fortress Bible Reader">
      <div className="h-full flex flex-col max-w-6xl mx-auto overflow-hidden">
        {/* Page Header with Favorite and Share */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
        </div>

        {/* Compact Navigation Controls */}
        <Card className="bg-white border-gray-200 flex-shrink-0">
          <CardContent className="py-2 px-4">
            {/* Bible Navigation - Very Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Version</label>
                <Select value={selectedBible} onValueChange={setSelectedBible}>
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
                    <SelectValue placeholder="Select Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {bibles.map((bible: Bible) => (
                      <SelectItem key={bible.id} value={bible.id}>
                        <span className="font-medium text-sm">{bible.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Book</label>
                <Select 
                  value={selectedBook} 
                  onValueChange={setSelectedBook}
                  disabled={!selectedBible || books.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
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

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Chapter</label>
                <Select 
                  value={selectedChapter} 
                  onValueChange={setSelectedChapter}
                  disabled={!selectedBook || chapters.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
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

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Verse</label>
                <Select 
                  value={selectedVerse || "all"} 
                  onValueChange={(val) => setSelectedVerse(val === "all" ? "" : val)}
                  disabled={!selectedChapter || verses.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
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

            {/* Controls - Super Compact */}
            {selectedChapter && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={isPlaying ? stopTTS : playTTS} 
                    disabled={!chapterContent}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs px-3"
                    size="sm"
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-3 h-3 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={goToPreviousChapter}
                      disabled={getCurrentChapterIndex() <= 0}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={goToNextChapter}
                      disabled={getCurrentChapterIndex() >= chapters.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Settings className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-600">Font:</span>
                    <Select value={fontSize.toString()} onValueChange={(val) => setFontSize(Number(val))}>
                      <SelectTrigger className="w-14 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">14</SelectItem>
                        <SelectItem value="16">16</SelectItem>
                        <SelectItem value="18">18</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                    <Bookmark className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Display - Maximum Space */}
        <Card className="flex-1 flex flex-col min-h-0 mt-3">
          <CardContent className="p-6 flex-1 overflow-y-auto">
            {!selectedBible ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Welcome to Bible Reader</h3>
                <p className="text-gray-500">Please select a Bible version to begin reading God's Word.</p>
              </div>
            ) : !selectedBook ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Choose a Book</h3>
                <p className="text-gray-500">Select a book from the Bible to continue reading.</p>
              </div>
            ) : !selectedChapter ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a Chapter</h3>
                <p className="text-gray-500">Choose a chapter from {getSelectedBookName()} to read.</p>
              </div>
            ) : contentLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Loading Scripture</h3>
                <p className="text-gray-500">Please wait while we prepare God's Word for you...</p>
              </div>
            ) : chapterContent ? (
              <div className="max-w-4xl mx-auto">
                {/* Chapter Header - Compact */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    {chapterContent.reference}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium text-xs">
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

                {/* Scripture Content - Main Focus */}
                <div 
                  className="prose prose-lg max-w-none leading-relaxed text-gray-800 mb-8"
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: chapterContent.content }}
                />

                {/* Chapter Navigation Footer - Compact */}
                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <Button 
                    variant="outline"
                    onClick={goToPreviousChapter}
                    disabled={getCurrentChapterIndex() <= 0}
                    className="flex items-center gap-2 h-8"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Chapter {chapters.find((ch: Chapter) => ch.id === selectedChapter)?.number} of {chapters.length}
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline"
                    onClick={goToNextChapter}
                    disabled={getCurrentChapterIndex() >= chapters.length - 1}
                    className="flex items-center gap-2 h-8"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Content Not Available</h3>
                <p className="text-gray-500">This chapter content is currently unavailable. Please try another chapter.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
