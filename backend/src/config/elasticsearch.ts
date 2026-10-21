import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const esClient = new Client({
  node,
  maxRetries: 2,
  requestTimeout: 3000,
});

export interface ElasticsearchHealth {
  healthy: boolean;
  node: string;
  clusterName?: string;
  error?: string;
}

/**
 * Performs a fast, non-blocking health check on the Elasticsearch cluster
 */
export async function checkElasticsearchHealth(customClient?: Client): Promise<ElasticsearchHealth> {
  const clientToUse = customClient || esClient;
  try {
    const health = await clientToUse.cluster.health({}, { requestTimeout: 2000 });
    return {
      healthy: true,
      node,
      clusterName: health.cluster_name,
    };
  } catch (error: any) {
    return {
      healthy: false,
      node,
      error: error.message || 'Elasticsearch cluster unreachable',
    };
  }
}
