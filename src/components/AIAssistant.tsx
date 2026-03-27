import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "ai", text: "Hi! I'm Nexus AI, your teaching assistant. Ask me anything — explain topics simply, generate quiz questions, or get classroom activity ideas! 🎓" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate AI response (replace with actual API later)
    setTimeout(() => {
      const responses: Record<string, string> = {
        default: "That's a great question! Here's a simple explanation you can use in class:\n\nI'd recommend breaking this topic down into 3 key points for your students. Would you like me to create a quiz on this topic? 📝"
      };

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: responses.default,
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold gradient-text">Nexus AI</h2>
        <p className="text-xs text-muted-foreground">Your AI Teaching Assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "ai" && (
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "btn-primary text-primary-foreground rounded-br-md"
                  : "glass-card-light text-foreground rounded-bl-md"
              }`}>
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-accent" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card-light p-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask Nexus AI anything..."
          className="flex-1 py-3 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="btn-primary p-3 rounded-xl disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;
