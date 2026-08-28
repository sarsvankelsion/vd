'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PostItem {
  id: string;
  title: string;
  preview: string;
  authorId: string;
  authorMasked: string;
  hasPassword: boolean;
  createdAt: number;
}

export default function Forum() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setIsAuth(Boolean(localStorage.getItem('token')));
    loadPosts(1);
  }, []);

  const loadPosts = async (p: number) => {
    try {
      const res = await fetch(`/api/posts?page=${p}`);
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  if (!loading && !isAuth) {
    return (
      <div className="py-10 relative">
        <h1 className="text-sm font-medium text-white mb-6">Forum</h1>
        <div className="space-y-2 filter blur-sm select-none pointer-events-none">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-[#1a1a1a] p-4">
              <div className="h-3 bg-[#111] w-2/3 mb-2 rounded-sm" />
              <div className="h-2 bg-[#0a0a0a] w-1/2 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="blur-overlay">
          <div className="text-center">
            <p className="text-sm text-white mb-2">login required</p>
            <p className="text-xs text-[#555] mb-6">you need an account to view the forum.</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="text-xs bg-white text-black px-5 py-2 hover:opacity-90 inline-block font-medium"
              >
                login
              </Link>
              <Link
                href="/register"
                className="text-xs border border-[#333] px-5 py-2 text-[#888] hover:text-white hover:border-[#555] inline-block"
              >
                register
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm font-medium text-white">Forum</h1>
        <Link
          href="/forum/new"
          className="text-xs border border-[#333] px-3 py-1.5 text-[#888] hover:text-white hover:border-[#555] transition-all"
        >
          + new post
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-[#555]">loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-xs text-[#555]">No posts yet.</p>
      ) : (
        <>
          <div className="border border-[#1a1a1a]">
            {posts.map((post, idx) => (
              <div
                key={post.id}
                className={`p-4 hover:bg-[#0a0a0a] transition-colors ${
                  idx > 0 ? 'border-t border-[#1a1a1a]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/forum/post/${post.id}`} className="min-w-0 flex-1 block">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white">{post.title}</span>
                      {post.hasPassword && (
                        <span className="text-[10px] text-[#555] border border-[#1a1a1a] px-1.5 py-0.5 font-mono">
                          locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#555] truncate">{post.preview}</p>
                  </Link>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-[10px] text-[#555] font-mono">{post.authorMasked}</p>
                    <p className="text-[10px] text-[#333]">{timeAgo(post.createdAt)}</p>
                    <Link
                      href={`/messages?to=${post.authorId || ''}`}
                      className="text-[10px] text-[#444] hover:text-[#888] transition-colors mt-1 font-mono"
                      title="message author"
                    >
                      [msg]
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <button
                onClick={() => loadPosts(page - 1)}
                disabled={page <= 1}
                className="page-btn cursor-pointer"
              >
                prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => loadPosts(p)}
                  className={`page-btn cursor-pointer ${p === page ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => loadPosts(page + 1)}
                disabled={page >= totalPages}
                className="page-btn cursor-pointer"
              >
                next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
