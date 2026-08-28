'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PostDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [post, setPost] = useState<any>(null);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPost = async (pwd?: string) => {
    try {
      const url = pwd ? `/api/posts/${id}?password=${encodeURIComponent(pwd)}` : `/api/posts/${id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPost(data);
        if (data.locked && pwd) {
          setError('Incorrect password');
        } else {
          setError('');
        }
      } else {
        setError(data.error || 'Post not found');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPost();
  }, [id]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPost(passwordAttempt);
  };

  const handleDownloadMd = () => {
    if (!post?.content) return;
    const blob = new Blob([post.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.title || 'post'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-20 text-xs text-[#555]">loading post...</div>;
  if (!post) return <div className="py-20 text-xs text-[#aa3333]">{error || 'Post not found.'}</div>;

  return (
    <div className="py-10 max-w-3xl">
      <div className="mb-6 flex items-center justify-between border-b border-[#1a1a1a] pb-4">
        <div>
          <Link href="/forum" className="text-xs text-[#555] hover:text-[#888] mb-2 inline-block">
            ← back to forum
          </Link>
          <h1 className="text-lg font-medium text-white">{post.title}</h1>
          <p className="text-xs text-[#555] font-mono mt-1">
            author: {post.authorMasked} · {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
        {!post.locked && (
          <button
            onClick={handleDownloadMd}
            className="text-xs border border-[#333] px-3 py-1.5 text-[#888] hover:text-white hover:border-[#555] transition cursor-pointer"
          >
            download .md
          </button>
        )}
      </div>

      {post.locked ? (
        <div className="border border-[#1a1a1a] p-8 max-w-md bg-[#080808]">
          <p className="text-xs text-[#555] mb-1 font-mono uppercase">locked post</p>
          <h2 className="text-sm font-medium text-white mb-4">Enter password to view content</h2>
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={passwordAttempt}
              onChange={(e) => setPasswordAttempt(e.target.value)}
              placeholder="password"
              required
            />
            {error && <p className="text-xs text-[#aa3333]">{error}</p>}
            <button type="submit" className="primary w-full cursor-pointer">
              unlock
            </button>
          </form>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] p-6 bg-[#050505]">
          <pre className="font-mono text-xs text-[#ccc] whitespace-pre-wrap leading-relaxed">
            {post.content}
          </pre>
        </div>
      )}
    </div>
  );
}
