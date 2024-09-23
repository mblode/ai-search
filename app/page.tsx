"use client";
import { useState } from "react";
import { Message, search } from "./actions";
import { readStreamableValue } from "ai/rsc";
import { Button } from "@/components/ui/button";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MemoizedReactMarkdown } from "@/components/ui/markdown";
import { CodeBlock } from "@/components/ui/codeblock";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { messages, newMessage } = await search(input);
    let textContent = "";
    for await (const delta of readStreamableValue(newMessage)) {
      textContent = `${textContent}${delta}`;
      setConversation([
        ...(messages as Message[]),
        { role: "assistant", content: textContent },
      ]);
    }
    setInput("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Perplexity-like Search Engine</h1>
      <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
        <Input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter your search query"
          className="flex-grow"
        />
        <Button type="submit">Search</Button>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            Summary based on Tavily search and GPT-4 analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversation.map((message, index) => (
            <div key={index} className="mb-2">
              <MemoizedReactMarkdown
                rehypePlugins={[[rehypeExternalLinks, { target: "_blank" }]]}
                remarkPlugins={[remarkGfm]}
                className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    if (children.length) {
                      if (children[0] == "▍") {
                        return (
                          <span className="mt-1 cursor-default animate-pulse">
                            ▍
                          </span>
                        );
                      }

                      children[0] = (children[0] as string).replace("`▍`", "▍");
                    }

                    const match = /language-(\w+)/.exec(className || "");

                    if (inline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <CodeBlock
                        key={Math.random()}
                        language={(match && match[1]) || ""}
                        value={String(children).replace(/\n$/, "")}
                        {...props}
                      />
                    );
                  },
                }}
              >
                {message.content}
              </MemoizedReactMarkdown>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
