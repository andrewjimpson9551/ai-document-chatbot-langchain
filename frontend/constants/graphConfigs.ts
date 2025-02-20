import { AgentConfiguration, IndexConfiguration } from '@/app/types/graphTypes';

type StreamConfigurables = AgentConfiguration;
type IndexConfigurables = IndexConfiguration;

export const retrievalAssistantStreamConfig: StreamConfigurables = {
  queryModel: 'openai/gpt-4o-mini',
  retrieverProvider: 'supabase',
  k: 5,
};

/**
 * The configuration for the indexing/ingestion process.
 */
export const indexConfig: IndexConfigurables = {
  useSampleDocs: false,
  retrieverProvider: 'supabase',
};
