import Link from 'next/link';

export default function Home() {
  return (
    <div className="py-20 max-w-2xl">
      <div className="mb-14 space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-[#1a1a1a] bg-[#0a0a0a] text-[11px] font-mono text-[#888]">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span>DEVELOPER PLATFORM // TECHNICAL DOCS & AI AGENT ENGINE</span>
        </div>

        <h1 className="text-2xl font-medium tracking-tight text-white">void</h1>
        <p className="text-[#888] text-xs max-w-lg leading-relaxed">
          Open-source developer platform for technical markdown documentation, code snippet exchange, and the{' '}
          <span className="text-white font-medium">Zero-Mem</span> client-side persistent memory architecture for AI Agents.
        </p>
      </div>

      <div className="space-y-px">
        <div className="border border-[#1a1a1a] p-5 bg-[#080808]">
          <p className="text-xs text-[#555] mb-1 font-mono">01 // ANONYMOUS DEV IDENTITY</p>
          <p className="text-xs text-[#ccc]">Register with a password. Receive a random 15-character developer identifier.</p>
        </div>

        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#080808]">
          <p className="text-xs text-[#555] mb-1 font-mono">02 // TECHNICAL MARKDOWN FORUM</p>
          <p className="text-xs text-[#ccc]">
            Publish software architecture RFCs, code specs, and .md documentation with optional password protection.
          </p>
        </div>

        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#080808]">
          <p className="text-xs text-[#555] mb-1 font-mono">03 // DEVELOPER P2P MESSAGING</p>
          <p className="text-xs text-[#ccc]">
            Message fellow engineers directly by ID. Send encrypted technical files and configuration attachments.
          </p>
        </div>

        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#080808]">
          <p className="text-xs text-[#555] mb-1 font-mono">04 // ZERO-MEM ENGINE FOR AI AGENTS</p>
          <p className="text-xs text-[#ccc]">
            Deterministic 0-token client RAM memory architecture for AI Agents and LLMs, featuring full MCP Server and REST API integration.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/forum"
          className="inline-block bg-white text-black text-xs font-medium px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          Explore Forum
        </Link>
        <Link
          href="/zero-mem"
          className="inline-block border border-[#333] text-xs px-5 py-2.5 text-[#ccc] hover:text-white hover:border-[#666] transition-all bg-[#0a0a0a] font-mono"
        >
          Zero-Mem Engine &rarr;
        </Link>
        <Link
          href="/register"
          className="inline-block border border-[#222] text-xs px-5 py-2.5 text-[#888] hover:text-white hover:border-[#444] transition-all"
        >
          Register ID
        </Link>
      </div>
    </div>
  );
}
