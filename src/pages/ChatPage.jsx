import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Clipboard, CheckCircle, ImagePlus, X } from 'lucide-react';
import { sendPMMessage } from '../services/pmAgent';
import { dbService } from '../services/dbService';
import { formatCurrency } from '../utils/formatCurrency';
import { notifyTaskCompleted, notifyResearchReady } from '../services/notificationService';

const renderMessageText = (text) => {
  if (!text) return null;

  // Split the text into lines to preserve paragraph structure
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if line is a bullet point (starts with * or - followed by space)
    const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
    let cleanLine = line;
    if (isBullet) {
      cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
    }

    // Parse **bold** parts in the line
    const parts = [];
    let lastIndex = 0;
    let match;

    // Use regex to find and format all **bold** matches
    const boldRegex = /\*\*(.*?)\*\*/g;
    while ((match = boldRegex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cleanLine.substring(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${match.index}`} className="font-bold">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < cleanLine.length) {
      parts.push(cleanLine.substring(lastIndex));
    }

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-1 pl-3">
          <span className="text-blue-400 mt-1 flex-shrink-0 text-xs">•</span>
          <span className="flex-1">{parts}</span>
        </div>
      );
    }

    // Use a small empty spacer for empty lines, else standard paragraph
    return line.trim() === '' ? (
      <div key={lineIdx} className="h-2" />
    ) : (
      <p key={lineIdx} className="my-0.5">
        {parts}
      </p>
    );
  });
};

export default function ChatPage({ activeProperty, chatInitialPrompt, setChatInitialPrompt }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi Nick! I'm TameMane Orchestrator. I have loaded the portfolio context. You can ask me to create tasks, categorize transactions, or ask tax-related questions.",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle auto-drafting redirect from adjustments page
  useEffect(() => {
    if (chatInitialPrompt && chatInitialPrompt.trim()) {
      const promptToSend = chatInitialPrompt;
      setChatInitialPrompt('');
      setInputText('');
      setAttachments([]);
      sendMessage(promptToSend, []);
    }
  }, [chatInitialPrompt]);

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
            text: `Hi Nick! I'm TameMane Orchestrator. I have loaded the portfolio context for ${activeProperty.name}. You can ask me to create tasks, categorize transactions, or ask tax-related questions.`,
            timestamp: Date.now()
          }
        ]);
      }
    }
  }, [activeProperty]);

  // Save chat history to localStorage when messages update (keep last 100)
  useEffect(() => {
    if (activeProperty && messages.length > 0) {
      const welcomeMsg = messages.find(m => m.id === 'welcome');
      const otherMsgs = messages.filter(m => m.id !== 'welcome');
      const pruned = [
        ...(welcomeMsg ? [welcomeMsg] : []),
        ...otherMsgs.slice(-100)
      ];
      const key = `tm_chat_history_${activeProperty.id}`;
      try {
        localStorage.setItem(key, JSON.stringify(pruned));
      } catch (err) {
        // Base64 image attachments can blow past the localStorage quota. If that
        // happens, persist the conversation without the heavy image payloads.
        console.warn('Chat history too large to persist with images, stripping attachments.', err);
        const lightweight = pruned.map(m => (m.images ? { ...m, images: undefined } : m));
        try {
          localStorage.setItem(key, JSON.stringify(lightweight));
        } catch (innerErr) {
          console.warn('Failed to persist chat history.', innerErr);
        }
      }
    }
  }, [messages, activeProperty]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    // Reset the input so selecting the same file again re-triggers onChange
    e.target.value = '';
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (text, files = []) => {
    if ((!text.trim() && files.length === 0) || sending) return;

    setSending(true);

    // Add user message to UI
    const newUserMsg = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      text,
      images: files.length > 0 ? files : undefined,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // 1. Gather live context
      const [tasks, transactions, rentReductions, inventory] = await Promise.all([
        dbService.getTasks(activeProperty.id),
        dbService.getTransactions(activeProperty.id),
        dbService.getRentReductions ? dbService.getRentReductions(activeProperty.id) : Promise.resolve([]),
        dbService.getInventory ? dbService.getInventory(activeProperty.id) : Promise.resolve([])
      ]);

      const portfolioContext = {
        activeProperty,
        openTasks: tasks.filter(t => t.status !== 'completed'),
        recentTransactions: transactions.slice(0, 15), // limit to recent ones for context efficiency
        rentReductions: rentReductions || [],
        inventory: inventory || []
      };

      // 2. Fetch history (limit context window payload to 48 hours & max 15 messages)
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const history = messages
        .filter(m => m.id !== 'welcome' && !m.isSystem && (!m.timestamp || m.timestamp >= cutoff))
        .slice(-15)
        .map(m => ({ role: m.role, text: m.text }));

      // 3. Send message to agent (with any attached images)
      const response = await sendPMMessage(text, portfolioContext, history, files);

      // 4. Append model text response
      const modelMsgId = `msg_${Date.now()}_model`;
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: response.text, timestamp: Date.now() }]);

      // 5. Handle action execution
      if (response.actions && response.actions.length > 0) {
        for (const act of response.actions) {
          await executeAgentAction(act, files);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { 
          id: `msg_${Date.now()}_err`, 
          role: 'model', 
          text: 'Sorry, I encountered an error communicating with my brain. Please check your internet connection and API key.',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText;
    const files = attachments;
    setInputText('');
    setAttachments([]);
    await sendMessage(text, files);
  };

  const executeAgentAction = async (actionBlock, currentAttachments = []) => {
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
            text: `🛠️ Task created: "${created.title}" under property "${activeProperty.name}".`,
            timestamp: Date.now()
          }
        ]);
      } else if (type === 'update_task') {
        const taskPayload = actionBlock.task || actionBlock;
        if (taskPayload.id) {
          const patch = { ...taskPayload };
          // Mirror the manual "toggle complete" behavior from the Tasks page
          // so tasks finished via chat get a completedDate, and reopened
          // tasks have it cleared.
          if (patch.status === 'completed') {
            patch.completedDate = new Date().toISOString();
          } else if (patch.status) {
            patch.completedDate = null;
          }
          const updated = await dbService.saveTask(patch);

          // Append system notification message
          const isCompleted = updated.status === 'completed';
          setMessages(prev => [
            ...prev,
            {
              id: `sys_${Date.now()}_task_update_${updated.id}`,
              role: 'model',
              isSystem: true,
              text: isCompleted
                ? `✅ Task completed: "${updated.title}".`
                : `🔄 Task updated: "${updated.title}" (Status: ${updated.status || 'unchanged'}).`,
              timestamp: Date.now()
            }
          ]);

          if (isCompleted && activeProperty) {
            try {
              const allTasks = await dbService.getTasks(activeProperty.id);
              const nowUnblocked = allTasks.filter(t => {
                if (t.status === 'completed') return false;
                if (!t.blockedBy || !t.blockedBy.includes(updated.id)) return false;
                const remainingBlockers = t.blockedBy.filter(bid => {
                  if (bid === updated.id) return false;
                  const blocker = allTasks.find(bt => bt.id === bid);
                  return blocker && blocker.status !== 'completed';
                });
                return remainingBlockers.length === 0;
              });
              await notifyTaskCompleted(updated, nowUnblocked);
            } catch (err) {
              console.error('Failed to notify task completion:', err);
            }
          }
        }
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
          // Attach the receipt photo the user sent in this turn, if any,
          // so it's stored alongside the transaction just like a manual scan.
          receiptUrl: txPayload.receiptUrl || currentAttachments[0] || null,
        };
        const created = await dbService.saveTransaction(seedTx);

        // Append system notification message
        setMessages(prev => [
          ...prev,
          {
            id: `sys_${Date.now()}_tx_${created.id}`,
            role: 'model',
            isSystem: true,
            text: `💰 Transaction logged: "${created.vendor}" for ${formatCurrency(created.amount)} (${created.scheduleECategory}).${created.receiptUrl ? ' 📎 Receipt attached.' : ''}`,
            timestamp: Date.now()
          }
        ]);
      } else if (type === 'research_task') {
        const taskId = actionBlock.taskId;
        const findings = actionBlock.findings;
        if (taskId && findings) {
          try {
            const allTasks = await dbService.getTasks(activeProperty.id);
            const task = allTasks.find(t => t.id === taskId);
            if (task) {
              await dbService.saveTask({ ...task, researchNotes: findings, notes: findings });
              await notifyResearchReady(task, findings);
            } else {
              await dbService.saveTask({ id: taskId, researchNotes: findings, notes: findings });
            }

            setMessages(prev => [
              ...prev,
              {
                id: `sys_${Date.now()}_research_${taskId}`,
                role: 'model',
                isSystem: true,
                text: `🔍 Research saved to task. View it on the task card.`,
                timestamp: Date.now()
              }
            ]);
          } catch (err) {
            console.error('Failed to execute research_task action:', err);
          }
        }
      } else if (type === 'create_inventory_item') {
        const itemPayload = actionBlock.item || actionBlock;
        const seedItem = {
          ...itemPayload,
          propertyId: activeProperty.id,
          status: itemPayload.status || 'stored',
          category: itemPayload.category || 'Other',
          storageLocation: itemPayload.storageLocation || 'Unknown'
        };
        const created = await dbService.saveInventoryItem(seedItem);
        setMessages(prev => [
          ...prev,
          {
            id: `sys_${Date.now()}_inv_${created.id}`,
            role: 'model',
            isSystem: true,
            text: `📦 Item logged: "${created.name}" stored in "${created.storageLocation}".`,
            timestamp: Date.now()
          }
        ]);
      } else if (type === 'update_inventory_item') {
        const itemPayload = actionBlock.item || actionBlock;
        if (itemPayload.id) {
          const updated = await dbService.saveInventoryItem(itemPayload);
          setMessages(prev => [
            ...prev,
            {
              id: `sys_${Date.now()}_inv_update_${updated.id}`,
              role: 'model',
              isSystem: true,
              text: `📦 Item updated: "${updated.name}" (Location: ${updated.storageLocation || 'unchanged'}, Status: ${updated.status || 'unchanged'}).`,
              timestamp: Date.now()
            }
          ]);
        }
      } else if (type === 'delete_inventory_item') {
        const itemId = actionBlock.itemId || actionBlock.id;
        if (itemId) {
          await dbService.deleteInventoryItem(itemId);
          setMessages(prev => [
            ...prev,
            {
              id: `sys_${Date.now()}_inv_del_${itemId}`,
              role: 'model',
              isSystem: true,
              text: `📦 Item removed from inventory.`,
              timestamp: Date.now()
            }
          ]);
        }
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
              <div key={msg.id} className="flex justify-center my-1 animate-slide-up select-text">
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
              <div className={`p-3.5 rounded-3xl text-sm leading-relaxed select-text ${
                isModel
                  ? 'bg-dark-card border border-dark-border text-slate-100 rounded-tl-none'
                  : 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/15'
              }`}>
                {msg.images && msg.images.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${msg.text ? 'mb-2' : ''}`}>
                    {msg.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Attached"
                        className="w-28 h-28 object-cover rounded-2xl border border-white/15"
                      />
                    ))}
                  </div>
                )}
                {renderMessageText(msg.text)}
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
      <div className="sticky bottom-0 bg-dark-bg pt-2 border-t border-dark-border">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {attachments.map((src, i) => (
              <div key={i} className="relative w-16 h-16">
                <img
                  src={src}
                  alt="Attachment preview"
                  className="w-16 h-16 object-cover rounded-xl border border-dark-border"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 border border-slate-600 text-slate-300 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          {/* Hidden file input (supports camera capture on mobile) */}
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFilesSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach image"
            className="p-3 bg-slate-900 border border-dark-border text-slate-300 hover:text-white hover:border-blue-500 rounded-2xl active:scale-95 transition-all flex-shrink-0 flex items-center justify-center disabled:opacity-55"
          >
            <ImagePlus size={18} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={attachments.length > 0 ? 'Add a note (optional)...' : 'Ask PM Agent...'}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-slate-900 border border-dark-border rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={sending || (!inputText.trim() && attachments.length === 0)}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl active:scale-95 transition-all flex-shrink-0 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
