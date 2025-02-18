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
  route: 'retrieveDocuments' | 'directAnswer';
}> {
  //schema for routing
  const schema = z.object({
    route: z.enum(['retrieve', 'direct']),
    directAnswer: z.string().optional(),
  });

  const model = new ChatOpenAI({
    model: 'gpt-4o',
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

  if (route === 'retrieve') {
    return { route: 'retrieveDocuments' };
  } else {
    return {
      route: 'directAnswer',
    };
  }
}

async function answerQueryDirectly(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
  });
  const userHumanMessage = new HumanMessage(state.query);

  const response = await model.invoke([userHumanMessage]);
  return { messages: [userHumanMessage, response] };
}

async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'directAnswer'> {
  const route = state.route;
  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieveDocuments') {
    return 'retrieveDocuments';
  } else {
    return 'directAnswer';
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
  .addNode('directAnswer', answerQueryDirectly)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'retrieveDocuments',
    'directAnswer',
  ])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('directAnswer', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
