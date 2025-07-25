import cron from 'node-cron';
import { db } from '../db/db';
import { users, weekly_content_summaries } from '../db/schema';
import { eq } from 'drizzle-orm';
import { llmService } from './llm.service';
import logger from '../utils/logger';

export class SchedulerService {
  static init() {
    // Run every Sunday at 8 AM to generate weekly summaries
    cron.schedule('0 8 * * 0', async () => {
      logger.info('Starting weekly summary generation...');
      
      try {
        // Get all parent users
        const parents = await db
          .select()
          .from(users)
          .where(eq(users.role, 'parent'));

        for (const parent of parents) {
          try {
            // Check if summary already exists for this week
            const thisWeekStart = new Date();
            thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay()); // Start of week (Sunday)
            
            const existingSummary = await db
              .select()
              .from(weekly_content_summaries)
              .where(
                and(
                  eq(weekly_content_summaries.family_id, parent.id),
                  eq(weekly_content_summaries.week_start_date, thisWeekStart.toISOString().split('T')[0])
                )
              )
              .limit(1);

            if (existingSummary.length === 0) {
              await llmService.generateWeeklySummary(parent.id);
              logger.info(`Generated weekly summary for family ${parent.id}`);
            }
          } catch (error) {
            logger.error(`Failed to generate summary for family ${parent.id}:`, error);
          }
        }
        
        logger.info('Weekly summary generation completed');
      } catch (error) {
        logger.error('Error in weekly summary generation:', error);
      }
    });

    logger.info('Scheduler service initialized');
  }
}
