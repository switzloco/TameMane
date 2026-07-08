import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Clipboard, CheckCircle } from 'lucide-react';
import { sendPMMessage } from '../services/pmAgent';
import { dbService } from '../services/dbService';
import { formatCurrency } from '../utils/formatCurrency';

export default function ChatPage({ activeProperty }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi Nick! I'm TameMane PM. I have loaded the portfolio context. You can ask me to create tasks, categorize transactions, or ask tax-related questions."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // Load chat history when active property changes
  useEffect(() => {
    if (activeProperty) {
      const saved = localStorage.getItem(`tm_chat_history_${activeProperty.id}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'model',
            text: `Hi Nick! I'm TameMane PM. I have loaded the portfolio context for ${activeProperty.name}. You can ask me to create tasks, categorize transactions, or ask tax-related questions.`
          }
        ]);
      }
    }
  }, [activeProperty]);

  // Save chat history to localStorage when messages update
  useEffect(() => {
    if (activeProperty && messages.length > 0) {
      localStorage.setItem(`tm_chat_history_${activeProperty.id}`, JSON.stringify(messages));
    }
  }, [messages, activeProperty]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userText = inputText;
    setInputText('');
    setSending(true);

    // Add user message to UI
    const newUserMsg = { id: `msg_${Date.now()}`, role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // 1. Gather live context
      const [tasks, transactions] = await Promise.all([
        dbService.getTasks(activeProperty.id),
        dbService.getTransactions(activeProperty.id)
      ]);

      const portfolioContext = {
        activeProperty,
        openTasks: tasks.filter(t => t.status !== 'completed'),
        recentTransactions: transactions.slice(0, 15) // limit to recent ones for context efficiency
      };

      // 2. Fetch history
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, text: m.text }));

      // 3. Send message to agent
      const response = await sendPMMessage(userText, portfolioContext, history);

      // 4. Append model text response
      const modelMsgId = `msg_${Date.now()}_model`;
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: response.text }]);

      // 5. Handle action execution
      if (response.actions && response.actions.length > 0) {
        for (const act of response.actions) {
          await executeAgentAction(act);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { 
          id: `msg_${Date.now()}_err`, 
          role: 'model', 
          text: 'Sorry, I encountered an error communicating with my brain. Please check your internet connection and API key.' 
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const executeAgentAction = async (actionBlock) => {
    try {
      const type = actionBlock.type || actionBlock.action;
      
      if (type === 'create_task') {
        const taskPayload = actionBlock.task || actionBlock;
        const seedTask = {
          ...taskPayload,
          propertyId: activeProperty.id,
          status: 'open',
          dueDate: taskPayload.dueDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
          notes: 'Created via AI Chat',
          source: 'gemini_triage',
        };
        const created = await dbService.saveTask(seedTask);
        
        // Append system notification message
        setMessages(prev => [
          ...prev,
          {
            id: `sys_${Date.now()}_task_${created.id}`,
            role: 'model',
            isSystem: true,
            text: `🛠️ Task created: "${created.title}" under property "${activeProperty.name}".`
          }
        ]);
      } else if (type === 'create_transaction') {
        const txPayload = actionBlock.transaction || actionBlock;
        const seedTx = {
          ...txPayload,
          propertyId: activeProperty.id,
          date: txPayload.date || new Date().toISOString().split('T')[0],
          parsedByGemini: true,
          geminiConfidence: 1.0,
          needsReview: false,
          description: txPayload.description || 'Logged via AI Chat',
        };
        const created = await dbService.saveTransaction(seedTx);

        // Append system notification message
        setMessages(prev => [
          ...prev,
          {
            id: `sys_${Date.now()}_tx_${created.id}`,
            role: 'model',
            isSystem: true,
            text: `💰 Transaction logged: "${created.vendor}" for ${formatCurrency(created.amount)} (${created.scheduleECategory}).`
          }
        ]);
      }
    } catch (actionErr) {
      console.error('Failed to execute agent action:', actionErr);
    }
  };

  return (
    <div className="flex flex-col h-[76vh] justify-between max-w-md mx-auto relative bg-dark-bg">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 pb-4">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-1 animate-slide-up">
                <span className="px-3 py-1 text-[10px] font-semibold bg-blue-950/40 border border-blue-900/30 text-blue-300 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`flex gap-2.5 max-w-[85%] animate-slide-up ${
                isModel ? 'self-start' : 'self-end flex-row-reverse'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-2xl flex items-center justify-center border flex-shrink-0 ${
                isModel 
                  ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {isModel ? <Bot size={16} /> : <User size={16} />}
              </div>

              {/* Message Bubble */}
              <div className={`p-3.5 rounded-3xl text-sm leading-relaxed ${
                isModel 
                  ? 'bg-dark-card border border-dark-border text-slate-100 rounded-tl-none' 
                  : 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/15'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-2.5 max-w-[85%] self-start animate-pulse">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center border bg-blue-600/10 border-blue-500/20 text-blue-400">
              <Bot size={16} />
            </div>
            <div className="p-3.5 rounded-3xl bg-dark-card border border-dark-border rounded-tl-none flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-dark-bg pt-2 border-t border-dark-border flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask PM Agent..."
          disabled={sending}
          className="flex-1 px-4 py-3 bg-slate-900 border border-dark-border rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-55"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl active:scale-95 transition-all flex-shrink-0 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
