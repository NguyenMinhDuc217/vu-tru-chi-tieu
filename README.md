# Vũ Trụ Chi Tiêu

Ứng dụng web quản lý chi tiêu hàng tháng bằng một hệ hành tinh 3D (Three.js).

- **Ngôi sao** ở giữa là tổng chi của tháng, đổi từ vàng sang đỏ khi gần chạm ngân sách.
- **Mỗi mục ngân sách là một hành tinh**, mỗi vòng quỹ đạo chứa 5 hành tinh theo thứ tự bạn sắp xếp.
- **Mỗi khoản chi là một tiểu hành tinh** quanh hành tinh của mục đó; lớp khí quyển là ngân sách.
- **Chòm sao ngày**: xem chi tiêu theo lịch tháng.
- **Bàn tay của God**: hoạt cảnh khi thêm, sửa, xóa khoản chi hoặc mục ngân sách.

Dữ liệu lưu ở đâu:

- **Chưa đăng nhập:** trong trình duyệt của chính người dùng (localStorage).
- **Đăng nhập Google:** trên Firebase Firestore, mỗi tài khoản một vùng riêng (`vutru_chitieu/<uid>/`), tự đồng bộ giữa các thiết bị. Lần đăng nhập đầu, app đề nghị tải dữ liệu đang có trên trình duyệt lên tài khoản.

## Cấu trúc

| File | Vai trò |
|---|---|
| `thap-chi-tieu.html` | Mã nguồn ứng dụng (dạng phần thân trang, dùng chung với bản trên claude.ai) |
| `build.sh` | Bọc mã nguồn thành trang HTML đầy đủ |
| `public/index.html` | Trang để deploy (được tạo bởi `build.sh`) |
| `firebase-config.js` | Cấu hình dự án Firebase cho bản công khai (để `null` thì chỉ lưu trên trình duyệt) |
| `firestore.rules` | Quy tắc bảo mật Firestore: mỗi người chỉ đọc/ghi dữ liệu của mình |
| `functions/api/english.js` | Backend học tiếng Anh (Cloudflare Pages Functions, gọi Gemini) |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` | Cài thành ứng dụng (PWA): manifest, service worker, biểu tượng |
| `public/_headers` | Header cache cho Cloudflare Pages (service worker luôn được kiểm tra bản mới) |
| `functions/__/[[path]].js` | Chuyển `/__/auth/*` tới Firebase để app đã cài đăng nhập Google trên chính tên miền này |

## Chạy trên máy

```bash
./build.sh
xdg-open public/index.html   # hoặc mở file bằng trình duyệt bất kỳ
```

## Deploy (Cloudflare Pages)

Repo được kết nối với Cloudflare Pages, địa chỉ: https://vu-tru-chi-tieu.pages.dev

- **Framework preset:** None
- **Build command:** `bash build.sh`
- **Build output directory:** `public`

Mỗi lần `git push` lên nhánh `main`, Cloudflare tự build và cập nhật trang.

## Firebase (đăng nhập và đồng bộ)

1. Tạo dự án tại https://console.firebase.google.com
2. **Authentication → Sign-in method:** bật **Google**
3. **Authentication → Settings → Authorized domains:** thêm `vu-tru-chi-tieu.pages.dev`
4. **Firestore Database:** tạo database (production mode). Trong tab **Rules**, thêm khối `match /vutru_chitieu/...` từ `firestore.rules` (giữ nguyên các khối của app khác nếu dự án dùng chung) rồi **Publish**
5. **Project settings → Your apps → Web app:** sao chép `firebaseConfig` vào `firebase-config.js`, chạy `./build.sh`, commit và push

## Trang quản trị

Tài khoản quản trị thấy nút **Quản trị** trong ô tài khoản. Trang quản trị có:

- Danh sách người dùng (tên, email, lần mở app gần nhất, chi tiêu tháng này), tìm theo tên hoặc email
- **Xem chi tiêu:** mở toàn bộ dữ liệu của người đó (vũ trụ 3D, danh sách, ngân sách) ở chế độ chỉ xem
- **Khóa / Mở khóa:** tài khoản bị khóa không đọc, ghi được dữ liệu của mình trên máy chủ

Ai là quản trị viên do `firestore.rules` quyết định (hàm `isVtctAdmin`), app không ghi email đó trong mã nguồn.
Khi dán rules vào Firebase Console, thay `EMAIL_QUAN_TRI` bằng email Google của quản trị viên.
Người dùng chỉ hiện trong danh sách sau khi mở app (đã đăng nhập) ít nhất một lần, vì lúc đó app mới tạo hồ sơ `vutru_chitieu/<uid>`.

## Cài thành ứng dụng (PWA)

- **Android (Chrome, Edge, Samsung Internet):** bấm **Cài đặt** ở gợi ý "Cài thành ứng dụng" trong panel, hoặc menu ⋮ → *Cài đặt ứng dụng*.
- **iPhone / iPad (Safari, iOS 16.4+ cả Chrome):** nút Chia sẻ → *Thêm vào MH chính*.
- Trang được mở bằng mạng trước, nên bản deploy mới hiện ngay lần mở sau; mất mạng thì dùng bản đã lưu. Dữ liệu chi tiêu
  vẫn đồng bộ qua Firestore (có bản lưu offline).
- App đã cài trên iOS có bộ nhớ riêng, không dùng chung với Safari, nên cần đăng nhập lại một lần trong app.

**Đăng nhập trong app đã cài.** Ở chế độ này popup không quay lại được app, nên app đăng nhập bằng redirect qua
`https://vu-tru-chi-tieu.pages.dev/__/auth/handler` (được `functions/__/[[path]].js` chuyển tới Firebase). Cần làm một lần:

1. [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), chọn đúng dự án Firebase
2. Mở OAuth 2.0 Client **Web client (auto created by Google Service)**
3. *Authorized JavaScript origins*: thêm `https://vu-tru-chi-tieu.pages.dev`
4. *Authorized redirect URIs*: thêm `https://vu-tru-chi-tieu.pages.dev/__/auth/handler` → **Save**

Đổi tên miền thì sửa `FIREBASE_AUTH_PROXY_HOSTS` trong `firebase-config.js` và thêm URI tương ứng.

## Học tiếng Anh (chỉ quản trị viên)

Trang **Học tiếng Anh** nằm trong trang quản trị (bấm **Quản trị**, chọn **Học tiếng Anh**), chỉ tài khoản quản trị dùng được: luyện hội thoại theo chủ đề (nhà hàng, phỏng vấn, du lịch…)
và trình độ; mỗi câu bạn viết được sửa lỗi, kèm giải thích bằng tiếng Anh và tiếng Việt. Câu trả lời có bản dịch, nút nghe
phát âm, và có thể nói bằng micro trên trình duyệt hỗ trợ. Lịch sử lưu ở `vutru_chitieu/<uid>/english/current`.

- AI: Google Gemini (bản miễn phí, mô hình chính `gemini-3.8-flash`; khi quá tải tự chuyển sang `gemini-flash-latest` rồi `gemini-3.5-flash-lite`). Ở bản miễn phí, Google có thể dùng nội dung hội thoại để cải thiện sản phẩm.
- Backend: `functions/api/english.js` (Cloudflare Pages Functions) giữ API key trên máy chủ. Nó hỏi Firestore xem người gọi có
  phải quản trị viên không (Firestore tự kiểm tra token đăng nhập và áp dụng `firestore.rules`), nên không cần cấu hình email ở đây.

Cài đặt một lần:

1. Lấy API key miễn phí tại https://aistudio.google.com/apikey
2. Cloudflare → Workers & Pages → dự án `vu-tru-chi-tieu` → **Settings → Variables and Secrets** → **Add**:
   kiểu **Secret**, tên `GEMINI_API_KEY`, giá trị là key vừa lấy (môi trường Production)
3. Tuỳ chọn: biến `GEMINI_MODEL` để thử một mô hình khác trước danh sách trên
4. Deploy lại (push một commit hoặc **Deployments → Retry deployment**) để biến có hiệu lực

## Cập nhật ứng dụng

1. Sửa `thap-chi-tieu.html`
2. Chạy `./build.sh`
3. `git add -A && git commit -m "..." && git push`
