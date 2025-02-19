import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { ChatOpenAI } from '@langchain/openai';
import { formatDocs } from './utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { RESPONSE_SYSTEM_PROMPT, ROUTER_SYSTEM_PROMPT } from './prompts.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { AgentConfigurationAnnotation } from './configuration.js';

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

  const routingPrompt = ROUTER_SYSTEM_PROMPT;

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
  config: RunnableConfig,
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const context = formatDocs(state.documents);
  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
  });
  const promptTemplate = RESPONSE_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    question: state.query,
    context: context,
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

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
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
