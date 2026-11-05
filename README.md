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

## Cập nhật ứng dụng

1. Sửa `thap-chi-tieu.html`
2. Chạy `./build.sh`
3. `git add -A && git commit -m "..." && git push`
