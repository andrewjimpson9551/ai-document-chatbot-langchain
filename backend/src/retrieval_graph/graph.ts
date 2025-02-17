import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeSupabaseRetriever } from '../shared/retrieval.js';
import { ChatOpenAI } from '@langchain/openai';
import { formatDocs } from './utils.js';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pull } from 'langchain/hub';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';

async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
): Promise<{
  route: 'retrieveDocuments' | typeof END;
  messages?: BaseMessage[];
}> {
  //schema for routing
  const schema = z.object({
    route: z.enum(['retrieve', 'direct']),
    directAnswer: z.string().optional(),
  });

  const model = new ChatOpenAI({
    model: 'gpt-4',
    temperature: 0,
  }).withStructuredOutput(schema);

  const routingPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      "You are a routing assistant. Your job is to determine if a question needs document retrieval or can be answered directly.\n\nRespond with either:\n'retrieve' - if the question requires retrieving documents\n'direct' - if the question can be answered directly AND your direct answer",
    ],
    ['human', '{query}'],
  ]);

  const formattedPrompt = await routingPrompt.invoke({
    query: state.query,
  });

  const messageHistory = [...state.messages, formattedPrompt.toString()];

  const response = await model.invoke(messageHistory);

  const route = response.route;

  const userHumanMessage = new HumanMessage(state.query);

  if (route === 'retrieve') {
    return { route: 'retrieveDocuments' };
  } else {
    const directAnswer = new AIMessage(response.directAnswer ?? '');

    return {
      route: END,
      messages: [userHumanMessage, directAnswer],
    };
  }
}

async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | typeof END> {
  const route = state.route;
  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieveDocuments') {
    return 'retrieveDocuments';
  } else {
    return END;
  }
}

async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeSupabaseRetriever();
  const response = await retriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const context = formatDocs(state.documents);
  const model = new ChatOpenAI({
    model: 'gpt-4',
    temperature: 0,
  });
  const promptTemplate = await pull<ChatPromptTemplate>('rlm/rag-prompt');

  const formattedPrompt = await promptTemplate.invoke({
    context: context,
    question: state.query,
  });

  const userHumanMessage = new HumanMessage(state.query);

  // Create a human message with the formatted prompt that includes context
  const formattedPromptMessage = new HumanMessage(formattedPrompt.toString());

  const messageHistory = [...state.messages, formattedPromptMessage];

  // Let MessagesAnnotation handle the message history
  const response = await model.invoke(messageHistory);

  // Return both the current query and the AI response to be handled by MessagesAnnotation's reducer
  return { messages: [userHumanMessage, response] };
}

const builder = new StateGraph(AgentStateAnnotation)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addNode('checkQueryType', checkQueryType)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, ['retrieveDocuments', END])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
