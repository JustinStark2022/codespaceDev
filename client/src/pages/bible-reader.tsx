import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import ParentLayout from "@/components/layout/parent-layout";
import ChildLayout from "@/components/layout/child-layout";
import { Card, CardContent } from "@/components/ui/card";
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
  Bookmark,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { allBooks } from "@/lib/booklist";

interface Bible {
  id: string;
  abbreviation: string;
  name: string;
  description: string;
  language: any;
}

interface ApiBook {
  id: string; // API.Bible bookId
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

interface ApiChapter {
  id: string; // API.Bible chapterId
  bibleId: string;
  bookId: string;
  number: string; // "1"
  reference: string; // "Genesis 1"
}

interface ApiVerse {
  id: string;
  orgId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

interface ScriptureContent {
  id: string;
  bibleId: string;
  bookId?: string;
  reference: string;
  content: string;
}

export default function BibleReader() {
  const { user } = useAuth();
  const isChild = user?.role === "child";
  const Layout = isChild ? ChildLayout : ParentLayout;

  const [selectedBible, setSelectedBible] = useState<string>("");

  // ✅ Book selection
  const [selectedBookId, setSelectedBookId] = useState<string>(""); // API bookId
  const [selectedBookName, setSelectedBookName] = useState<string>(""); // for matching local list

  // ✅ Chapter selection uses a NUMBER dropdown (1..N), and we map to chapterId
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(""); // API chapterId

  // Verse selection stays API verseId
  const [selectedVerseId, setSelectedVerseId] = useState<string>(""); // empty = entire chapter

  const [fontSize, setFontSize] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- helpers ---
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const bookMeta = useMemo(() => {
    if (!selectedBookName) return null;
    // Match local list by name (loose match for safety)
    const exact = allBooks.find((b) => b.name.toLowerCase() === selectedBookName.toLowerCase());
    if (exact) return exact;

    // fallback: some APIs might return “Psalms” vs “Psalm”
    const normalized = selectedBookName.toLowerCase().replace(/\s+/g, " ").trim();
    return allBooks.find((b) => b.name.toLowerCase().includes(normalized) || normalized.includes(b.name.toLowerCase())) || null;
  }, [selectedBookName]);

  // -------------------------
  // Queries
  // -------------------------

  const { data: bibles = [] } = useQuery<Bible[]>({
    queryKey: ["bibles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bible/bibles");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: books = [] } = useQuery<ApiBook[]>({
    queryKey: ["books", selectedBible],
    enabled: !!selectedBible,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible/bibles/${selectedBible}/books`);
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: apiChapters = [] } = useQuery<ApiChapter[]>({
    queryKey: ["chapters", selectedBible, selectedBookId],
    enabled: !!selectedBible && !!selectedBookId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/bible/bibles/${selectedBible}/books/${selectedBookId}/chapters`
      );
      const json = await res.json();
      // API.Bible returns a few non-number "intro" chapter entries sometimes — filter to numeric only
      const list: ApiChapter[] = (json.data || []).filter((c: any) => /^\d+$/.test(String(c.number)));
      return list;
    },
  });

  const { data: verses = [] } = useQuery<ApiVerse[]>({
    queryKey: ["verses", selectedBible, selectedChapterId],
    enabled: !!selectedBible && !!selectedChapterId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/bible/bibles/${selectedBible}/chapters/${selectedChapterId}/verses`
      );
      const json = await res.json();
      return json.data || [];
    },
  });

  // Entire chapter content
  const { data: chapterContent, isLoading: chapterLoading } = useQuery<ScriptureContent>({
    queryKey: ["chapterContent", selectedBible, selectedChapterId],
    enabled: !!selectedBible && !!selectedChapterId && !selectedVerseId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/bible/bibles/${selectedBible}/chapters/${selectedChapterId}?content-type=html`
      );
      return res.json();
    },
  });

  // Single verse content
  const { data: verseContent, isLoading: verseLoading } = useQuery<ScriptureContent>({
    queryKey: ["verseContent", selectedBible, selectedVerseId],
    enabled: !!selectedBible && !!selectedVerseId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/bible/bibles/${selectedBible}/verses/${selectedVerseId}?content-type=html`
      );
      return res.json();
    },
  });

  const activeContent = useMemo(() => (selectedVerseId ? verseContent : chapterContent), [
    selectedVerseId,
    verseContent,
    chapterContent,
  ]);

  const isLoadingContent = chapterLoading || verseLoading;

  // -------------------------
  // Reset logic
  // -------------------------

  useEffect(() => {
    setSelectedBookId("");
    setSelectedBookName("");
    setSelectedChapterId("");
    setSelectedChapterNumber(null);
    setSelectedVerseId("");
  }, [selectedBible]);

  useEffect(() => {
    setSelectedChapterId("");
    setSelectedChapterNumber(null);
    setSelectedVerseId("");
  }, [selectedBookId]);

  useEffect(() => {
    setSelectedVerseId("");
  }, [selectedChapterId]);

  useEffect(() => {
    if (!selectedBible && bibles.length > 0) setSelectedBible(bibles[0].id);
  }, [bibles, selectedBible]);

  // -------------------------
  // Chapter number -> chapterId mapping
  // -------------------------

  useEffect(() => {
    if (!selectedChapterNumber) {
      setSelectedChapterId("");
      return;
    }

    const match = apiChapters.find((c) => Number(c.number) === selectedChapterNumber);
    setSelectedChapterId(match?.id || "");
  }, [selectedChapterNumber, apiChapters]);

  // -------------------------
  // TTS
  // -------------------------

  const playTTS = () => {
    if (!activeContent?.content) return;

    const utterance = new SpeechSynthesisUtterance(stripHtml(activeContent.content));
    utterance.rate = 0.9;
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

  // -------------------------
  // Chapter nav (prev/next) using local count
  // -------------------------

  const maxChapters = bookMeta?.chapters ?? apiChapters.length ?? 0;

  const goToPreviousChapter = () => {
    if (!selectedChapterNumber) return;
    if (selectedChapterNumber <= 1) return;
    setSelectedChapterNumber(selectedChapterNumber - 1);
  };

  const goToNextChapter = () => {
    if (!selectedChapterNumber) return;
    if (maxChapters && selectedChapterNumber >= maxChapters) return;
    setSelectedChapterNumber(selectedChapterNumber + 1);
  };

  const currentBibleAbbr = bibles.find((b) => b.id === selectedBible)?.abbreviation || "Bible";

  return (
    <Layout title="My Faith Fortress Bible Reader">
      <div className="h-full flex flex-col max-w-6xl mx-auto overflow-hidden">
        <Card className="bg-white border-gray-200 flex-shrink-0">
          <CardContent className="py-2 px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {/* Version */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Version</label>
                <Select value={selectedBible} onValueChange={setSelectedBible}>
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
                    <SelectValue placeholder="Select Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {bibles.map((bible) => (
                      <SelectItem key={bible.id} value={bible.id}>
                        <span className="font-medium text-sm">{bible.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Book */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Book</label>
                <Select
                  value={selectedBookId}
                  onValueChange={(bookId) => {
                    setSelectedBookId(bookId);
                    const found = books.find((b) => b.id === bookId);
                    setSelectedBookName(found?.name || "");
                  }}
                  disabled={!selectedBible || books.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
                    <SelectValue placeholder={!selectedBible ? "Select Version First" : "Select Book"} />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter number 1..N */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Chapter</label>
                <Select
                  value={selectedChapterNumber ? String(selectedChapterNumber) : ""}
                  onValueChange={(val) => setSelectedChapterNumber(Number(val))}
                  disabled={!selectedBookId || (!bookMeta && apiChapters.length === 0)}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
                    <SelectValue placeholder={!selectedBookId ? "Select Book First" : "Select Chapter"} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxChapters || 0 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Chapter {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bookMeta && (
                  <p className="text-[10px] text-gray-500">Chapters in {bookMeta.name}: {bookMeta.chapters}</p>
                )}
              </div>

              {/* Verse */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Verse</label>
                <Select
                  value={selectedVerseId || "all"}
                  onValueChange={(val) => setSelectedVerseId(val === "all" ? "" : val)}
                  disabled={!selectedChapterId || verses.length === 0}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-sm">
                    <SelectValue placeholder={!selectedChapterId ? "Select Chapter First" : "Entire Chapter"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire Chapter</SelectItem>
                    {verses.map((verse) => (
                      <SelectItem key={verse.id} value={verse.id}>
                        {verse.reference}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedChapterId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={isPlaying ? stopTTS : playTTS}
                    disabled={!activeContent}
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
                      disabled={!selectedChapterNumber || selectedChapterNumber <= 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextChapter}
                      disabled={!selectedChapterNumber || (!!maxChapters && selectedChapterNumber >= maxChapters)}
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

        <Card className="flex-1 flex flex-col min-h-0 mt-3">
          <CardContent className="p-6 flex-1 overflow-y-auto">
            {!selectedBible ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Welcome to Bible Reader</h3>
                <p className="text-gray-500">Please select a Bible version to begin reading God's Word.</p>
              </div>
            ) : !selectedBookId ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Choose a Book</h3>
                <p className="text-gray-500">Select a book from the Bible to continue reading.</p>
              </div>
            ) : !selectedChapterNumber ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a Chapter</h3>
                <p className="text-gray-500">Choose a chapter from {selectedBookName || "this book"} to read.</p>
              </div>
            ) : isLoadingContent ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Loading Scripture</h3>
                <p className="text-gray-500">Please wait while we prepare God's Word for you...</p>
              </div>
            ) : activeContent ? (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">{activeContent.reference}</h1>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium text-xs">
                      {currentBibleAbbr}
                    </span>
                    <span>{selectedVerseId ? "Single verse" : `${verses.length} verses`}</span>
                  </div>
                </div>

                <div
                  className="prose prose-lg max-w-none leading-relaxed text-gray-800 mb-8"
                  style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}
                  dangerouslySetInnerHTML={{ __html: activeContent.content }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Content Not Available</h3>
                <p className="text-gray-500">This scripture content is unavailable. Please try another selection.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}