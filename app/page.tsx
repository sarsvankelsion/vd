import Link from 'next/link';

export default function Home() {
  return (
    <div className="py-20">
      <div className="mb-16">
        <h1 className="text-2xl font-medium tracking-tight text-white mb-3">void</h1>
        <p className="text-[#555] text-sm max-w-md leading-relaxed">
          Anonymous forum. No names, no traces. Share markdown files, send encrypted messages. Your identity is a 15-character code.
        </p>
      </div>

      <div className="space-y-px">
        <div className="border border-[#1a1a1a] p-5">
          <p className="text-xs text-[#555] mb-1">01</p>
          <p className="text-sm text-[#ccc]">Register with a password. Receive a random 15-char ID.</p>
        </div>
        <div className="border border-[#1a1a1a] border-t-0 p-5">
          <p className="text-xs text-[#555] mb-1">02</p>
          <p className="text-sm text-[#ccc]">Post markdown files to the forum. Optional password protection.</p>
        </div>
        <div className="border border-[#1a1a1a] border-t-0 p-5">
          <p className="text-xs text-[#555] mb-1">03</p>
          <p className="text-sm text-[#ccc]">Message anyone by their ID. Identity partially masked in chat.</p>
        </div>
        <div className="border border-[#1a1a1a] border-t-0 p-5">
          <p className="text-xs text-[#555] mb-1">04</p>
          <p className="text-sm text-[#ccc]">Share .md files directly in private messages.</p>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/register"
          className="inline-block bg-white text-black text-xs font-medium px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="inline-block border border-[#333] text-xs px-5 py-2.5 text-[#888] hover:text-white hover:border-[#555] transition-all"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
