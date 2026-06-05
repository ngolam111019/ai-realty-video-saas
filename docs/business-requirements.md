# Business Requirements Document (BRD)

# AI Realty Video SaaS

**Version:** 1.0.0
**Ngày:** 2026-06-04
**Trạng thái:** Approved

---

## 1. Tổng Quan Dự Án

### 1.1 Mô Tả

Nền tảng SaaS hỗ trợ nhân viên sale bất động sản **tự động sản xuất video ngắn chuyên nghiệp** để đăng lên TikTok, Facebook Reels, YouTube Shorts, Instagram Reels.

Thay vì phải thuê ekip quay phim/edit video, nhân viên sale chỉ cần:

1. Upload ảnh/video căn hộ + ảnh chân dung
2. Điền thông tin dự án, giá, ưu điểm
3. Chọn template video phù hợp
4. Hệ thống tự động tạo kịch bản + voiceover + video hoàn chỉnh trong vài phút

### 1.2 Target Users

- **Primary:** Nhân viên sale bất động sản (môi giới, telesales) — cần nội dung video để marketing cá nhân
- **Secondary:** Trưởng nhóm, team leader — quản lý content cả team
- **Tertiary:** Chủ dự án bất động sản — muốn tạo nội dung quảng bá hàng loạt

### 1.3 Value Proposition

| Vấn đề hiện tại                                  | Giải pháp AI Realty Video                               |
| ------------------------------------------------ | ------------------------------------------------------- |
| Tạo video mất 2-5 ngày, chi phí 2-10 triệu/video | Tạo video trong 5-10 phút, phí token thấp               |
| Cần kỹ năng edit video chuyên nghiệp             | Chỉ cần upload ảnh + điền thông tin                     |
| Không biết quay góc nào, nội dung gì             | Hệ thống gợi ý checklist chụp ảnh + thông tin cần thiết |
| Thiếu consistency trong branding                 | Template chuẩn, voiceover chuyên nghiệp                 |

---

## 2. User Flows — Nghiệp Vụ Chi Tiết

### Flow 1: Đăng Ký & Onboarding

```
Trang Landing
  → Nhấn "Dùng miễn phí" / "Đăng ký"
    → Form đăng ký (email, mật khẩu, tên, số điện thoại)
      → Gửi email xác thực
        → Verify email click link
          → Onboarding wizard:
              Bước 1: Thông tin bản thân (tên, avatar/chân dung)
              Bước 2: Công ty/đơn vị công tác
              Bước 3: Chọn gói token (hoặc dùng free trial)
                → Dashboard chính
```

### Flow 2: Nạp Tiền / Mua Token

```
Dashboard → "Nạp Token" / Billing
  → Xem các gói token:
      - Starter: 100 tokens = 99k/tháng (~10 video)
      - Pro: 500 tokens = 399k/tháng (~50 video)
      - Business: 2000 tokens = 1.299k/tháng (~200 video)
  → Chọn gói → Chọn cổng thanh toán (Stripe card / PayOS: Momo/VNPay/ZaloPay)
    → Thanh toán thành công
      → Token cộng vào tài khoản ngay
      → Gửi email hóa đơn
      → Lịch sử giao dịch cập nhật
```

### Flow 3: Tạo Dự Án Bất Động Sản

```
Dashboard → "Dự án" → "Tạo dự án mới"
  → Nhập thông tin dự án:
      - Tên dự án/căn hộ
      - Loại BĐS: căn hộ, villa, shophouse, đất nền, ...
      - Địa chỉ/vị trí
      - Diện tích (m²)
      - Số phòng ngủ, số WC
      - Giá bán/giá thuê
      - Tiện ích (hồ bơi, gym, view sông, ...)
      - Ưu điểm nổi bật (tự điền + AI gợi ý)
      - Thông tin liên hệ (tên sale, số điện thoại)
  → Lưu dự án → Chuyển sang bước Upload Media
```

### Flow 4: Upload Media

```
Trang Dự Án → Tab "Media"
  → Hệ thống hiện Checklist Chụp Ảnh (xem nghiệp vụ 5):
      ✅ Ảnh mặt tiền (tối thiểu 2 góc)
      ✅ Phòng khách (3 góc: tổng thể, chi tiết, view từ ngoài vào)
      ✅ Bếp + phòng ăn
      ✅ Phòng ngủ master
      ✅ Phòng ngủ phụ
      ✅ WC/bathroom
      ✅ Ban công / view
      ✅ Hành lang, thang máy, lobby
      ✅ Tiện ích (hồ bơi, gym, ...)
      ✅ Ảnh chân dung sale (để overlay vào video)
  → Upload drag-and-drop hoặc chọn file
      - Hỗ trợ: JPG, PNG, MP4, MOV
      - Tối đa 50 file/dự án
      - Auto-compress + resize
      - AI auto-tag ảnh (phòng khách, phòng ngủ, ...) để map vào template
  → Lưu media → Sẵn sàng tạo video
```

### Flow 5: Gợi Ý Chụp Ảnh (Shooting Guide)

```
Trang Dự Án → Tab "Hướng dẫn chụp"
  → Hệ thống sinh checklist cụ thể dựa trên loại BĐS:
      [Căn hộ chung cư — 2PN/2WC]
      Ảnh cần chụp:
        📸 Mặt tiền tòa nhà — góc rộng, ánh sáng ban ngày
        📸 Lobby/sảnh — thể hiện đẳng cấp
        📸 Phòng khách — góc tổng thể từ cửa vào
        📸 Phòng khách — góc gần sofa nhìn ra ban công
        📸 Bếp — góc tổng thể
        📸 Phòng ngủ master — góc tổng thể, dọn dẹp gọn
        📸 WC — sạch sẽ, ánh đèn trắng
        📸 Ban công — view thoáng, chụp cả cảnh bên ngoài
        📸 Chân dung sale — nền trắng/văn phòng, trang phục chuyên nghiệp

      Thông tin cần cung cấp thêm:
        💰 Giá bán: _____ triệu / _____m²
        🗓️ Thời điểm nhận bàn giao:
        🎁 Chính sách ưu đãi hiện tại:
        📞 Hotline sale:

      Tips chụp:
        → Chụp buổi sáng/chiều (tránh trưa nắng gắt)
        → Dọn dẹp sạch trước khi chụp
        → Bật đèn phòng ngủ để ảnh sáng hơn
        → Chụp ngang (landscape) cho phòng, dọc (portrait) cho reel
```

### Flow 6: Chọn Template & Tạo Kịch Bản

```
Dự Án → Tab "Video" → "Tạo video mới"
  → Bước 1: Chọn platform đăng
      [ TikTok 9:16 ] [ Instagram Reels 9:16 ] [ YouTube Shorts 9:16 ] [ Facebook 1:1 ]
  → Bước 2: Chọn template:
      🎬 Template "Tour Căn Hộ" (60-90s)
          - Scene 1: Intro sale (chân dung + tên + công ty) — 5s
          - Scene 2: Tổng quan dự án — 10s
          - Scene 3: Tour từng phòng — 30s
          - Scene 4: Highlight tiện ích — 10s
          - Scene 5: Giá + CTA liên hệ — 15s

      🎬 Template "Listing Hot Deal" (30-45s)
          - Scene 1: Hook mạnh (giá hot, deadline) — 5s
          - Scene 2: Ảnh đẹp nhất 3-5 ảnh slideshow — 15s
          - Scene 3: USP 3 điểm nhanh — 10s
          - Scene 4: CTA liên hệ ngay — 10s

      🎬 Template "Giới Thiệu Sale" (30s)
          - Scene 1: Chân dung sale + tên + vị trí
          - Scene 2: Dự án đang phụ trách
          - Scene 3: Cam kết dịch vụ
          - Scene 4: CTA

      🎬 Template "Monthly Strategy" (chuỗi 4 video/tháng)
          - Tuần 1: Video giới thiệu dự án
          - Tuần 2: Video tour chi tiết
          - Tuần 3: Video review tiện ích + khu vực
          - Tuần 4: Video deal đặc biệt + CTA

  → Bước 3: Xem kịch bản AI đã tạo:
      [AI tự động gen từ thông tin dự án + ảnh đã upload]
      - Script từng scene (caption + narration tiếng Việt)
      - Thời lượng từng scene
      - Ảnh/video được map vào scene nào
      → User có thể chỉnh sửa tay script
      → Chọn giọng đọc (8-12 giọng AI: nam/nữ, miền Nam/Bắc, chuyên nghiệp/trẻ trung)

  → Bước 4: Preview kịch bản → "Tạo Video" (trừ token)
```

### Flow 7: Theo Dõi & Quản Lý Video

```
Dashboard → Tab "Video của tôi"
  → Danh sách video:
      - Tên video
      - Dự án liên kết
      - Trạng thái: Đang xử lý / Hoàn thành / Lỗi
      - Thời lượng tạo
      - Thumbnail

  → Nhấn vào video:
      - Xem preview video (player)
      - Download MP4
      - Chia sẻ link (private CDN link)
      - Copy caption/hashtag đề xuất (AI gen)
      - Đăng trực tiếp lên TikTok/Facebook (Phase 2)
      - Chỉnh sửa script → Render lại (tốn thêm token)
      - Xóa video

  → Lọc/tìm kiếm theo: dự án, template, ngày tạo, trạng thái
```

### Flow 8: Chiến Lược Nội Dung Tháng (Monthly Strategy)

```
Dashboard → "Chiến lược tháng"
  → Chọn tháng (VD: tháng 7/2026)
  → Chọn dự án
  → AI đề xuất lịch đăng nội dung:
      Tuần 1 (1-7/7): Video giới thiệu dự án + Hook mạnh
      Tuần 2 (8-14/7): Tour chi tiết từng phòng
      Tuần 3 (15-21/7): Review tiện ích + khu vực xung quanh
      Tuần 4 (22-28/7): Deal đặc biệt + CTA cuối tháng
      Bonus (29-31/7): Tổng kết, sắp xếp lịch tháng sau

  → User chấp nhận hoặc điều chỉnh kế hoạch
  → Hệ thống tạo lịch nhắc nhở tạo video đúng lịch
  → Progress bar theo dõi đã tạo bao nhiêu video/tháng
```

---

## 3. Feature Checklist — End-to-End

### 🔐 Module: Authentication & Authorization

| #    | Feature                                      | Priority | Status |
| ---- | -------------------------------------------- | -------- | ------ |
| 1.1  | Đăng ký bằng email + mật khẩu                | P0       | ☐      |
| 1.2  | Xác thực email (email verification)          | P0       | ☐      |
| 1.3  | Đăng nhập email/password                     | P0       | ☐      |
| 1.4  | Đăng nhập Google OAuth                       | P1       | ☐      |
| 1.5  | Quên mật khẩu / Reset password               | P0       | ☐      |
| 1.6  | Đổi mật khẩu (khi đã đăng nhập)              | P1       | ☐      |
| 1.7  | Refresh token tự động (silent refresh)       | P0       | ☐      |
| 1.8  | Đăng xuất / Invalidate session               | P0       | ☐      |
| 1.9  | Rate limiting login (brute force protection) | P0       | ☐      |
| 1.10 | JWT access token (15m) + refresh token (30d) | P0       | ☐      |

### 👤 Module: User Profile & Onboarding

| #   | Feature                                        | Priority | Status |
| --- | ---------------------------------------------- | -------- | ------ |
| 2.1 | Onboarding wizard 3 bước sau đăng ký           | P1       | ☐      |
| 2.2 | Upload ảnh đại diện (chân dung sale)           | P0       | ☐      |
| 2.3 | Thông tin profile: tên, công ty, số điện thoại | P0       | ☐      |
| 2.4 | Cài đặt giọng đọc mặc định                     | P1       | ☐      |
| 2.5 | Cài đặt ngôn ngữ (tiếng Việt/Anh)              | P2       | ☐      |
| 2.6 | Xem tóm tắt hoạt động dashboard                | P1       | ☐      |

### 💰 Module: Token & Billing

| #    | Feature                                          | Priority | Status |
| ---- | ------------------------------------------------ | -------- | ------ |
| 3.1  | Hiển thị số dư token hiện tại                    | P0       | ☐      |
| 3.2  | Danh sách gói token (Starter/Pro/Business)       | P0       | ☐      |
| 3.3  | Thanh toán qua Stripe (card quốc tế)             | P0       | ☐      |
| 3.4  | Thanh toán qua PayOS (Momo/VNPay/ZaloPay)        | P0       | ☐      |
| 3.5  | Cộng token ngay sau thanh toán thành công        | P0       | ☐      |
| 3.6  | Webhook xử lý thanh toán (idempotent)            | P0       | ☐      |
| 3.7  | Gửi email hóa đơn sau mỗi giao dịch              | P0       | ☐      |
| 3.8  | Lịch sử giao dịch (mua token + dùng token)       | P0       | ☐      |
| 3.9  | Cảnh báo token thấp (dưới 20 token)              | P1       | ☐      |
| 3.10 | Token không expire nếu còn trong 60 ngày         | P1       | ☐      |
| 3.11 | Refund policy: hoàn tiền trong 24h nếu chưa dùng | P2       | ☐      |
| 3.12 | Xuất hóa đơn PDF (VAT)                           | P2       | ☐      |

### 🏠 Module: Dự Án Bất Động Sản

| #   | Feature                             | Priority | Status |
| --- | ----------------------------------- | -------- | ------ |
| 4.1 | Tạo dự án mới (form nhập thông tin) | P0       | ☐      |
| 4.2 | Chỉnh sửa thông tin dự án           | P0       | ☐      |
| 4.3 | Xóa dự án (soft delete)             | P0       | ☐      |
| 4.4 | Danh sách dự án với search/filter   | P0       | ☐      |
| 4.5 | Duplicate dự án                     | P2       | ☐      |
| 4.6 | Chia sẻ dự án với thành viên team   | P2       | ☐      |

### 📸 Module: Media Management

| #    | Feature                                           | Priority | Status |
| ---- | ------------------------------------------------- | -------- | ------ |
| 5.1  | Upload ảnh (JPG/PNG, tối đa 20MB/file)            | P0       | ☐      |
| 5.2  | Upload video clip (MP4/MOV, tối đa 500MB/file)    | P0       | ☐      |
| 5.3  | Drag-and-drop multi-file upload                   | P0       | ☐      |
| 5.4  | Progress bar upload                               | P0       | ☐      |
| 5.5  | Auto-generate thumbnail                           | P0       | ☐      |
| 5.6  | AI auto-tag ảnh (phòng khách, phòng ngủ, ...)     | P1       | ☐      |
| 5.7  | Sắp xếp thứ tự ảnh (drag to reorder)              | P1       | ☐      |
| 5.8  | Xóa media                                         | P0       | ☐      |
| 5.9  | Xem media grid (gallery view)                     | P0       | ☐      |
| 5.10 | Checklist chụp ảnh gợi ý theo loại BĐS            | P1       | ☐      |
| 5.11 | Hướng dẫn góc chụp + tips (text + example images) | P1       | ☐      |

### 🎬 Module: Script & Video Templates

| #    | Feature                                                | Priority | Status |
| ---- | ------------------------------------------------------ | -------- | ------ |
| 6.1  | Danh sách template (có thumbnail preview)              | P0       | ☐      |
| 6.2  | Template "Tour Căn Hộ" (60-90s)                        | P0       | ☐      |
| 6.3  | Template "Listing Hot Deal" (30-45s)                   | P0       | ☐      |
| 6.4  | Template "Giới Thiệu Sale" (30s)                       | P0       | ☐      |
| 6.5  | Template "Monthly Strategy" (chuỗi 4 video)            | P1       | ☐      |
| 6.6  | AI tự động gen script dựa trên thông tin dự án + media | P0       | ☐      |
| 6.7  | User chỉnh sửa script tay (rich text editor)           | P1       | ☐      |
| 6.8  | Chọn giọng đọc (danh sách giọng AI)                    | P0       | ☐      |
| 6.9  | Preview text-to-speech từng đoạn                       | P1       | ☐      |
| 6.10 | Lưu script draft                                       | P1       | ☐      |
| 6.11 | Copy script ra text                                    | P2       | ☐      |

### 🎥 Module: Video Generation

| #    | Feature                                           | Priority | Status |
| ---- | ------------------------------------------------- | -------- | ------ |
| 7.1  | Submit video generation job (trừ token)           | P0       | ☐      |
| 7.2  | Real-time progress tracking (WebSocket / polling) | P0       | ☐      |
| 7.3  | Thông báo khi video hoàn thành (in-app + email)   | P0       | ☐      |
| 7.4  | Xử lý lỗi + retry tự động (tối đa 3 lần)          | P0       | ☐      |
| 7.5  | Hoàn token nếu video lỗi không thể sửa            | P0       | ☐      |
| 7.6  | Xem preview video (embedded player)               | P0       | ☐      |
| 7.7  | Download MP4                                      | P0       | ☐      |
| 7.8  | Chia sẻ link video (CDN, có thể set expire)       | P1       | ☐      |
| 7.9  | Render lại video (tốn thêm token)                 | P1       | ☐      |
| 7.10 | Chọn độ phân giải (1080x1920 / 1080x1080)         | P1       | ☐      |
| 7.11 | AI gen caption + hashtag cho post                 | P1       | ☐      |
| 7.12 | Đăng trực tiếp lên TikTok (Phase 2)               | P2       | ☐      |
| 7.13 | Đăng trực tiếp lên Facebook (Phase 2)             | P2       | ☐      |

### 📅 Module: Monthly Content Strategy

| #   | Feature                                     | Priority | Status |
| --- | ------------------------------------------- | -------- | ------ |
| 8.1 | Tạo kế hoạch nội dung tháng                 | P1       | ☐      |
| 8.2 | AI đề xuất lịch đăng (4-8 video/tháng)      | P1       | ☐      |
| 8.3 | Calendar view kế hoạch                      | P1       | ☐      |
| 8.4 | Nhắc nhở tạo video theo lịch (email/in-app) | P2       | ☐      |
| 8.5 | Progress tracking video đã tạo trong tháng  | P1       | ☐      |

### 🔔 Module: Notifications

| #   | Feature                             | Priority | Status |
| --- | ----------------------------------- | -------- | ------ |
| 9.1 | In-app notifications (bell icon)    | P0       | ☐      |
| 9.2 | Email notification video hoàn thành | P0       | ☐      |
| 9.3 | Email cảnh báo token thấp           | P1       | ☐      |
| 9.4 | Email reminder lịch đăng nội dung   | P2       | ☐      |
| 9.5 | Push notification web (PWA)         | P3       | ☐      |

### 🛠️ Module: Admin Dashboard

| #     | Feature                                           | Priority | Status |
| ----- | ------------------------------------------------- | -------- | ------ |
| 10.1  | Danh sách users (search, filter, phân trang)      | P0       | ☐      |
| 10.2  | Xem chi tiết user (profile, token, video history) | P0       | ☐      |
| 10.3  | Chỉnh sửa token user                              | P0       | ☐      |
| 10.4  | Suspend/activate user account                     | P0       | ☐      |
| 10.5  | Danh sách video jobs (filter theo status)         | P0       | ☐      |
| 10.6  | Monitor queue jobs (BullMQ dashboard)             | P0       | ☐      |
| 10.7  | Quản lý template video (CRUD)                     | P0       | ☐      |
| 10.8  | Quản lý gói token (pricing)                       | P0       | ☐      |
| 10.9  | Revenue dashboard (tổng doanh thu, tháng)         | P0       | ☐      |
| 10.10 | Danh sách giao dịch                               | P0       | ☐      |
| 10.11 | Export CSV doanh thu                              | P1       | ☐      |
| 10.12 | Metrics: DAU, MAU, video created, token consumed  | P1       | ☐      |

---

## 4. Token Consumption Model

| Action                 | Token Cost  | Notes                          |
| ---------------------- | ----------- | ------------------------------ |
| Tạo video 30s          | 5 tokens    | 1 render                       |
| Tạo video 60s          | 8 tokens    | 1 render                       |
| Tạo video 90s          | 12 tokens   | 1 render                       |
| AI gen script          | 1 token     | Đã bao gồm trong tạo video     |
| TTS audio gen          | Đã bao gồm  | Không tính riêng               |
| Re-render video        | 50% giá gốc | Giảm để khuyến khích chỉnh sửa |
| AI gen caption/hashtag | 0.5 token   | Tính riêng                     |

---

## 5. Non-Functional Requirements

| Requirement           | Target                   |
| --------------------- | ------------------------ |
| Video processing time | < 5 phút cho video 60s   |
| API response time     | < 200ms (p95)            |
| Upload speed          | Hỗ trợ file 500MB        |
| Uptime                | 99.5% SLA                |
| Concurrent video jobs | 50 jobs song song        |
| Storage per user      | 10GB                     |
| Security              | OWASP Top 10, HTTPS, JWT |
| GDPR                  | Data deletion on request |

---

## 6. Giai Đoạn Phát Triển

### Phase 1 — MVP (3 tháng)

- Auth (email/pass, Google OAuth)
- Billing (Stripe + PayOS, 3 gói token)
- Project & Media management
- 2 template cơ bản (Tour + Hot Deal)
- AI script generation
- Video generation + download
- Admin dashboard cơ bản

### Phase 2 — Growth (tháng 4-6)

- Monthly strategy planner
- TikTok/Facebook direct posting
- AI auto-tag media
- Mobile-responsive optimization
- Team/agency features (multi-user)

### Phase 3 — Scale (tháng 7-12)

- Custom template builder
- Affiliate/referral program
- API for enterprise
- White-label option
- Analytics dashboard cho user
