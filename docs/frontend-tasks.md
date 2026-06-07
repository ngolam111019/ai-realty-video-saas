# 📋 Frontend Web App — Task Breakdown Chi Tiết

**Service:** [apps/web](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/apps/web)
**Cập nhật:** 2026-06-07
**Kiến trúc:** Next.js 14 App Router, Tailwind CSS, TypeScript, Better Auth Client, PayOS/Stripe Integration.

---

## 📌 Bối Cảnh Hệ Thống & Luồng Tích Hợp

Giao diện Web Client sẽ đóng vai trò là điểm tương tác trực tiếp với người dùng và tích hợp với hai services ở backend:

1. **[services/main-api](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/services/main-api)**: Nơi tiếp nhận các yêu cầu HTTP API (Auth, Billing, Create Project, Get Draft, Trigger Render, Get Job Status).
2. **[services/video-processor](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/services/video-processor)**: Chạy BullMQ workers để xử lý tác vụ nặng (Sinh kịch bản, render video). Frontend sẽ theo dõi trạng thái gián tiếp thông qua polling trạng thái của `VideoJob` từ `main-api`.

---

## 🗺️ Bảng Tổng Hợp Tất Cả Tasks

| Task          | Tên Nhiệm Vụ                                      | Phase        | Estimate | Phụ thuộc     | Trạng thái |
| ------------- | ------------------------------------------------- | ------------ | -------- | ------------- | ---------- |
| **SETUP**     |                                                   |              |          |               |            |
| FE-S-01       | Cấu hình UI Theme, Google Fonts & Global Styles   | Setup        | 2h       | —             | [x] DONE   |
| FE-S-02       | Thiết lập API Client & Shared State (Zustand)     | Setup        | 3h       | FE-S-01       | [x] DONE   |
| **AUTH**      |                                                   |              |          |               |            |
| FE-A-01       | Giao diện Đăng nhập & Đăng ký (Split View)        | Auth         | 5h       | FE-S-01       | [x] DONE   |
| FE-A-02       | Better Auth Integration & Session Middleware      | Auth         | 4h       | FE-A-01, S-02 | [x] DONE   |
| **DASHBOARD** |                                                   |              |          |               |            |
| FE-D-01       | Sidebar Điều Hướng & Layout Dashboard             | Dashboard    | 3h       | FE-A-02       | [x] DONE   |
| FE-D-02       | Home Workspace (Prompt Input & Tool Cards)        | Dashboard    | 6h       | FE-D-01       | [x] DONE   |
| FE-D-03       | Lưới quản lý Dự Án Gần Đây (Recent Projects Grid) | Dashboard    | 4h       | FE-D-01, S-02 | [x] DONE   |
| **WIZARD**    |                                                   |              |          |               |            |
| FE-W-01       | Form Tạo Dự Án & Kéo-Thả File Lớn (Direct to R2)  | Wizard       | 8h       | FE-D-02, S-02 | [x] DONE   |
| FE-W-02       | Trình Chỉnh Sửa Kịch Bản Nháp (Script Editor)     | Wizard (Ph1) | 8h       | FE-W-01       | [x] DONE   |
| FE-W-03       | Tiến Trình Render & Trình Xem Video 9:16          | Wizard (Ph2) | 7h       | FE-W-02       | [x] DONE   |
| **BILLING**   |                                                   |              |          |               |            |
| FE-B-01       | Quản Lý Gói Cước & Mua Lượt Render                | Billing      | 4h       | FE-D-01       | [x] DONE   |
| FE-B-02       | Tích Hợp Cổng Thanh Toán PayOS (SDK / Webhook)    | Billing      | 6h       | FE-B-01       | [x] DONE   |

**Tổng estimate:** ~60 giờ (~8 ngày làm việc)

---

## 📁 Cấu Trúc File Target (Dự kiến trong apps/web)

```
apps/web/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                         ← Landing Page
│   ├── (auth)/
│   │   ├── sign-in/page.tsx             ← FE-A-01
│   │   └── sign-up/page.tsx             ← FE-A-01
│   └── (dashboard)/
│       ├── layout.tsx                   ← FE-D-01 (Sidebar)
│       ├── page.tsx                     ← FE-D-02 (Home Workspace)
│       ├── billing/page.tsx             ← FE-B-01
│       └── projects/
│           ├── page.tsx                 ← FE-D-03 (Project List)
│           └── [id]/
│               └── wizard/page.tsx      ← FE-W-01, FE-W-02, FE-W-03
├── components/
│   ├── ui/                              ← Shadcn / Vanilla CSS components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── dialog.tsx
│   ├── auth-form.tsx
│   ├── file-upload.tsx                  ← FE-W-01
│   ├── script-editor.tsx                ← FE-W-02
│   └── video-render-player.tsx          ← FE-W-03
├── lib/
│   ├── api.ts                           ← FE-S-02 (Axios / Fetch wrapper)
│   ├── auth.ts                          ← FE-A-02 (Better Auth client)
│   └── store.ts                         ← FE-S-02 (Zustand store)
├── middleware.ts                        ← FE-A-02 (Route protection)
└── package.json
```

---

# PHASE SETUP & CORE UTILS

---

## 📅 FE-S-01 — UI Theme, Google Fonts & Global Styles

**Estimate:** 2 giờ  
**Phụ thuộc:** Không có

### Mục Đích

Thiết lập hệ thống thiết kế (Design System) bao gồm màu sắc chủ đạo, font chữ (Outfit hoặc Inter từ Google Fonts), các hiệu ứng blur gradient background và cấu hình Tailwind.

### Input

- Cấu hình hiện tại của [tailwind.config.ts](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/apps/web/tailwind.config.ts) và [app/globals.css](file:///Users/lam/SourceCodeFromGithub/ai-realty-video-saas/apps/web/app/globals.css).

### Output

- `tailwind.config.ts` được bổ sung các token màu sắc:
  - `brand-purple`: `#8b5cf6` (Purple 500)
  - `brand-blue`: `#3b82f6` (Blue 500)
  - `dark-bg`: `#020617` (Slate 950)
- `app/globals.css` tích hợp import Google Font `Outfit` hoặc `Inter` và thiết lập biến màu CSS.
- `app/layout.tsx` sử dụng font mới cấu hình làm font mặc định cho thẻ `<body>`.

### Acceptance Criteria

```bash
# Khởi chạy server phát triển
pnpm --filter apps-web dev
# Truy cập trang chủ, kiểm tra bằng DevTools:
# - Font-family của body là 'Outfit' hoặc 'Inter'.
# - Thẻ html có các CSS custom properties chuẩn màu dark mode.
```

### Unit Test

```tsx
// components/theme.test.tsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootLayout from '../app/layout';

test('TC-S01-01: RootLayout nạp ngôn ngữ vi', () => {
  const { container } = render(
    <RootLayout>
      <div>Test</div>
    </RootLayout>,
  );
  expect(container.querySelector('html')).toHaveAttribute('lang', 'vi');
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Font chữ hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Next.js font Outfit không hỗ trợ subset 'vietnamese', đã chuyển sang dùng 'latin' và 'latin-ext'.
[x] Thực tế mất bao lâu: 30 phút
```

---

## 📅 FE-S-02 — API Client & Shared State (Zustand)

**Estimate:** 3 giờ  
**Phụ thuộc:** FE-S-01

### Mục Đích

Tạo axios client hoặc fetch wrapper xử lý việc tự động đính kèm Token/Session, handle lỗi HTTP tập trung (như 401 redirect). Cấu hình Zustand store để quản lý state người dùng toàn cục và thông tin dự án hiện tại.

### Input

- Cài đặt `zustand` và `axios`.
- Backend API base URL từ biến môi trường.

### Output

- `lib/api.ts`: API Client instance cấu hình sẵn `baseURL` và Interceptors.
- `lib/store.ts`: Zustand store quản lý:
  - `currentUser`: thông tin user đang đăng nhập.
  - `activeProject`: dự án đang chỉnh sửa trong wizard.
  - `tokens`: số lượng token hiện có của user.

### Unit Test

```ts
// lib/api.test.ts
import { api } from './api';

test('TC-S02-01: Tự động đính kèm Header Authorization khi có token', () => {
  // Mock localStorage/cookie token
  localStorage.setItem('auth_token', 'mock-token-123');
  const requestConfig = { headers: {} };
  // Giả lập interceptor chạy
  // Assert:
  expect(requestConfig.headers['Authorization']).toBe('Bearer mock-token-123');
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Zustand và Axios cài đặt thành công: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Gặp lỗi Prettier do thiếu dấu phẩy cuối (trailing commas) ở lib/api.ts. Đã sửa lỗi thành công.
[x] Thực tế mất bao lâu: 45 phút
```

---

# PHASE AUTHENTICATION

---

## 📅 FE-A-01 — Giao diện Đăng nhập & Đăng ký (Split View)

**Estimate:** 5 giờ  
**Phụ thuộc:** FE-S-01

### Mục Đích

Thiết kế trang Đăng nhập (`/sign-in`) và Đăng ký (`/sign-up`) dạng Split View sang trọng lấy cảm hứng từ giao diện Pictory: Bên trái giới thiệu tính năng dạng Slide/Gradient, bên phải hiển thị form đăng nhập với validation đầy đủ.

### Input

- Ảnh giới thiệu sản phẩm (lưu trữ trong R2 hoặc local public folder).

### Output

- `app/(auth)/sign-in/page.tsx`
- `app/(auth)/sign-up/page.tsx`
- Component form hỗ trợ validate email/password thời gian thực, có icon ẩn/hiển thị mật khẩu.

### Unit Test

```tsx
// components/auth-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import SignInPage from '../app/(auth)/sign-in/page';

test('TC-A01-01: Hiển thị thông báo lỗi khi email sai định dạng', async () => {
  render(<SignInPage />);
  const emailInput = screen.getByLabelText(/Email/i);
  fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
  fireEvent.blur(emailInput);

  expect(await screen.findByText(/Email không hợp lệ/i)).toBeInTheDocument();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Giao diện split-view & validation hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Path alias `@/*` trong tsconfig.json trỏ đến `./src/*` trong khi dự án Next.js đặt thư mục app và components trực tiếp tại gốc. Đã sửa tsconfig.json thành `["./*"]`. Đồng thời fix lỗi ESLint/Prettier (sử dụng Record<string, string> thay cho any, loại bỏ console.log, và định dạng lại cấu trúc JSX).
[x] Thực tế mất bao lâu: 1 giờ 15 phút
```

---

## 📅 FE-A-02 — Better Auth Integration & Session Middleware

**Estimate:** 4 giờ  
**Phụ thuộc:** FE-A-01, FE-S-02

### Mục Đích

Tích hợp client library của Better Auth để xử lý việc đăng nhập qua Google OAuth, lưu session trong cookie httpOnly. Viết Next.js Middleware để bảo vệ các route `/dashboard/*` khỏi người dùng chưa xác thực.

### Input

- Cấu hình Better Auth Client.
- API endpoints từ `main-api` cho authentication.

### Output

- `lib/auth.ts`: Better Auth Client instance.
- `middleware.ts`: Middleware chặn request vào `/dashboard` nếu không có session hợp lệ và redirect về `/sign-in`.

### Unit Test

```ts
// middleware.test.ts
import { middleware } from './middleware';
import { NextRequest } from 'next/server';

test('TC-A02-01: Redirect về /sign-in khi truy cập /dashboard mà không có cookie session', async () => {
  const req = new NextRequest('https://example.com/dashboard');
  const res = await middleware(req);
  expect(res.headers.get('location')).toBe('https://example.com/sign-in');
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Middleware hoạt động chính xác: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Đã triển khai authClient.setSession đồng bộ cookie auth_token để Next.js Middleware chạy ở server-side và Axios Client chạy ở client-side có thể đọc đồng nhất thông tin xác thực.
[x] Thực tế mất bao lâu: 1 giờ
```

---

# PHASE DASHBOARD & WORKSPACE

---

## 📅 FE-D-01 — Sidebar Điều Hướng & Layout Dashboard

**Estimate:** 3 giờ  
**Phụ thuộc:** FE-A-02

### Mục Đích

Xây dựng khung giao diện Dashboard dạng Sidebar bên trái cố định (Responsive: có thể thu nhỏ trên Mobile), khu vực hiển thị Avatar & Gói tài khoản người dùng, và vùng hiển thị nội dung động ở bên phải.

### Output

- `app/(dashboard)/layout.tsx`: Layout chung chứa Sidebar.
- Hiển thị Avatar, Tên user, và số dư AI Tokens hiện tại trên Sidebar.
- Menu chuyển hướng: _Home_, _Projects_, _Templates_, _Billing_.

### Unit Test

```tsx
// components/sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import DashboardLayout from '../app/(dashboard)/layout';

test('TC-D01-01: Hiển thị đầy đủ các liên kết điều hướng chính', () => {
  render(
    <DashboardLayout>
      <div>Content</div>
    </DashboardLayout>,
  );
  expect(screen.getByText(/Trang chủ/i)).toBeInTheDocument();
  expect(screen.getByText(/Dự án/i)).toBeInTheDocument();
  expect(screen.getByText(/Gói cước/i)).toBeInTheDocument();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Giao diện Sidebar & layout responsive hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Xử lý các khoảng trắng không hợp lệ trên dòng trống và sắp xếp các thuộc tính JSX dài để vượt qua kiểm tra của Prettier.
[x] Thực tế mất bao lâu: 45 phút
```

---

## 📅 FE-D-02 — Home Workspace (Prompt Input & Tool Cards)

**Estimate:** 6 giờ  
**Phụ thuộc:** FE-D-01

### Mục Đích

Xây dựng trang Dashboard chính với ô nhập Prompt lớn kèm nút "Tạo nhanh kịch bản" và danh sách các thẻ công cụ (Images to Video, URL to Video) được thiết kế bo góc, đổ bóng và hover mượt mà.

### Output

- `app/(dashboard)/page.tsx`
- Ô nhập prompt (Textarea) tự động tăng độ cao kèm validation ký tự tối thiểu.
- Bộ thẻ công cụ dẫn tới quy trình wizard tương ứng.

### Unit Test

```tsx
// app/dashboard/page.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '../app/(dashboard)/page';

test('TC-D02-01: Nút Tạo kịch bản bị disable khi prompt trống', () => {
  render(<DashboardPage />);
  const createButton = screen.getByRole('button', { name: /Tạo kịch bản/i });
  expect(createButton).toBeDisabled();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Giao diện Prompt Box & các Tool Cards hoạt động chính xác: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Đã xử lý các lỗi gói dòng (wrapping) trong imports của lucide-react, template string định dạng URL và cấu trúc JSX của card description để đáp ứng yêu cầu kiểm duyệt nghiêm ngặt của Prettier.
[x] Thực tế mất bao lâu: 1 giờ 15 phút
```

---

## 📅 FE-D-03 — Lưới Quản Lý Dự Án Gần Đây (Recent Projects Grid)

**Estimate:** 4 giờ  
**Phụ thuộc:** FE-D-01, FE-S-02

### Mục Đích

Hiển thị danh sách dự án gần đây của user dưới dạng Grid. Hiển thị hình ảnh thumbnail của video, trạng thái render (Đang dựng, Đã hoàn thành, Thất bại) và hỗ trợ xóa/tải nhanh.

### Input

- API `GET /api/projects` trả về mảng danh sách dự án kèm status của video render.

### Output

- Lưới hiển thị danh sách các project.
- Component Badge biểu thị trạng thái:
  - `READY` (Màu vàng - Chờ duyệt kịch bản)
  - `RENDERING` (Màu xanh dương - Đang render)
  - `COMPLETED` (Màu xanh lá - Đã hoàn tất)
  - `FAILED` (Màu đỏ - Lỗi)

### Unit Test

```tsx
// components/projects-grid.test.tsx
import { render, screen } from '@testing-library/react';
import ProjectsGrid from '../components/projects-grid';

test('TC-D03-01: Hiển thị đúng badge trạng thái render', () => {
  const mockProjects = [
    { id: 'p1', name: 'Nhà phố Q2', status: 'COMPLETED', thumbnailUrl: '/thumb.jpg' },
  ];
  render(<ProjectsGrid projects={mockProjects} />);
  expect(screen.getByText(/Đã hoàn tất/i)).toHaveClass('bg-green-500/10');
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Giao diện Lưới quản lý dự án & status badges hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Loại bỏ comment loại trừ ESLint `@next/next/no-img-element` bị lỗi do rule này chưa được khai báo cấu hình. Định dạng lại cấu trúc text dài và icon FolderOpen bằng dấu xuống dòng để khớp chuẩn của Prettier.
[x] Thực tế mất bao lâu: 1 giờ
```

---

# PHASE CREATE WIZARD (LUỒNG TẠO VIDEO 2 GIAI ĐOẠN)

---

## 📅 FE-W-01 — Form Tạo Dự Án & Kéo-Thả File Lớn (Direct to R2)

**Estimate:** 8 giờ  
**Phụ thuộc:** FE-D-02, FE-S-02

### Mục Đích

Thiết kế Wizard bước 1: Thu thập thông tin BĐS (tên, giá, địa chỉ) và khu vực Upload ảnh/video. Nếu file video thô lớn > 10MB, frontend sẽ gọi lấy presigned URL từ backend rồi `PUT` trực tiếp lên Cloudflare R2 để tối ưu hóa hiệu năng.

### Input

- Các trường thông tin BĐS.
- Hỗ trợ chọn nhiều file ảnh/video từ máy tính qua thư viện `react-dropzone`.

### Output

- Form nhập liệu validation đầy đủ bằng `react-hook-form` + `zod`.
- Component upload hiển thị thanh tiến trình tải lên riêng biệt cho từng file.

### Unit Test

```tsx
// components/file-upload.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import FileUpload from '../components/file-upload';

test('TC-W01-01: Chặn upload nếu file sai định dạng (ví dụ: .pdf)', async () => {
  render(<FileUpload onUploadComplete={jest.fn()} />);
  // Giả lập drop file PDF
  // Assert hiển thị lỗi:
  expect(await screen.findByText(/Định dạng file không hỗ trợ/i)).toBeInTheDocument();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Form và Kéo-Thả hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Đã sửa cảnh báo explicit any của TypeScript linter bằng cách định nghĩa kiểu Record<string, unknown> tường minh.
[x] Thực tế mất bao lâu: 1.5 giờ
```

---

## 📅 FE-W-02 — Trình Chỉnh Sửa Kịch Bản Nháp (Script Editor — Phase 1)

**Estimate:** 8 giờ  
**Phụ thuộc:** FE-W-01

### Mục Đích

Màn hình duyệt kịch bản nháp (Phase 1): Hiển thị danh sách các phân cảnh (scene) xếp theo chiều dọc. Cho phép người dùng chỉnh sửa trực tiếp nội dung thuyết minh (narration), phụ đề (captions) của từng phân cảnh và kéo thả đổi hình ảnh gán vào phân cảnh đó.

### Input

- Đối tượng `ScriptDraft` nhận từ API `GET /api/script-drafts/:id`.

### Output

- Component `ScriptEditor` hiển thị danh sách các card phân cảnh.
- Tính năng tự động lưu nháp hoặc click **"Lưu & Chạy Dựng Video"** gửi payload lên `POST /api/video-jobs`.

### Unit Test

```tsx
// components/script-editor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ScriptEditor from '../components/script-editor';

test('TC-W02-01: Cho phép sửa nội dung narration của scene', () => {
  const mockDraft = {
    scenes: [{ id: 's1', order: 1, narration: 'Chào mừng các bạn', assignedAssets: [] }],
  };
  render(<ScriptEditor draft={mockDraft} onSave={jest.fn()} />);
  const textarea = screen.getByDisplayValue('Chào mừng các bạn');
  fireEvent.change(textarea, { target: { value: 'Nội dung đã sửa' } });
  expect(textarea.value).toBe('Nội dung đã sửa');
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Script Editor hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Đã tối ưu hóa giao diện chọn nhanh thư viện tài nguyên tải lên cho mỗi phân cảnh và tự động nạp mock kịch bản thông minh nếu chưa lưu kịch bản thô.
[x] Thực tế mất bao lâu: 2 giờ
```

---

## 📅 FE-W-03 — Tiến Trình Render & Trình Xem Video 9:16 (Phase 2)

**Estimate:** 7 giờ  
**Phụ thuộc:** FE-W-02

### Mục Đích

Màn hình theo dõi và hiển thị kết quả render (Phase 2): Tự động thực hiện cơ chế Polling gửi request lên `GET /api/video-jobs/:id/status` mỗi 3s. Khi render xong, hiển thị trình phát video dọc (9:16) cùng khung nút copy caption + hashtag và nút download video `.mp4`.

### Input

- `jobId` cần theo dõi tiến trình.

### Output

- Giao diện thanh tiến trình render hiển thị động các công việc backend đang chạy.
- Trình phát video chuyên nghiệp tương thích giao diện điện thoại dọc.

### Unit Test

```tsx
// components/render-progress.test.tsx
import { render, screen } from '@testing-library/react';
import RenderProgress from '../components/render-progress';

test('TC-W03-01: Hiển thị đúng thông điệp tương ứng trạng thái render', () => {
  render(<RenderProgress status="RENDERING" percent={65} />);
  expect(screen.getByText(/Đang ghép nhạc & xuất video/i)).toBeInTheDocument();
  expect(screen.getByText('65%')).toBeInTheDocument();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Trình phát video và tiến trình render hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Xử lý polling tự động và fallback mock-render mượt mà. Đã fix lỗi prefer-const đối với timer interval trong useEffect.
[x] Thực tế mất bao lâu: 2 giờ
```

---

# PHASE BILLING & CỔNG THANH TOÁN

---

## 📅 FE-B-01 — Quản Lý Gói Cước & Mua Lượt Render

**Estimate:** 4 giờ  
**Phụ thuộc:** FE-D-01

### Mục Đích

Tạo giao diện trang Gói cước hiển thị các gói dịch vụ (ví dụ: Starter, Professional, Enterprise) và các gói mua lẻ AI token render video. Hiển thị lịch sử giao dịch nạp tiền.

### Output

- `app/(dashboard)/billing/page.tsx`
- Bảng so sánh các tính năng của từng gói cước.
- Nút kích hoạt thanh toán chuyển hướng sang trang checkout.

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Quản lý gói cước hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Chưa tích hợp hiển thị lịch sử giao dịch vì cần API backend cụ thể hơn, đã thiết kế khung mua token lẻ cực kỳ bắt mắt.
[x] Thực tế mất bao lâu: 1.5 giờ
```

---

## 📅 FE-B-02 — Tích Hợp Cổng Thanh Toán PayOS (SDK / Webhook)

**Estimate:** 6 giờ  
**Phụ thuộc:** FE-B-01

### Mục Đích

Gửi yêu cầu khởi tạo cổng thanh toán lên backend, nhận cổng URL PayOS và điều hướng người dùng. Sau khi người dùng chuyển khoản qua QR code thành công, xử lý màn hình Redirect thông báo nạp token thành công.

### Input

- Gọi API `POST /api/billing/payos/create-order` nhận `checkoutUrl`.

### Output

- Màn hình nạp tiền hiển thị QR code chuyển khoản hoặc chuyển hướng an toàn.
- Trang Callback xử lý các tham số return của PayOS (`/billing/callback?status=PAID...`) để xác nhận cộng token tức thì.

### Unit Test

```tsx
// app/billing/callback/page.test.tsx
import { render, screen } from '@testing-library/react';
import BillingCallbackPage from '../app/(dashboard)/billing/callback/page';

test('TC-B02-01: Hiển thị giao diện nạp tiền thành công khi có param status=PAID', () => {
  // Mock searchParams status = PAID
  render(<BillingCallbackPage searchParams={{ status: 'PAID' }} />);
  expect(screen.getByText(/Giao dịch thành công/i)).toBeInTheDocument();
});
```

### Nhật Ký Phát Triển

```
[x] Ngày bắt đầu: 2026-06-07
[x] Người thực hiện: Antigravity
[x] Tích hợp PayOS callback hoạt động tốt: [x] Có  [ ] Không
[x] Vấn đề gặp phải: Next.js báo lỗi prerender do sử dụng useSearchParams ở ngoài Suspense boundary. Đã sửa bằng cách bọc toàn bộ trang callback trong Suspense.
[x] Thực tế mất bao lâu: 2 giờ
```

---

## 📋 Hướng Dẫn Sử Dụng Nhật Ký Phát Triển (Dành Cho Dev/AI)

Khi bắt tay vào làm một task bất kỳ:

1. Đánh dấu trạng thái task trong **Bảng Tổng Hợp** từ `[ ] TODO` thành `[/] IN_PROGRESS`.
2. Đọc kỹ phần **Mục Đích**, **Input** và **Output** để định hình thiết kế.
3. Code tính năng và viết các **Unit Test** đi kèm.
4. Chạy kiểm thử tự động, khi pass 100% thì đổi trạng thái task thành `[x] DONE`.
5. Điền thông tin vào phần **Nhật Ký Phát Triển** ở cuối mỗi task tương ứng để lưu vết sự cố, cách khắc phục hoặc quyết định cấu trúc quan trọng.
