FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STREAMLIT_SERVER_PORT=7860 \
    STREAMLIT_SERVER_ADDRESS=0.0.0.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . /app/

# Install the project and dependencies
RUN pip install -U pip && pip install -e ".[dev]"

# Expose the port HF expects
EXPOSE 7860

# Run the Streamlit UI
CMD ["streamlit", "run", "chat_ui.py", "--server.port", "7860", "--server.address", "0.0.0.0"]
