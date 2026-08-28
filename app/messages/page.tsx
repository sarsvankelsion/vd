'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface MessageItem {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  fileName?: string;
  fileContent?: string;
  createdAt: number;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const initialTo = searchParams?.get('to') || '';

  const [currentUserId, setCurrentUserId] = useState('');
  const [recipientId, setRecipientId] = useState(initialTo);
  const [peers, setPeers] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [fileAttachment, setFileAttachment] = useState<{ name: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (!id || !localStorage.getItem('token')) {
      window.location.href = '/login';
      return;
    }
    setCurrentUserId(id);
    loadPeers();
  }, []);

  useEffect(() => {
    if (recipientId) {
      loadChat(recipientId);
    }
  }, [recipientId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadPeers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPeers(data.peers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (peer: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages?peerId=${encodeURIComponent(peer)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || (!inputContent.trim() && !fileAttachment)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toId: recipientId.toUpperCase(),
          content: inputContent,
          fileName: fileAttachment?.name,
          fileContent: fileAttachment?.content,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        setInputContent('');
        setFileAttachment(null);
        if (!peers.includes(recipientId.toUpperCase())) {
          setPeers((prev) => [...prev, recipientId.toUpperCase()]);
        }
      }
    } catch {
      // ignore
    }
  };

  const downloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-10">
      <h1 className="text-sm font-medium text-white mb-1">Encrypted Messages</h1>
      <p className="text-xs text-[#555] mb-6">
        Direct private messaging by 15-char ID. Identity masked in public.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 border border-[#1a1a1a] min-h-[480px]">
        {/* Left: Peers list / New recipient */}
        <div className="border-b md:border-b-0 md:border-r border-[#1a1a1a] p-4 bg-[#050505] flex flex-col">
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Message by ID</p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value.toUpperCase())}
              placeholder="15-char recipient ID"
              className="text-xs font-mono tracking-wider"
              maxLength={15}
            />
          </div>

          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Conversations</p>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {peers.length === 0 ? (
              <p className="text-xs text-[#444]">No active chats.</p>
            ) : (
              peers.map((peer) => (
                <button
                  key={peer}
                  onClick={() => setRecipientId(peer)}
                  className={`w-full text-left p-2 font-mono text-xs transition-colors flex justify-between items-center ${
                    recipientId === peer ? 'bg-[#111] text-white border-l-2 border-white' : 'text-[#888] hover:bg-[#0a0a0a]'
                  }`}
                >
                  <span>{peer.slice(0, 4)}...{peer.slice(-3)}</span>
                  <span className="text-[10px] text-[#444]">{peer === initialTo ? 'new' : ''}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Message history & Chat input */}
        <div className="md:col-span-2 flex flex-col bg-[#050505]">
          {recipientId ? (
            <>
              {/* Header */}
              <div className="border-b border-[#1a1a1a] p-3 flex justify-between items-center">
                <span className="text-xs font-mono text-white">Chat with: {recipientId}</span>
                <span className="text-[10px] text-emerald-400 font-mono">● online</span>
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[360px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#555] text-center my-12">No messages yet. Send the first message.</p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.fromId === currentUserId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] p-3 text-xs border ${
                            isMe
                              ? 'bg-[#111] border-[#222] text-[#ccc]'
                              : 'bg-[#080808] border-[#1a1a1a] text-[#aaa]'
                          }`}
                        >
                          {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                          {m.fileName && (
                            <div className="mt-2 pt-2 border-t border-[#222] flex items-center justify-between gap-3">
                              <span className="font-mono text-[10px] text-white truncate max-w-[150px]">
                                📄 {m.fileName}
                              </span>
                              {m.fileContent && (
                                <button
                                  onClick={() => downloadFile(m.fileName!, m.fileContent!)}
                                  className="text-[10px] border border-[#333] px-2 py-0.5 text-[#888] hover:text-white"
                                >
                                  download
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-[9px] text-[#444] mt-1 text-right">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="border-t border-[#1a1a1a] p-3 space-y-2">
                {fileAttachment && (
                  <div className="flex justify-between items-center text-[10px] border border-[#222] bg-[#111] px-2 py-1">
                    <span className="text-white font-mono truncate">Attached: {fileAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setFileAttachment(null)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      remove
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder="Type encrypted message..."
                    className="flex-1 text-xs"
                  />
                  <label className="border border-[#333] px-3 py-1.5 text-xs text-[#888] hover:text-white hover:border-[#555] cursor-pointer flex items-center">
                    <span>.md</span>
                    <input
                      type="file"
                      accept=".md,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setFileAttachment({ name: file.name, content: String(reader.result || '') });
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                  <button type="submit" className="primary px-4">
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#555]">
              Select a conversation or enter a 15-character ID above to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-xs text-[#555]">Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
