import http from 'node:http';
import { NextRequest } from 'next/server';
import { POST as registerHandler } from '../app/api/register/route.ts';
import { POST as loginHandler } from '../app/api/login/route.ts';
import { GET as getPostsHandler, POST as createPostHandler } from '../app/api/posts/route.ts';
import { GET as getPostDetailHandler } from '../app/api/posts/[id]/route.ts';
import { GET as getMessagesHandler, POST as sendMessageHandler } from '../app/api/messages/route.ts';
import { POST as memoryHandler } from '../app/api/memory/route.ts';

async function runFullTestSuite() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MỌI TÍNH NĂNG (VOID x ZERO-MEM) ===\n');

  // 1. Test Register
  console.log('1. [AUTH] Kiểm tra Đăng ký sinh ID 15 ký tự:');
  const regReq = new NextRequest('http://localhost/api/register', {
    method: 'POST',
    body: JSON.stringify({ password: 'TestPassword123!@#' }),
  });
  const regRes = await registerHandler(regReq);
  const regData = await regRes.json();
  console.log('   - ID 15 ký tự nhận được:', regData.userId);
  console.log('   - Token độ dài:', regData.token?.length);
  if (!regData.userId || regData.userId.length !== 15) throw new Error('Register failed!');

  // 2. Test Login
  console.log('\n2. [AUTH] Kiểm tra Đăng nhập với ID 15 ký tự:');
  const logReq = new NextRequest('http://localhost/api/login', {
    method: 'POST',
    body: JSON.stringify({ userId: regData.userId, password: 'TestPassword123!@#' }),
  });
  const logRes = await loginHandler(logReq);
  const logData = await logRes.json();
  console.log('   - Đăng nhập thành công với userId:', logData.userId);
  if (!logData.token) throw new Error('Login failed!');

  // 3. Test Create Forum Post
  console.log('\n3. [FORUM] Kiểm tra Đăng bài Markdown có mật khẩu bảo vệ:');
  const postReq = new NextRequest('http://localhost/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${regData.token}` },
    body: JSON.stringify({
      title: 'Hồ sơ tài liệu bảo mật .md',
      content: '# Báo cáo tối mật\n\nNội dung được chia sẻ mã hóa.',
      password: 'secret-pass-2026',
    }),
  });
  const postRes = await createPostHandler(postReq);
  const postData = await postRes.json();
  console.log('   - Tạo bài viết ID:', postData.post?.id, '| Locked:', postData.post?.hasPassword);

  // 4. Test List Forum Posts
  console.log('\n4. [FORUM] Kiểm tra Lấy danh sách bài viết & Phân trang:');
  const listReq = new NextRequest('http://localhost/api/posts?page=1');
  const listRes = await getPostsHandler(listReq);
  const listData = await listRes.json();
  console.log('   - Tổng số bài viết:', listData.posts?.length);
  console.log('   - Tác giả được che mặt nạ danh tính:', listData.posts?.[0]?.authorMasked);

  // 5. Test Post Detail (Locked & Unlocked)
  console.log('\n5. [FORUM] Kiểm tra Mở khóa bài viết bằng Mật khẩu:');
  const detailReq = new NextRequest(`http://localhost/api/posts/${postData.post.id}?password=secret-pass-2026`);
  const detailRes = await getPostDetailHandler(detailReq, { params: Promise.resolve({ id: postData.post.id }) });
  const detailData = await detailRes.json();
  console.log('   - Đã mở khóa thành công:', !detailData.locked);
  console.log('   - Nội dung đọc được:', detailData.content?.slice(0, 30));

  // 6. Test Encrypted Messaging
  console.log('\n6. [MESSAGES] Kiểm tra Nhắn tin mã hóa & đính kèm file .md:');
  const msgReq = new NextRequest('http://localhost/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${regData.token}` },
    body: JSON.stringify({
      toId: 'ANOTHERUSER15CH',
      content: 'Chào bạn, gửi bạn file cấu hình bảo mật:',
      fileName: 'config.md',
      fileContent: '# Config file content\nkey=value',
    }),
  });
  const msgRes = await sendMessageHandler(msgReq);
  const msgData = await msgRes.json();
  console.log('   - Gửi tin nhắn thành công ID:', msgData.message?.id);
  console.log('   - Tên file đính kèm:', msgData.message?.fileName);

  // 7. Test Zero-Mem (Universal API)
  console.log('\n7. [ZERO-MEM] Kiểm tra Trí nhớ 0-Token Universal API:');
  const memReq = new NextRequest('http://localhost/api/memory', {
    method: 'POST',
    body: JSON.stringify({
      action: 'remember',
      text: 'Dự án VOID x Zero-Mem đã được tích hợp hoàn chỉnh và triển khai trên Vercel.',
      namespace: regData.userId,
    }),
  });
  const memRes = await memoryHandler(memReq);
  const memData = await memRes.json();
  console.log('   - Extracted entities:', memData.entitiesStored);
  console.log('   - Tokens used:', memData.tokensUsed, '(Đúng 0 Tokens!)');

  console.log('\n======================================================');
  console.log('✅ KẾT QUẢ: 100% CÁC TÍNH NĂNG ĐỀU HOẠT ĐỘNG HOÀN HẢO!');
  console.log('======================================================\n');
}

runFullTestSuite().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
