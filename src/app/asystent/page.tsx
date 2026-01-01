"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const SUGGESTIONS = [
    "Jakie macie godziny otwarcia?",
    "Czy leczycie pod mikroskopem?",
    "Kto pracuje w klinice?",
    "Gdzie znajduje się gabinet?",
    "Chcę umówić wizytę."
];

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Dzień dobry! Jestem wirtualnym asystentem kliniki Mikrostomart. W czym mogę Ci pomóc?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: Message = { role: "user", content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Prepare context for API: slice last 10 messages to keep context window manageable
            const apiMessages = [...messages, userMessage].slice(-10);

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
            } else {
                console.error("API Error:", data);
                setMessages(prev => [...prev, { role: "assistant", content: "Przepraszam, wystąpił błąd techniczny. Proszę spróbować później lub skontaktować się telefonicznie." }]);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            setMessages(prev => [...prev, { role: "assistant", content: "Przepraszam, nie udało się połączyć z serwerem." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pt-32 pb-16">
            <div className="container mx-auto px-4 max-w-4xl h-[calc(100vh-140px)] flex flex-col">

                {/* Header */}
                <RevealOnScroll>
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-heading mb-2">Wirtualny Asystent</h1>
                        <p className="text-zinc-500">Twój osobisty przewodnik po Mikrostomart.</p>
                    </div>
                </RevealOnScroll>

                {/* Chat Window */}
                <div className="flex-1 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-700">

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white flex-shrink-0">
                                        <Bot size={18} />
                                    </div>
                                )}

                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-bl-none"
                                        }`}
                                >
                                    {msg.content}
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white flex-shrink-0">
                                    <Bot size={18} />
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-2xl rounded-bl-none flex items-center">
                                    <Loader2 size={18} className="animate-spin text-zinc-500" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">

                        {/* Suggestions */}
                        {messages.length < 3 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                                {SUGGESTIONS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="whitespace-nowrap px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-full text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-300"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                                placeholder="Napisz wiadomość..."
                                className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-zinc-400"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={isLoading || !input.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="text-[10px] text-center mt-2 text-zinc-400">
                            Asystent AI może popełniać błędy. Sprawdź ważne informacje telefonicznie.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
