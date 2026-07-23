import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, BookOpen, AlertCircle, FileText, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { chatAPI, type Citation } from '../utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export function Chat() {
  const { user, sessionId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: `Hello **${user?.username ?? 'there'}**! I'm **NexaVerse**, your enterprise knowledge assistant. Ask me anything about your uploaded documents.`,
  }]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Use session ID from auth context
  const sessionIdRef = useRef<string>(sessionId || '');
  
  // Update ref when sessionId changes
  useEffect(() => {
    if (sessionId) {
      sessionIdRef.current = sessionId;
    }
  }, [sessionId]);
  
  // Token batching: accumulate tokens in a ref and flush to state via RAF
  // so we don't trigger a React re-render on every single streaming token.
  const pendingTokens = useRef<string>('');
  const rafHandle = useRef<number | null>(null);

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!sessionId) return;
      try {
        const history = await chatAPI.getHistory(sessionId);
        if (history.messages && history.messages.length > 0) {
          // Convert stored messages to display format
          const loadedMessages: Message[] = history.messages.map((msg: any, idx: number) => ({
            id: idx.toString(),
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }));
          setMessages(loadedMessages);
        }
      } catch (err) {
        // If history fetch fails, continue with empty messages
        console.error('Failed to load chat history:', err);
      }
    };

    loadChatHistory();
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Cleanup EventSource and any pending RAF on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (rafHandle.current !== null) {
        cancelAnimationFrame(rafHandle.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setError('');

    const botId = (Date.now() + 1).toString();
    let botMessage: Message = { 
      id: botId, 
      role: 'assistant', 
      content: '', 
      isStreaming: true,
      citations: []
    };
    setMessages(prev => [...prev, botMessage]);

    // Cancel any leftover RAF from a previous stream
    if (rafHandle.current !== null) {
      cancelAnimationFrame(rafHandle.current);
      rafHandle.current = null;
    }
    pendingTokens.current = '';

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      eventSourceRef.current = chatAPI.streamChat(
        {
          message: userMsg.content,
          session_id: sessionIdRef.current,
        },
        // onCitation
        (citations) => {
          botMessage.citations = citations.map((c, idx) => ({
            ...c,
            id: (idx + 1).toString()
          }));
          setMessages(prev => prev.map(m => m.id === botId ? { ...m, citations: botMessage.citations } : m));
        },
        // onToken — accumulate into buffer, flush on next animation frame
        (token) => {
          botMessage.content += token;
          pendingTokens.current += token;
          // Clear status text once real content starts arriving
          if (statusText) setStatusText('');

          if (rafHandle.current === null) {
            rafHandle.current = requestAnimationFrame(() => {
              rafHandle.current = null;
              if (pendingTokens.current) {
                pendingTokens.current = '';
                setMessages(prev =>
                  prev.map(m => m.id === botId ? { ...m, content: botMessage.content } : m)
                );
              }
            });
          }
        },
        // onDone
        (_totalTokens) => {
          setStatusText('');
          setMessages(prev => prev.map(m => m.id === botId ? { ...m, isStreaming: false } : m));
          setIsStreaming(false);
          eventSourceRef.current = null;
        },
        // onError
        (errorMsg) => {
          console.error('Chat error:', errorMsg);
          setStatusText('');
          setError(errorMsg);
          setMessages(prev => prev.map(m => m.id === botId 
            ? { ...m, content: `Error: ${errorMsg}`, isStreaming: false } 
            : m
          ));
          setIsStreaming(false);
          eventSourceRef.current = null;
        },
        // onReplace (content safety)
        (replacementContent) => {
          botMessage.content = replacementContent;
          setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: replacementContent } : m));
        },
        // onStatus — pipeline progress messages
        (status) => {
          setStatusText(status);
        }
      );
    } catch (err: any) {
      console.error('Failed to start chat stream:', err);
      setError(err.message || 'Failed to connect to chat service');
      setMessages(prev => prev.map(m => m.id === botId 
        ? { ...m, content: 'Failed to connect to chat service. Please try again.', isStreaming: false } 
        : m
      ));
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Chat panel */}
      <div className={cn('flex flex-col card overflow-hidden transition-all duration-300', activeCitation ? 'flex-[2]' : 'flex-1')}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-dark">AI Assistant</p>
              <p className="text-xs text-slate-400">Connected to your knowledge base</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-teal px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Online
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex gap-3 max-w-3xl animate-fade-in', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
            >
              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'user'
                  ? 'bg-brand-dark text-white'
                  : 'bg-brand-teal text-white'
              )}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={cn('flex flex-col gap-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-xl',
                  msg.role === 'user'
                    ? 'bg-brand-dark text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-brand-dark rounded-tl-sm'
                )}>
                  <ReactMarkdown
                    components={{
                      a: ({ children, ...props }) => {
                        const raw = String(children).replace(/[[\]]/g, '');
                        const citation = msg.citations?.find(c => c.id === raw);
                        if (citation) {
                          return (
                            <button
                              onClick={() => setActiveCitation(citation)}
                              className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-brand-coral text-white rounded align-middle mx-0.5 hover:bg-opacity-90 transition-colors"
                            >
                              {citation.id}
                            </button>
                          );
                        }
                        return <a {...props}>{children}</a>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {/* Status placeholder: shown when streaming but no content yet */}
                  {msg.isStreaming && !msg.content && statusText && (
                    <span className="flex items-center gap-2 text-slate-400 text-xs italic">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-bounce [animation-delay:300ms]" />
                      </span>
                      {statusText}
                    </span>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-1.5 h-4 bg-brand-blue rounded-sm animate-pulse ml-1 align-middle" />
                  )}
                </div>

                {/* Citation chips */}
                {msg.citations && msg.citations.length > 0 && !msg.isStreaming && (
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCitation(c)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          activeCitation?.id === c.id
                            ? 'bg-brand-coral text-white border-brand-coral'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-brand-coral hover:text-brand-coral'
                        )}
                      >
                        <FileText className="w-3 h-3" />
                        {c.document}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 animate-fade-in">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about your documents… (Shift+Enter for newline)"
              className="flex-1 form-input resize-none min-h-[44px] max-h-28 py-3"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-brand-teal text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="flex items-center gap-1 text-xs text-slate-400 mt-2 justify-center">
            <AlertCircle className="w-3 h-3" />
            AI responses may be inaccurate. Verify critical information.
          </p>
        </div>
      </div>

      {/* Citation side-panel */}
      {activeCitation && (
        <div className="hidden lg:flex w-72 flex-col card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-semibold text-brand-dark">Source</span>
            </div>
            <button
              onClick={() => setActiveCitation(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Document</p>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <FileText className="w-4 h-4 text-brand-blue flex-shrink-0" />
                <span className="text-sm font-medium text-brand-dark truncate">{activeCitation.document}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Page</p>
              {activeCitation.page ? (
                <span className="inline-block px-3 py-1.5 bg-brand-coral text-white text-sm font-semibold rounded-lg">
                  Page {activeCitation.page}
                </span>
              ) : (
                <span className="inline-block px-3 py-1.5 bg-slate-200 text-slate-600 text-sm font-medium rounded-lg">
                  Page not specified
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Excerpt</p>
              <div className="p-4 bg-brand-lime rounded-xl">
                <p className="text-sm text-brand-dark leading-relaxed font-medium">"{activeCitation.excerpt}"</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
