# Frontend UI/UX Specification — AI Realty Video SaaS

**Phiên bản:** 1.0.0 — Bản hướng dẫn tích hợp giao diện người dùng & Hướng phát triển Frontend
**Cập nhật:** 2026-06-07

---

## 1. Tổng Quan & Công Nghệ Core

Ứng dụng web dành cho người dùng được đặt tại thư mục [apps/web](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/apps/web) trong cấu trúc Monorepo.

- **Framework chính:** Next.js 14 (App Router)
- **CSS Framework:** Tailwind CSS (v3) + PostCSS
- **Ngôn ngữ:** TypeScript
- **Bảng màu thiết kế chủ đạo (Color Palette):**
  - Nền tối mặc định (Dark Mode): `slate-950` (`#020617`) và `slate-900` (`#0f172a`).
  - Màu sắc chủ đạo AI (Brand Accent): Tím neon (`purple-600`/`purple-500`) và Xanh dương (`blue-600`/`blue-500`) dưới dạng gradient chuyển động để tăng tính hiện đại, cao cấp.
  - Typography: Sử dụng font sans-serif hệ thống mặc định (Arial, Helvetica) kết hợp các font chữ bo tròn nhẹ để tạo giao diện hiện đại.

---

## 2. Cảm Hứng Thiết Kế Từ Giao Diện Pictory (UI/UX Inspiration)

Để tối ưu hóa trải nghiệm tạo video, giao diện được thiết kế dựa trên các nghiên cứu UX tốt nhất từ Pictory nhưng được tinh chỉnh và nâng cấp hiện đại hơn.

### A. Giao diện Đăng nhập (Authentication)

- **Bố cục chia đôi (Split Screen):**
  - **Trái (Brand Panel):** Chiếm 40-50% chiều ngang, sử dụng màu tím-xanh gradient đậm chất công nghệ AI. Hiển thị slogan xúc tích, hình ảnh mô tả cơ chế chuyển đổi hình ảnh/video thô thành video chuyên nghiệp và thanh trượt tính năng giới thiệu sản phẩm.
  - **Phải (Form Panel):** Nền tối tối giản, căn giữa biểu mẫu đăng nhập.
- **Thành phần biểu mẫu:**
  - Hỗ trợ Social Login nhanh (**Continue with Google**).
  - Inputs: Email & Mật khẩu được bo góc mềm mại, có nút hiện/ẩn mật khẩu.
  - Hệ thống cảnh báo lỗi (Validation error state): Đổi màu viền input sang màu đỏ và hiển thị text cảnh báo rõ ràng khi nhập thiếu hoặc sai định dạng email.

### B. Bố cục Workspace / Dashboard chính

- **Thanh điều hướng bên trái (Sidebar):**
  - Logo thương hiệu nổi bật trên cùng.
  - Profile cá nhân hiển thị trạng thái gói đăng ký (ví dụ: _Free_, _Pro_, _Expired_).
  - Menu dọc: **Trang chủ (Home)**, **Dự án (Projects)**, **Thư viện mẫu (Templates)**, **Hóa đơn & Ví (Billing)**.
- **Vùng làm việc trung tâm (Main Workspace Area):**
  - **Lời chào cá nhân hóa:** _"Hôm nay bạn muốn dựng video BĐS nào, [Tên User]?"_
  - **Tạo nhanh bằng Prompt (Start with an idea):** Một ô nhập liệu văn bản lớn (Textarea) ở trung tâm cho phép người dùng nhập mô tả ngắn của dự án BĐS (ví dụ: _"Dựng video TikTok 1 phút giới thiệu căn Penthouse view sông..."_) đi kèm nút hành động nổi bật để kích hoạt AI tạo kịch bản ngay lập tức.
  - **Bộ thẻ công cụ (Or start with a tool):**
    - **Images to Video (Tạo từ ảnh):** Tải ảnh căn hộ lên để AI tự ghép thành video thuyết minh.
    - **Raw Video to Reels (Cắt/Dựng từ video thô):** Tải lên các clip quay thô để AI biên tập lại.
    - **Article/URL to Video (Dán link bài viết):** Dán link bài báo hoặc link tin đăng BĐS để AI tự chuyển đổi.
  - **Dự án gần đây (Recent projects):** Dạng lưới (Grid) hiển thị các video đang xử lý hoặc đã hoàn thành, có thumbnail trực quan, trạng thái xử lý (Queued, Processing, Completed) và nút download nhanh.

---

## 3. Bản Đồ Các Giao Diện Cần Xây Dựng (Frontend App Screens)

```
[Khách vãng lai] ──► / (Landing Page giới thiệu)
                         │
                         ├──► /sign-in (Đăng nhập)
                         └──► /sign-up (Đăng ký)
                               │
                               ▼
                        /dashboard (Bố cục Sidebar cố định)
                               │
      ┌────────────────────────┼────────────────────────┐
      ▼                        ▼                        ▼
/dashboard (Home)      /dashboard/projects     /dashboard/billing
- Nhập Prompt tạo nhanh  - Danh sách dự án       - Quản lý gói cước
- Chọn công cụ upload   - Xem trạng thái video   - Mua thêm lượt render
- Lưới dự án gần đây                             - Nút thanh toán PayOS
      │
      └───────► /dashboard/projects/[id]/create-wizard (Quy trình 2 Phase)
```

---

## 4. Chi Tiết Quy Trình Tạo Video 2 Giai Đoạn (Create Wizard Flow)

Quy trình này tương ứng với kiến trúc pipeline của backend, chia nhỏ thao tác của người dùng thành 2 giai đoạn để tránh lãng phí token render:

### Phase 1: Tạo & Duyệt Kịch Bản (Script Draft Review)

1. **Màn hình Upload & Input:**
   - Người dùng tải lên ảnh/video (tối đa 15 assets) qua giao diện Kéo-Thả (Drag & Drop).
   - Nhập thông tin phụ trợ (Tên dự án, giá bán, địa chỉ, ưu điểm nổi bật).
   - Chọn giọng đọc (FPT.AI miền Bắc/Trung/Nam) và mẫu nhạc nền.
   - Click **"Tạo kịch bản nháp"** (Quá trình này nhanh, khoảng 30-60s, không tốn chi phí render).
2. **Màn hình Duyệt Kịch Bản (Script Editor):**
   - Hiển thị danh sách các Scene (phân cảnh) do AI sinh ra.
   - Mỗi phân cảnh bao gồm:
     - Hình ảnh/Video tương ứng sẽ hiển thị.
     - Đoạn thoại AI viết sẵn (Narration) -> Người dùng có thể chỉnh sửa lại text này trực tiếp.
     - Dòng phụ đề (Subtitles) tương ứng.
   - Người dùng có thể kéo thả để thay đổi vị trí ảnh giữa các scene hoặc sửa lại lời thoại.

### Phase 2: Xác Nhận Render & Xuất Bản Video (Video Rendering)

1. Sau khi ưng ý với kịch bản nháp, người dùng click nút **"Xác nhận dựng Video"**.
2. Hệ thống sẽ hiển thị hộp thoại cảnh báo: _"Thao tác này sẽ khấu trừ 1 lượt tạo video của bạn"_.
3. **Màn hình Chờ Render (Render Progress Screen):**
   - Hiển thị trạng thái tiến trình thời gian thực dưới dạng thanh tiến trình (Progress Bar) chạy qua các bước:
     1. _Sinh giọng nói nhân tạo (TTS)..._
     2. _Cắt ghép và đồng bộ hóa timeline..._
     3. _Chèn phụ đề & hiệu ứng overlay..._
     4. _Xuất bản video hoàn thành..._
4. **Màn hình Kết Quả (Success Screen):**
   - Trình phát video (Video Player) dạng dọc (tỷ lệ 9:16) để preview video thành phẩm.
   - Nút tải video chất lượng cao (`.mp4`) và nút chia sẻ.
   - Cung cấp phần văn bản copy sẵn gồm mô tả bài đăng (caption) và hashtag do AI gợi ý để người dùng dán trực tiếp lên TikTok/Facebook Reels.

---

## 5. Tích Hợp API (API Integration Guidelines)

Tất cả các lời gọi API từ `apps/web` sẽ trỏ tới route tương ứng của `main-api` hoặc qua Next.js Route Handlers.

### A. Tải Lên Phương Tiện (Media Upload Flow)

- **File < 10MB:** Gửi trực tiếp qua request `multipart/form-data` tới `POST /api/projects/:id/media`.
- **File > 10MB (Video thô):**
  1. Gửi request lấy URL tải lên được ký trước: `GET /api/media/presigned-url?filename=abc.mp4&mimeType=video/mp4`.
  2. Client sử dụng URL này để thực hiện một HTTP `PUT` request trực tiếp lên Cloudflare R2 để tăng tốc độ upload và tránh làm quá tải máy chủ API.
  3. Sau khi tải lên thành công, gọi `POST /api/media/confirm-upload` để lưu thông tin asset vào Database.

### B. Theo Dõi Tiến Trình Render (Polling / Server-Sent Events)

- Để cập nhật tiến trình render video, Client sẽ thực hiện cơ chế Polling ngắn (short-polling) gửi request `GET /api/video-jobs/:id/status` định kỳ **mỗi 3 giây** cho đến khi nhận được trạng thái `COMPLETED` hoặc `FAILED`.
- Nếu trạng thái trả về là `FAILED`, hãy hiển thị thông báo lỗi thân thiện kèm việc xác nhận token đã được tự động hoàn lại vào tài khoản người dùng.
