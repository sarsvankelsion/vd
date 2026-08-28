# Zero-Mem persistent memory (chép đoạn này vào AGENTS.md của project bạn muốn agent có trí nhớ)

## Trí nhớ dài hạn (MCP `zero-mem`)

Bạn có trí nhớ dai dẳng giữa các phiên qua MCP server `zero-mem`. Ưu tiên dùng nó
THAY VÌ ghi MEMORY.md / auto-memory mặc định (dễ lỗi, bị nén mất dữ liệu).

**Đầu mỗi phiên, trước khi làm task:**

- Gọi `zm_recall` với từ khóa của task để lấy background đã biết
  (stack, quyết định, ràng buộc, sở thích user, quirk môi trường).
- Task lớn → gọi `zm_context_block` với mô tả task để nhận cả block context
  nén sẵn, coi đó là background knowledge.

**Trong khi làm việc, ngay khi biết một sự thật dai dẳng, gọi `zm_remember` với câu gốc**, ví dụ:

- Quyết định stack: "dự án chuyển sang dùng Drizzle ORM thay Prisma"
- Sở thích user: "user thích commit nhỏ, message tiếng Anh"
- Ràng buộc: "KHÔNG được upgrade Tailwind lên v4"
- Quirk môi trường: "Windows, phải dùng pnpm thay npm"

**Quy tắc:**

- Ưu tiên `zm_remember` thay vì tự ghi file ghi chú; hệ thống tự khử trùng lặp
  và giải quyết xung đột (thông tin mới hơn thắng — latest-wins).
- Khi phát hiện thông tin cũ SAI, gọi `zm_remember` với câu đính chính (hệ thống
  tự ghi đè), hoặc `zm_update` nếu biết tên entity.
- Không nhắc lại facts đã nhớ trong câu trả lời trừ khi liên quan.
- User nói "nhớ điều này" / "from now on..." → gọi `zm_remember`.
- User muốn quên → `zm_forget` với tên entity (tìm tên bằng `zm_list`).
