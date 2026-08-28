'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          password: hasPassword ? password : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/forum');
      } else {
        setError(data.error || 'Failed to create post');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10 max-w-2xl">
      <h1 className="text-sm font-medium text-white mb-1">New Post</h1>
      <p className="text-xs text-[#555] mb-8">Upload a .md file or write markdown directly.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-[#555] block mb-1">title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="post title"
            required
          />
        </div>

        <div>
          <label className="text-xs text-[#555] block mb-1">upload .md file</label>
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (!title) setTitle(file.name.replace(/\.md$/i, ''));
                const reader = new FileReader();
                reader.onload = () => setContent(String(reader.result || ''));
                reader.readAsText(file);
              }
            }}
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#333] file:bg-[#111] file:text-[#888] file:font-mono file:text-xs file:cursor-pointer hover:file:text-white hover:file:border-[#555]"
          />
        </div>

        <div>
          <label className="text-xs text-[#555] block mb-1">content (markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="# your markdown here..."
            required
            className="font-mono resize-y"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasPassword}
              onChange={(e) => setHasPassword(e.target.checked)}
              className="accent-white"
            />
            <span className="text-xs text-[#888]">password protect this post</span>
          </label>
          {hasPassword && (
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="set password for viewers"
              className="mt-2"
              required={hasPassword}
            />
          )}
        </div>

        {error && <p className="text-xs text-[#aa3333]">{error}</p>}

        <button type="submit" disabled={loading} className="primary cursor-pointer">
          {loading ? 'posting...' : 'publish'}
        </button>
      </form>
    </div>
  );
}
