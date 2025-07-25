import { Request, Response } from "express";
import { callLLMWithRetry } from "../utils/llm";
import logger from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export async function generateParentBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { topic, category } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const prompt = `You are a Christian parenting expert and blogger writing for parents who want to raise their children with biblical values while navigating modern challenges.

Create a comprehensive blog post about: "${topic || 'Christian digital parenting in the modern age'}"

Structure your post as follows:

**ENGAGING TITLE**: Create a compelling, SEO-friendly title that speaks to parent concerns

**INTRODUCTION** (2-3 paragraphs):
- Hook readers with a relatable parenting scenario
- Clearly state the challenge or opportunity
- Preview the biblical wisdom and practical solutions you'll share

**MAIN CONTENT** (4-6 sections):
- Biblical foundation with relevant scripture
- Practical strategies parents can implement
- Real-life examples and scenarios
- Age-specific considerations
- Common mistakes to avoid
- Success stories or testimonials

**PRACTICAL TAKEAWAYS**:
- 5-7 actionable steps parents can take immediately
- Resources, tools, or apps that can help
- Questions for family discussion
- Scripture verses for memorization or reflection

**CONCLUSION**:
- Encouragement for parents feeling overwhelmed
- Reminder of God's grace in parenting
- Call to action for implementing these ideas

**DISCUSSION PROMPTS**:
- 3-4 questions to encourage reader engagement and comments

Keep the tone warm, encouraging, and practical. Balance biblical truth with grace. Remember that parents reading this are doing their best and need both guidance and encouragement.

Word count: Aim for 1,200-1,500 words.`;

    const blogPost = await callLLMWithRetry(prompt);

    logger.info('Parent blog post generated', { userId, topic });
    res.json({
      blogPost,
      topic: topic || 'Christian digital parenting',
      category: category || 'Parenting',
      generatedAt: new Date().toISOString(),
      estimatedReadTime: Math.ceil(blogPost.split(' ').length / 200) // Estimate reading time
    });

  } catch (error: any) {
    logger.error('Error generating parent blog post', { error: error.message, userId: req.user?.id });
    res.status(500).json({ 
      error: "Failed to generate blog post",
      message: "Please try again later"
    });
  }
}

export async function generateKidsBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { topic, age, category } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const targetAge = age || 10;

    const prompt = `You are writing for a Christian children's blog, creating content for kids around age ${targetAge}. 

Create an engaging, fun blog post about: "${topic || 'Living like Jesus every day'}"

**FUN TITLE**: Create an exciting title that kids would want to click on (use emojis!)

**HOOK** (1 paragraph):
- Start with an exciting question, story, or "Did you know?" fact
- Make kids curious to keep reading

**MAIN STORY/LESSON** (3-4 short paragraphs):
- Tell a Bible story or Christian lesson in an exciting way
- Use simple words appropriate for age ${targetAge}
- Include dialogue and action to keep it interesting
- Connect to kids' everyday experiences

**INTERACTIVE ELEMENTS**:
- **Fun Facts**: 2-3 interesting facts related to the topic
- **Try This**: A simple activity kids can do
- **Discussion Questions**: 3 questions kids can think about or discuss with family
- **Memory Verse**: An easy-to-remember Bible verse with a fun way to memorize it

**CALL TO ACTION**:
- One specific thing kids can do this week to live out the lesson
- Encourage them to share with friends or family

**CLOSING**:
- Encouraging words about how much God loves them
- Reminder that they can make a difference

Use:
- Short sentences and paragraphs
- Exciting words and kid-friendly language
- Lots of emojis and visual elements
- Questions to keep kids engaged
- Examples from school, family, and friend situations

Make it feel like a cool older sibling or youth pastor is talking to them!`;

    const blogPost = await callLLMWithRetry(prompt);

    logger.info('Kids blog post generated', { userId, topic, age: targetAge });
    res.json({
      blogPost,
      topic: topic || 'Living like Jesus',
      targetAge,
      category: category || 'Kids Life',
      generatedAt: new Date().toISOString(),
      estimatedReadTime: Math.ceil(blogPost.split(' ').length / 150) // Kids read slower
    });

  } catch (error: any) {
    logger.error('Error generating kids blog post', { error: error.message, userId: req.user?.id });
    res.status(500).json({ 
      error: "Failed to generate blog post",
      message: "Please try again later"
    });
  }
}
