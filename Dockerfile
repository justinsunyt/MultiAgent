FROM python:3.11.6

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    sudo \
    git \
    bzip2 \
    libx11-6 \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
WORKDIR /app

COPY . /app/
RUN pip install -r requirements.txt

CMD ["gunicorn", "main:app", "--bind", "[::]:8080", "--timeout", "0", "-k", "uvicorn.workers.UvicornWorker"]