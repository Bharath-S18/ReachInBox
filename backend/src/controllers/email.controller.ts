import { Request, Response } from 'express';
import { ElasticsearchService } from '../services/elasticsearch.service.js';

export async function searchEmails(req: Request, res: Response): Promise<void> {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    // In authenticated flows, userId comes from req.user.id.
    // For standalone testing or dev, also accept userId query parameter or fallback to demo user.
    const userId =
      (req as any).user?.id ||
      (typeof req.query.userId === 'string' ? req.query.userId : 'demo-user-id');

    const result = await ElasticsearchService.searchEmails({
      userId,
      query,
      status,
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error handling email search request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search emails',
    });
  }
}
