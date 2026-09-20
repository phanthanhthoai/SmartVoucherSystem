# Sử dụng Python phiên bản chính thức (nhẹ và ổn định)
FROM python:3.12-slim

# Thiết lập các biến môi trường để Python không ghi file .pyc và không buffer log
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Cài đặt các công cụ hệ thống cần thiết để biên dịch mysqlclient (nếu dùng)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Sao chép file requirements.txt vào trước để tận dụng Docker cache
COPY requirements.txt /app/

# Nâng cấp pip và cài đặt các thư viện Python
RUN pip install --upgrade pip && pip install -r requirements.txt

# Sao chép toàn bộ mã nguồn dự án vào container
COPY . /app/

# Chạy lệnh khởi động Django server mặc định
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
