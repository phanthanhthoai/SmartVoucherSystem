# SmartVoucherSystem

SmartVoucherSystem là ứng dụng quản lý và phân phối voucher, gồm API backend Django REST Framework và giao diện quản trị/khách hàng React, TypeScript, Vite.

## Thành phần

| Thư mục | Công nghệ | Trách nhiệm |
|---|---|---|
| `smartvoucher_backend/` | Django 5, Django REST Framework, Simple JWT | Tài khoản, đơn hàng, voucher, điều kiện áp dụng, phân phối, thống kê |
| `smartvoucher_frontend/` | React, TypeScript, Vite | Giao diện khách hàng và quản trị |
| Backend database | MySQL 8 (mặc định) | Dữ liệu ứng dụng; cấu hình qua biến môi trường |

Backend chia thành ba Django app:

- `users`: đăng ký, đăng nhập JWT, hồ sơ khách hàng, vai trò và quyền.
- `orders`: quản lý catalog sản phẩm, đồng bộ và hủy đơn hàng, lưu các dòng sản phẩm.
- `vouchers`: quản lý voucher, điều kiện, ví voucher, áp dụng/đổi voucher, phân phối và thống kê.

## Luồng nghiệp vụ chính

1. Khách hàng đăng ký và đăng nhập để nhận JWT. Khi đăng ký, backend thử cấp các voucher `welcome` đang có hiệu lực và phù hợp điều kiện.
2. Nhân viên/quản trị tạo voucher và rule, sau đó phân phối ngay hoặc tạo kế hoạch phân phối theo ngày phát hành. Điều kiện tích lũy chỉ tính đơn `paid`; số tiền tích lũy là tổng số khách đã trả sau khi trừ giảm giá. Đơn pending/hủy không được tính. Nếu không đặt mốc thời gian thì tính toàn bộ lịch sử; có thể giới hạn theo số ngày lùi hoặc tháng/năm (không kết hợp hai kiểu).
3. Với voucher có loại chiến dịch `order_success`, backend tự cấp cho khách ngay khi một đơn thanh toán thành công làm khách đạt điều kiện tích lũy. Voucher vẫn chỉ dùng được ở đơn tiếp theo. Các loại chiến dịch khác không tự cấp lại theo ngưỡng tích lũy.
4. Nhân viên/quản trị quản lý sản phẩm trong admin. Khách hàng xem danh mục sản phẩm đang bán; khi checkout, frontend chỉ gửi `product_id` và số lượng, backend lấy tên, loại và đơn giá từ database.
5. Checkout hiện đánh dấu đơn là `paid` ngay khi khách bấm xác nhận thanh toán. Nếu có voucher, backend kiểm tra lại điều kiện, redeem voucher và cập nhật số liệu trong cùng transaction; đơn được hiển thị đã thanh toán mà không cần xác nhận trong admin.
6. Các đơn đồng bộ từ hệ thống bên ngoài vẫn có thể ở trạng thái `pending` và được nhân viên/quản trị xác nhận sau khi kiểm tra giao dịch.

**Lưu ý:** chưa tích hợp cổng thanh toán; nút xác nhận ở checkout hiện mô phỏng thanh toán thành công và chuyển đơn sang `paid`. Khi tích hợp payment gateway, cần chỉ chuyển đơn sang `paid` sau khi backend xác minh callback/webhook đáng tin cậy. Sản phẩm được lưu trong database; các sản phẩm còn trong catalog JSON môi trường sẽ được nhập một lần khi chạy migration khởi tạo catalog.

Trong trang Quản lý khách hàng, chi tiêu tích lũy và số đơn được tính trực tiếp từ đơn `paid` (chi tiêu sau giảm giá); đây là số toàn thời gian. Điểm thưởng là trường riêng, không dùng để xét điều kiện tích lũy voucher. Mỗi voucher có thể áp dụng mốc thời gian và ngưỡng tích lũy riêng, nên số dùng để xét voucher có thể thấp hơn tổng toàn thời gian trong hồ sơ khách hàng.

## API chính

Các API nằm dưới `/api/`. API đăng nhập trả về access/refresh token; các API yêu cầu đăng nhập dùng header:

```http
Authorization: Bearer <access_token>
```

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Tài khoản | `POST /api/users/register/` | Công khai |
| JWT | `POST /api/users/login/`, `POST /api/users/refresh/` | Công khai |
| Hồ sơ/ví | `GET /api/users/me/`, `GET /api/users/vouchers-for-user/` | Đăng nhập |
| Quản lý người dùng | `/api/users/customers/`, `/api/users/staff/`, `/api/users/<id>/...` | Tùy endpoint; quản lý quyền/nhóm và tạo staff chỉ dành cho admin |
| Đơn hàng | `GET /api/orders/mine/`, `POST /api/orders/sync/` | Đăng nhập; lịch sử chỉ trả về đơn của tài khoản hiện tại; khách chỉ được đồng bộ đơn của mình; chỉ nhận `pending`/`canceled` |
| Danh sách đơn admin | `GET /api/orders/admin/` | Nhân viên/quản trị; hỗ trợ lọc `?status=pending\|paid\|canceled` |
| Hủy đơn | `POST /api/orders/cancel/` | Nhân viên/quản trị |
| Checkout | `POST /api/vouchers/checkout/` | Đăng nhập; tạo đơn `paid` ngay khi checkout thành công và redeem voucher trong cùng transaction |
| Catalog sản phẩm | `GET /api/products/` | Công khai; chỉ trả sản phẩm đang bán |
| Tạo sản phẩm | `POST /api/products/` | Nhân viên/quản trị |
| Sửa/ngừng bán sản phẩm | `PATCH/DELETE /api/products/<id>/` | Nhân viên/quản trị; DELETE là ngừng bán để giữ lịch sử |
| Áp dụng voucher | `POST /api/vouchers/apply/` | Đăng nhập |
| Danh mục sản phẩm voucher | `GET /api/vouchers/products/` | Nhân viên/quản trị; trả sản phẩm đang bán để cấu hình voucher theo sản phẩm |
| Xác nhận đơn đồng bộ | `POST /api/vouchers/orders/<order_id>/confirm/` | Nhân viên/quản trị; dùng cho đơn `pending` đồng bộ từ hệ thống bên ngoài; đơn checkout đã được tự động xác nhận |
| Chiến dịch | `GET/POST /api/vouchers/campaigns/`, `GET/PATCH/DELETE /api/vouchers/campaigns/<id>/` | Nhân viên/quản trị; không xóa được chiến dịch đã gắn voucher |
| Quản lý/phân phối voucher | `/api/vouchers/create/`, `/api/vouchers/create-and-distribute/`, `/api/vouchers/distribute/` | Nhân viên/quản trị |
| Người nhận/thống kê | `/api/vouchers/<id>/recipients/`, `/api/vouchers/stats/...` | Phần lớn là nhân viên/quản trị |
| Thống kê công khai | `GET /api/vouchers/stats/overview/public/` | Công khai |

Danh sách URL đầy đủ và phương thức được định nghĩa tại `smartvoucher_backend/users/urls.py`, `smartvoucher_backend/orders/urls.py` và `smartvoucher_backend/vouchers/urls.py`. Postman collection/environment nằm trong `smartvoucher_backend/`.

## Chạy dự án bằng Docker

Yêu cầu Docker Compose. Trong PowerShell:

```powershell
Set-Location .\smartvoucher_backend
Copy-Item .env.example .env
```

Chỉnh `.env` với thông tin database, Django secret key và email của môi trường. Sau đó chạy:

```powershell
docker compose up --build
```

Compose khởi động MySQL, Django backend và worker chạy lịch phân phối voucher. Migrations được chạy khi backend/worker khởi động. Backend mặc định ở `http://localhost:8000`, MySQL được ánh xạ ra cổng `3307`.

Để tạo tài khoản quản trị đầu tiên, điền `SMARTVOUCHER_ADMIN_USERNAME`, `SMARTVOUCHER_ADMIN_EMAIL` và `SMARTVOUCHER_ADMIN_PASSWORD` trong `.env`, rồi chạy `docker compose exec web python manage.py seed_admin`. Lệnh không có sẵn mật khẩu mặc định và kiểm tra password theo validators của Django.

## Chạy frontend

Mở terminal khác:

```powershell
Set-Location .\smartvoucher_frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite proxy các request `/api` và `/media` tới backend tại `http://127.0.0.1:8000`.

## Chạy backend trực tiếp

Có thể chạy backend ngoài Docker nếu đã cài Python 3.12 và MySQL. Tạo môi trường ảo, cài dependencies, cấu hình `.env` (khi dùng MySQL trong Docker, đặt `DB_HOST=127.0.0.1`, `DB_PORT=3307`), rồi chạy:

```powershell
Set-Location .\smartvoucher_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Mở terminal backend thứ hai để chạy worker lịch phân phối:

```powershell
python manage.py run_voucher_scheduler
```

Catalog thử nghiệm có thể khai báo trong `PRODUCT_CATALOG_JSON` của `.env` để được nhập vào database khi chạy migration catalog lần đầu. Sau đó, quản lý sản phẩm tại trang admin; checkout chỉ nhận `product_id` và `quantity`, backend bỏ qua tên, loại sản phẩm và đơn giá do client gửi.

Để chạy test với SQLite thay vì MySQL trong PowerShell:

```powershell
Set-Location .\smartvoucher_backend
$env:DB_ENGINE = "django.db.backends.sqlite3"
$env:DB_NAME = ":memory:"
$env:CACHE_BACKEND = "django.core.cache.backends.locmem.LocMemCache"
python manage.py test users.tests orders.tests vouchers.tests
```

Lệnh trên chạy một số module test cụ thể, tránh unrestricted discovery; thư mục backend có các script debug `test_*.py` khởi động development server khi được import.

## Cấu hình môi trường

Tham khảo `smartvoucher_backend/.env.example`. Các biến chính:

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CORS_ALLOWED_ORIGINS` hoặc `CORS_ALLOW_ALL_ORIGINS`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `VOUCHER_WEBHOOK_URL`, `VOUCHER_WEBHOOK_TIMEOUT_SECONDS`
- `CACHE_BACKEND`, `CACHE_LOCATION` và các giới hạn redemption `VOUCHER_REDEMPTION_*`
- `PRODUCT_CATALOG_JSON`: catalog JSON tùy chọn để nhập dữ liệu ban đầu vào database khi chạy migration catalog; không dùng làm nguồn giá checkout sau khi nhập
- `SMARTVOUCHER_ADMIN_USERNAME`, `SMARTVOUCHER_ADMIN_EMAIL`, `SMARTVOUCHER_ADMIN_PASSWORD`: dùng một lần khi tạo admin đầu tiên

Cache mặc định dùng Redis để các worker chia sẻ bộ đếm giới hạn redemption. Docker Compose khởi chạy Redis và lưu dữ liệu Redis trong volume riêng; cấu hình kết nối qua `CACHE_BACKEND` và `CACHE_LOCATION`. Khi chạy backend trực tiếp ngoài Docker, cần có Redis sẵn sàng tại địa chỉ cấu hình. Có thể đặt `CACHE_BACKEND=django.core.cache.backends.locmem.LocMemCache` riêng cho môi trường test hoặc phát triển đơn tiến trình. Không sử dụng secret mặc định, `DEBUG=True`, mật khẩu mẫu hoặc cấu hình CORS mở trong production.

Ảnh sản phẩm được tải lên từ trang quản trị và lưu dưới `MEDIA_ROOT` (`media/` trong Docker Compose, được giữ bằng volume). Môi trường production cần cấu hình web server hoặc object storage để phục vụ URL `/media/`; không nên dùng Django `DEBUG=True` để phục vụ file.

Frontend Vite mặc định chạy ở cổng `5173`; hai origin này đã có trong `.env.example`.

## Giới hạn và triển khai thật

- Cần tích hợp catalog sản phẩm thực tế nếu không quản lý trực tiếp trong admin và chọn/triển khai payment gateway để tự động xác minh giao dịch.
- Dùng Redis/cache dùng chung khi chạy nhiều worker để giới hạn redemption nhất quán; Docker Compose đã cấu hình Redis.
- Cấu hình lưu trữ file media bền vững (ví dụ object storage) nếu triển khai nhiều máy hoặc cần mở rộng backend.
- Dùng secret key, email và CORS phù hợp môi trường; không dùng mật khẩu mặc định, `DEBUG=True` hoặc `CORS_ALLOW_ALL_ORIGINS=True` trong production.
