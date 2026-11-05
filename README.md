# Vũ Trụ Chi Tiêu

Ứng dụng web quản lý chi tiêu hàng tháng bằng một hệ hành tinh 3D (Three.js).

- **Ngôi sao** ở giữa là tổng chi của tháng, đổi từ vàng sang đỏ khi gần chạm ngân sách.
- **Mỗi mục ngân sách là một hành tinh**, mỗi vòng quỹ đạo chứa 5 hành tinh theo thứ tự bạn sắp xếp.
- **Mỗi khoản chi là một tiểu hành tinh** quanh hành tinh của mục đó; lớp khí quyển là ngân sách.
- **Chòm sao ngày**: xem chi tiêu theo lịch tháng.
- **Bàn tay của God**: hoạt cảnh khi thêm, sửa, xóa khoản chi hoặc mục ngân sách.

Dữ liệu của mỗi người được lưu trong trình duyệt của chính họ (localStorage), không gửi lên máy chủ nào.

## Cấu trúc

| File | Vai trò |
|---|---|
| `thap-chi-tieu.html` | Mã nguồn ứng dụng (dạng phần thân trang, dùng chung với bản trên claude.ai) |
| `build.sh` | Bọc mã nguồn thành trang HTML đầy đủ |
| `public/index.html` | Trang để deploy (được tạo bởi `build.sh`) |

## Chạy trên máy

```bash
./build.sh
xdg-open public/index.html   # hoặc mở file bằng trình duyệt bất kỳ
```

## Deploy (Cloudflare Pages)

Kết nối repo này trong Cloudflare Pages với cấu hình:

- **Framework preset:** None
- **Build command:** `bash build.sh`
- **Build output directory:** `public`

Mỗi lần `git push` lên nhánh `main`, Cloudflare tự build và cập nhật trang.

## Cập nhật ứng dụng

1. Sửa `thap-chi-tieu.html`
2. Chạy `./build.sh`
3. `git add -A && git commit -m "..." && git push`
