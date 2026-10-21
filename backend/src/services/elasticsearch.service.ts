import { Client } from '@elastic/elasticsearch';
import { esClient, checkElasticsearchHealth } from '../config/elasticsearch.js';
import { prisma } from '../lib/prisma.js';
import { EmailJobStatus } from '@prisma/client';

export const EMAILS_INDEX_NAME = process.env.ELASTICSEARCH_INDEX || 'emails';

export interface EmailJobDocument {
  jobId: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  etherealMessageUrl?: string | null;
  errorMessage?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SearchEmailParams {
  userId: string;
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface SearchEmailResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: 'ELASTICSEARCH' | 'DATABASE_FALLBACK';
  data: Array<{
    id: string;
    userId: string;
    senderId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: string | Date;
    sentAt: string | Date | null;
    etherealMessageUrl: string | null;
    errorMessage: string | null;
  }>;
}

export class ElasticsearchService {
  private static client: Client = esClient;
  private static isIndexInitialized: boolean = false;

  /**
   * Override client (used primarily for unit/integration testing)
   */
  public static setClient(customClient: Client): void {
    this.client = customClient;
    this.isIndexInitialized = false;
  }

  /**
   * Reset client to default singleton
   */
  public static resetClient(): void {
    this.client = esClient;
    this.isIndexInitialized = false;
  }

  /**
   * Initializes the 'emails' index with full-text search mappings
   */
  public static async initIndex(indexName: string = EMAILS_INDEX_NAME): Promise<boolean> {
    const health = await checkElasticsearchHealth(this.client);
    if (!health.healthy) {
      console.warn(`ℹ️ [Elasticsearch] Cluster offline at ${health.node}. Graceful fallback mode will be active.`);
      return false;
    }

    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          mappings: {
            properties: {
              jobId: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              etherealMessageUrl: { type: 'keyword' },
              errorMessage: { type: 'text' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
        console.log(`✅ [Elasticsearch] Index '${indexName}' initialized with search mappings.`);
      }

      this.isIndexInitialized = true;
      return true;
    } catch (error: any) {
      console.warn(`⚠️ [Elasticsearch] Failed to initialize index '${indexName}':`, error.message);
      return false;
    }
  }

  /**
   * Indexes an email job document in real time
   */
  public static async indexEmailJob(
    job: EmailJobDocument,
    indexName: string = EMAILS_INDEX_NAME
  ): Promise<boolean> {
    try {
      const health = await checkElasticsearchHealth(this.client);
      if (!health.healthy) {
        return false;
      }

      await this.client.index({
        index: indexName,
        id: job.jobId,
        document: {
          ...job,
          scheduledAt: new Date(job.scheduledAt).toISOString(),
          sentAt: job.sentAt ? new Date(job.sentAt).toISOString() : null,
          createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : new Date().toISOString(),
        },
        refresh: true, // Refresh index for instant searchability
      });

      return true;
    } catch (error: any) {
      console.warn(`⚠️ [Elasticsearch] Failed to index job ${job.jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Updates an email job document status (e.g. SENT, FAILED, RESCHEDULED) in real time
   */
  public static async updateEmailJobStatus(
    jobId: string,
    status: string,
    additionalFields: Partial<EmailJobDocument> = {},
    indexName: string = EMAILS_INDEX_NAME
  ): Promise<boolean> {
    try {
      const health = await checkElasticsearchHealth(this.client);
      if (!health.healthy) {
        return false;
      }

      const updateDoc: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (additionalFields.sentAt) {
        updateDoc.sentAt = new Date(additionalFields.sentAt).toISOString();
      }
      if (additionalFields.scheduledAt) {
        updateDoc.scheduledAt = new Date(additionalFields.scheduledAt).toISOString();
      }
      if (additionalFields.etherealMessageUrl !== undefined) {
        updateDoc.etherealMessageUrl = additionalFields.etherealMessageUrl;
      }
      if (additionalFields.errorMessage !== undefined) {
        updateDoc.errorMessage = additionalFields.errorMessage;
      }

      await this.client.update({
        index: indexName,
        id: jobId,
        doc: updateDoc,
        doc_as_upsert: true,
        refresh: true,
      });

      return true;
    } catch (error: any) {
      console.warn(`⚠️ [Elasticsearch] Failed to update job ${jobId} status in index:`, error.message);
      return false;
    }
  }

  /**
   * Removes an email job document from Elasticsearch
   */
  public static async deleteEmailJob(
    jobId: string,
    indexName: string = EMAILS_INDEX_NAME
  ): Promise<boolean> {
    try {
      const health = await checkElasticsearchHealth(this.client);
      if (!health.healthy) {
        return false;
      }

      await this.client.delete({
        index: indexName,
        id: jobId,
        refresh: true,
      });

      return true;
    } catch (error: any) {
      // 404 is acceptable when document doesn't exist
      if (error.meta?.statusCode !== 404) {
        console.warn(`⚠️ [Elasticsearch] Failed to delete job ${jobId} from index:`, error.message);
      }
      return false;
    }
  }

  /**
   * Searches email jobs via Elasticsearch multi-match, or automatically falls back
   * to Supabase PostgreSQL database queries if Elasticsearch is offline.
   */
  public static async searchEmails(
    params: SearchEmailParams,
    indexName: string = EMAILS_INDEX_NAME
  ): Promise<SearchEmailResult> {
    const { userId, query, status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;

    // Check Elasticsearch connectivity
    const health = await checkElasticsearchHealth(this.client);

    if (health.healthy) {
      try {
        const mustClauses: any[] = [{ term: { userId } }];

        if (status && status.trim() !== '') {
          mustClauses.push({ term: { status: status.toUpperCase() } });
        }

        if (query && query.trim() !== '') {
          mustClauses.push({
            multi_match: {
              query: query.trim(),
              fields: ['recipientEmail^3', 'subject^2', 'body'],
              fuzziness: 'AUTO',
              operator: 'or',
            },
          });
        }

        const response = await this.client.search({
          index: indexName,
          from,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
        });

        const totalHits =
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value ?? 0;

        const data = response.hits.hits.map((hit: any) => {
          const doc = hit._source;
          return {
            id: doc.jobId || hit._id,
            userId: doc.userId,
            senderId: doc.senderId,
            recipientEmail: doc.recipientEmail,
            subject: doc.subject,
            body: doc.body,
            status: doc.status,
            scheduledAt: doc.scheduledAt,
            sentAt: doc.sentAt ?? null,
            etherealMessageUrl: doc.etherealMessageUrl ?? null,
            errorMessage: doc.errorMessage ?? null,
          };
        });

        return {
          total: totalHits,
          page,
          limit,
          totalPages: Math.ceil(totalHits / limit),
          source: 'ELASTICSEARCH',
          data,
        };
      } catch (esError: any) {
        console.warn(
          `⚠️ [Elasticsearch] Search query failed, falling back to database:`,
          esError.message
        );
      }
    }

    // =========================================================================
    // Graceful Fallback: Query Supabase PostgreSQL via Prisma ORM
    // =========================================================================
    const whereClause: any = { userId };

    if (status && status.trim() !== '') {
      whereClause.status = status.toUpperCase() as EmailJobStatus;
    }

    if (query && query.trim() !== '') {
      const q = query.trim();
      whereClause.OR = [
        { recipientEmail: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.emailJob.count({ where: whereClause }),
      prisma.emailJob.findMany({
        where: whereClause,
        skip: from,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      source: 'DATABASE_FALLBACK',
      data: records.map((record) => ({
        id: record.id,
        userId: record.userId,
        senderId: record.senderId,
        recipientEmail: record.recipientEmail,
        subject: record.subject,
        body: record.body,
        status: record.status,
        scheduledAt: record.scheduledAt,
        sentAt: record.sentAt,
        etherealMessageUrl: record.etherealMessageUrl,
        errorMessage: record.errorMessage,
      })),
    };
  }
}
