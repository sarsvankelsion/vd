'use client';

import { useState } from 'react';

export default function McpGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const configs = [
    {
      step: '01',
      title: 'REST API & cURL (Universal cho fx, fx.sh, Bash, CLI)',
      desc: 'Bất kỳ script shell, tool CLI (như fx) hay terminal nào đều có thể gửi và nhận trí nhớ trong 1 dòng lệnh.',
      code: `# 1. Lưu thông tin mới (0 Token)
curl -X POST http://localhost:3000/api/memory \\
  -H "Content-Type: application/json" \\
  -d '{"action": "remember", "text": "Dự án này dùng Next.js 15 và Tailwind", "namespace": "my-project"}'

# 2. Tra cứu ngữ cảnh liên quan (< 1ms)
curl -X POST http://localhost:3000/api/memory \\
  -H "Content-Type: application/json" \\
  -d '{"action": "recall", "query": "stack của dự án", "namespace": "my-project"}'`,
    },
    {
      step: '02',
      title: 'Universal MCP Config (Cursor, Claude Code, Windsurf, OpenCode, Cline)',
      desc: 'Cấu hình Model Context Protocol chuẩn quốc tế dùng cho mọi AI Code Editor.',
      code: `{
  "mcpServers": {
    "zero-mem": {
      "command": "node",
      "args": [
        "--experimental-strip-types",
        "C:\\\\Users\\\\Admin\\\\.openclaw-autoclaw\\\\workspace\\\\zero-mem-agent\\\\mcp-server\\\\index.ts"
      ],
      "env": {
        "ZERO_MEM_NAMESPACE": "default"
      }
    }
  }
}`,
    },
    {
      step: '03',
      title: 'Python Integration (LangChain, LlamaIndex, Custom Agents)',
      desc: 'Chèn vào bất kỳ AI Agent Python nào để cấp phát bộ nhớ Zero-Token.',
      code: `import requests

API_URL = "http://localhost:3000/api/memory"

def remember(text: str, namespace="default"):
    return requests.post(API_URL, json={"action": "remember", "text": text, "namespace": namespace}).json()

def recall(query: str, namespace="default"):
    res = requests.post(API_URL, json={"action": "recall", "query": query, "namespace": namespace}).json()
    return [item["value"] for item in res.get("relevant", [])]

# Sử dụng:
remember("Tôi vừa đổi sang dùng Supabase")
context = recall("database")
print("Context nạp vào LLM:", context)`,
    },
    {
      step: '04',
      title: 'Node.js / TypeScript Integration',
      desc: 'Tích hợp vào backend hoặc bot Node.js/Next.js khác.',
      code: `async function zeroMem(action: 'remember' | 'recall', payload: string, namespace = 'default') {
  const body = action === 'remember' ? { action, text: payload, namespace } : { action, query: payload, namespace };
  const res = await fetch('http://localhost:3000/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#1a1a1a] pb-4">
        <p className="text-xs text-[#555] mb-1 uppercase tracking-[0.2em]">03 / UNIVERSAL INTEGRATION</p>
        <h2 className="text-lg font-medium tracking-tight text-white">Kết nối mọi AI Agent (Universal)</h2>
        <p className="text-xs text-[#666] mt-0.5">
          Zero-Mem là lớp bộ nhớ phổ quát (Universal Memory Hub). Bạn có thể kết nối từ <strong className="text-[#aaa]">fx.sh</strong>, <strong className="text-[#aaa]">curl</strong>, <strong className="text-[#aaa]">MCP Editor</strong>, hoặc <strong className="text-[#aaa]">Python/Node scripts</strong>.
        </p>
      </div>

      <div className="space-y-px">
        {configs.map((cfg, idx) => (
          <div key={idx} className={`border border-[#1a1a1a] p-5 bg-[#050505] ${idx > 0 ? 'border-t-0' : ''}`}>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[#555] font-mono">{cfg.step}</span>
                <h3 className="text-sm font-medium text-[#ccc]">{cfg.title}</h3>
              </div>
              <button
                onClick={() => handleCopy(cfg.code, idx)}
                className="border border-[#333] px-2.5 py-1 text-[11px] text-[#888] hover:text-white hover:border-[#666] transition-all"
              >
                {copiedIndex === idx ? 'Đã copy' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-[#666] mb-3">{cfg.desc}</p>
            <pre className="border border-[#1a1a1a] bg-[#0a0a0a] p-3 text-[11px] font-mono text-[#aaa] overflow-x-auto">
              <code>{cfg.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
