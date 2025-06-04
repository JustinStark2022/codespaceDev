// src/controllers/bible.controller.ts
import { Request, Response } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.BIBLE_API_KEY!;
const BASE_URL = "https://api.scripture.api.bible/v1";
const headers = { "api-key": API_KEY };

// Get all English Bible versions
export const getBibles = async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${BASE_URL}/bibles?language=eng`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    
    // Filter for popular English versions
    const preferredBibleIds = [
      "de4e12af7f28f599-02", // NIrV
      "fae1f5d81de52cbe-01", // NLT  
      "06125adad2d5898a-01", // ERV
      "9879dbb7cfe39e4d-01", // NIV
      "1d07b894f3e8f5f4-01", // CSB
      "f72b840c855f362c-04", // ESV
      "61fd76eafa1577c2-01", // NASB
    ];
    
    const bibles = json.data
      .filter((b: any) => preferredBibleIds.includes(b.id))
      .map((b: any) => ({
        id: b.id,
        abbreviation: b.abbreviation,
        name: b.name,
        description: b.description,
        language: b.language
      }));
      
    res.json({ data: bibles });
  } catch (err) {
    console.error("Bible API Error:", err);
    res.status(500).json({ message: "Failed to fetch Bibles", error: err });
  }
};

// Get books in a Bible
export const getBooks = async (req: Request, res: Response) => {
  const { bibleId } = req.params;
  if (!bibleId) return res.status(400).json({ message: "Missing Bible ID" });

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/books`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    
    const books = json.data.map((b: any) => ({
      id: b.id,
      bibleId: b.bibleId,
      abbreviation: b.abbreviation,
      name: b.name,
      nameLong: b.nameLong,
    }));
    
    res.json({ data: books });
  } catch (err) {
    console.error("Books API Error:", err);
    res.status(500).json({ message: "Failed to fetch books", error: err });
  }
};

// Get chapters in a book
export const getChapters = async (req: Request, res: Response) => {
  const { bibleId, bookId } = req.params;
  if (!bibleId || !bookId) {
    return res.status(400).json({ message: "Missing Bible ID or Book ID" });
  }

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/books/${bookId}/chapters`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    
    const chapters = json.data.map((c: any) => ({ 
      id: c.id, 
      bibleId: c.bibleId,
      bookId: c.bookId,
      number: c.number,
      reference: c.reference
    }));
    
    res.json({ data: chapters });
  } catch (err) {
    console.error("Chapters API Error:", err);
    res.status(500).json({ message: "Failed to fetch chapters", error: err });
  }
};

// Get a chapter's content
export const getChapterContent = async (req: Request, res: Response) => {
  const { bibleId, chapterId } = req.params;
  const contentType = req.query["content-type"] || "html";
  
  if (!bibleId || !chapterId) {
    return res.status(400).json({ message: "Missing Bible ID or Chapter ID" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/chapters/${chapterId}?content-type=${contentType}&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`, 
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    res.json(json.data);
  } catch (err) {
    console.error("Chapter Content API Error:", err);
    res.status(500).json({ message: "Failed to fetch chapter content", error: err });
  }
};

// Get verses in a chapter
export const getVerses = async (req: Request, res: Response) => {
  const { bibleId, chapterId } = req.params;
  if (!bibleId || !chapterId) {
    return res.status(400).json({ message: "Missing Bible ID or Chapter ID" });
  }

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/chapters/${chapterId}/verses`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    
    const verses = json.data.map((v: any) => ({
      id: v.id,
      orgId: v.orgId,
      bibleId: v.bibleId,
      bookId: v.bookId,
      chapterId: v.chapterId,
      reference: v.reference
    }));
    
    res.json({ data: verses });
  } catch (err) {
    console.error("Verses API Error:", err);
    res.status(500).json({ message: "Failed to fetch verses list", error: err });
  }
};

// Get a single verse
export const getVerse = async (req: Request, res: Response) => {
  const { bibleId, verseId } = req.params;
  const contentType = req.query["content-type"] || "html";
  
  if (!bibleId || !verseId) {
    return res.status(400).json({ message: "Missing Bible ID or Verse ID" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/verses/${verseId}?content-type=${contentType}&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`, 
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    res.json(json.data);
  } catch (err) {
    console.error("Verse API Error:", err);
    res.status(500).json({ message: "Failed to fetch verse", error: err });
  }
};

// Get a full passage (e.g., GEN.1 or GEN.1.1-5)
export const getBiblePassage = async (req: Request, res: Response) => {
  const { bibleId, passageId } = req.params;
  const contentType = req.query["content-type"] || "html";

  if (!bibleId || !passageId) {
    return res.status(400).json({ error: "Missing bibleId or passageId" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/passages/${passageId}?content-type=${contentType}&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false&parallel-passages=false`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    res.json(json);
  } catch (err) {
    console.error("Passage API Error:", err);
    res.status(500).json({ error: "Failed to fetch passage", details: err });
  }
};

// Search Bible text
export const searchBible = async (req: Request, res: Response) => {
  const { bibleId } = req.params;
  const { query, limit = 10, offset = 0 } = req.query;

  if (!bibleId || !query) {
    return res.status(400).json({ error: "Missing bibleId or search query" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/search?query=${encodeURIComponent(query as string)}&limit=${limit}&offset=${offset}&sort=relevance&range=`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    res.json(json);
  } catch (err) {
    console.error("Search API Error:", err);
    res.status(500).json({ error: "Failed to search Bible", details: err });
  }
};
