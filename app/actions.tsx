"use server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createStreamableValue } from "ai/rsc";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function search(query: string) {
  const stream = createStreamableValue();
  (async () => {
    try {
      stream.update("Searching...\n\n");
      const searchResults = await tavilySearch(query);

      const summaries = searchResults.results
        .map(
          (result, index: number) =>
            `${index + 1}. ${result.title}\n${result.url}\n${
              result.snippet
            }\n\n`
        )
        .join("");

      const prompt = `You are an AI assistant tasked with summarizing search results. 
      Based on the following search results for the query "${query}", provide a comprehensive 
      summary of the information. Include key points, any conflicting information, and 
      areas where more research might be needed. Here are the search results:
      
      ${summaries}
      
      Please provide your summary:`;

      const { textStream } = await streamText({
        model: openai("gpt-4o-mini"),
        messages: [{ role: "user", content: prompt }],
        maxTokens: 2500,
        system: `As a professional writer, your job is to generate a comprehensive and informative, yet concise answer of 400 words or less for the given question based solely on the provided search results (URL and content). You must only use information from the provided search results. Use an unbiased and journalistic tone. Combine search results together into a coherent answer. Do not repeat text. If there are any images relevant to your answer, be sure to include them as well. Aim to directly address the user's question, augmenting your response with insights gleaned from the search results. 
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly. Please match the language of the response to the user's language.
    Always answer in Markdown format. Links and images must follow the correct format.
    Link format: [link text](url)
    Image format: ![alt text](url)`,
      });

      for await (const text of textStream) {
        stream.update(text);
      }
    } catch (error) {
      stream.update(`An error occurred: ${error}`);
    } finally {
      stream.done();
    }
  })();

  return {
    messages: [{ role: "user", content: query }],
    newMessage: stream.value,
  };
}

export type SearchResults = {
  images: SearchResultImage[];
  results: SearchResultItem[];
  number_of_results?: number;
  query: string;
};

export type SearchResultImage =
  | string
  | {
      url: string;
      description: string;
      number_of_results?: number;
    };

export type SearchResultItem = {
  title: string;
  url: string;
  content: string;
  snippet: string;
};

async function tavilySearch(query: string): Promise<SearchResults> {
  const includeImageDescriptions = true;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      max_results: 10,
      include_images: true,
      include_image_descriptions: includeImageDescriptions,
      include_answers: true,
      include_domains: [],
      exclude_domains: [],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Tavily API error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}
