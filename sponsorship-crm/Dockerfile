# Fly.io (and any other container host) build.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    CRM_DB_PATH=/data/crm.db

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The SQLite file lives on a mounted volume so deploys never wipe the ledger.
RUN mkdir -p /data

EXPOSE 8080

CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:8080", \
     "--workers", "1", "--threads", "4", "--timeout", "60", "--access-logfile", "-"]
