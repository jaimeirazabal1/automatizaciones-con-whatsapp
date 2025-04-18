FROM node:18

# Instalamos las dependencias necesarias para Puppeteer
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Asegurarse que las dependencias necesarias están instaladas
RUN npm install express-validator cookie-parser
RUN npm install puppeteer

# Instalamos las dependencias con una configuración más robusta
# Incluimos puppeteer en la instalación normal
RUN npm install --no-optional --legacy-peer-deps && \
    npm cache clean --force

# Copiamos el resto del código
COPY . .

# Creamos directorios necesarios para la sesión
RUN mkdir -p /app/session

# Exponemos el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"] 