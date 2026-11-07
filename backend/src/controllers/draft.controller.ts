import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

/**
 * Fetch all drafts for the authenticated user
 */
export async function getDrafts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const drafts = await prisma.emailDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      drafts,
      total: drafts.length,
    });
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch drafts' });
  }
}

/**
 * Upsert a draft (creates a new draft or updates existing if id provided)
 */
export async function saveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id, recipientEmail, subject, body, senderAccountId, delaySeconds } = req.body;

    let draft;
    if (id) {
      // Verify ownership before updating
      const existing = await prisma.emailDraft.findFirst({
        where: { id, userId },
      });

      if (existing) {
        draft = await prisma.emailDraft.update({
          where: { id },
          data: {
            recipientEmail: recipientEmail ?? existing.recipientEmail,
            subject: subject ?? existing.subject,
            body: body ?? existing.body,
            senderAccountId: senderAccountId !== undefined ? senderAccountId : existing.senderAccountId,
            delaySeconds: delaySeconds !== undefined ? delaySeconds : existing.delaySeconds,
          },
        });
      }
    }

    if (!draft) {
      draft = await prisma.emailDraft.create({
        data: {
          userId,
          recipientEmail: recipientEmail || '',
          subject: subject || '',
          body: body || '',
          senderAccountId: senderAccountId || null,
          delaySeconds: typeof delaySeconds === 'number' ? delaySeconds : 0,
        },
      });
    }

    res.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    console.error('Error saving draft:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save draft' });
  }
}

/**
 * Delete a draft by ID
 */
export async function deleteDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.emailDraft.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Draft not found' });
      return;
    }

    await prisma.emailDraft.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Draft discarded successfully',
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete draft' });
  }
}
