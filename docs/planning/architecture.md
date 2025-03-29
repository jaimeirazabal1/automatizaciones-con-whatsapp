# Arquitectura del Bot de WhatsApp

## Visión general

Este documento describe la arquitectura de software del bot de WhatsApp, desarrollado con Node.js y whatsapp-web.js. La arquitectura sigue un patrón de capas que separa las responsabilidades y facilita el mantenimiento y la evolución del sistema.

## Diagrama de arquitectura

```
┌───────────────────────────────────┐
│           Cliente Web             │
│   (Interfaz de administración)    │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│           API REST                │
│      (Express.js / Node.js)       │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│        Capa de Servicios          │
│   WhatsAppService, SchedulerService│
└───────────────┬───────────────────┘
                │
                ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Cliente WhatsApp   │     │  Base de Datos      │
│  (whatsapp-web.js)  │     │  (MongoDB)          │
└─────────────────────┘     └─────────────────────┘
```

## Componentes principales

### 1. Cliente WhatsApp
- **Responsabilidad**: Gestiona la conexión con WhatsApp Web mediante Puppeteer.
- **Componentes clave**: 
  - `Client` de whatsapp-web.js
  - Autenticación mediante código QR
  - Gestión de sesiones con LocalAuth
  - Manejo de eventos de WhatsApp (mensajes, conexión, etc.)

### 2. Capa de Servicios
- **Responsabilidad**: Encapsula la lógica de negocio de la aplicación.
- **Componentes clave**:
  - `WhatsAppService`: Maneja operaciones de WhatsApp (envío de mensajes, gestión de chats, etc.)
  - `SchedulerService`: Gestiona la programación de mensajes usando node-cron
  - Futuros servicios: ContactService, GroupService, etc.

### 3. API REST
- **Responsabilidad**: Proporciona endpoints para interactuar con el bot desde aplicaciones externas.
- **Componentes clave**:
  - Express.js como framework web
  - Endpoints para programar mensajes, gestionar grupos, etc.
  - Autenticación y autorización (pendiente)

### 4. Base de Datos
- **Responsabilidad**: Almacena datos persistentes del sistema.
- **Componentes clave**:
  - MongoDB como base de datos NoSQL
  - Modelos Mongoose para:
    - Mensajes recibidos
    - Mensajes programados
    - Configuración del bot (pendiente)
    - Usuarios y permisos (pendiente)

### 5. Cliente Web (Futuro)
- **Responsabilidad**: Interfaz de usuario para gestionar el bot.
- **Tecnologías potenciales**:
  - React/Vue.js para el frontend
  - Autenticación JWT
  - Paneles de administración y estadísticas

## Patrones de diseño aplicados

1. **Patrón de Capas**: Separación de responsabilidades en capas (presentación, servicios, datos).
2. **Inyección de Dependencias**: Los servicios reciben dependencias externas como el cliente de WhatsApp.
3. **Singleton**: Instancia única del cliente de WhatsApp y servicios principales.
4. **Observador**: Uso del patrón observador a través de eventos para manejar notificaciones de WhatsApp.
5. **Repositorio**: Abstracción del acceso a datos mediante modelos Mongoose.

## Consideraciones de escalabilidad

- Los mensajes programados se almacenan en base de datos, permitiendo que se restauren en caso de reinicio.
- La arquitectura permite distribuir la carga en múltiples instancias si es necesario.
- El uso de Docker facilita el despliegue y la escalabilidad horizontal.

## Limitaciones conocidas

- WhatsApp no permite múltiples sesiones con el mismo número.
- WhatsApp puede bloquear cuentas que muestren comportamientos automatizados intensivos.
- La dependencia de Puppeteer implica requisitos de recursos significativos.

## Evolución futura

1. **Fase 1**: Funcionalidades básicas y programación de mensajes (Actual)
2. **Fase 2**: Sistema avanzado de comandos y gestión multimedia
3. **Fase 3**: Panel de administración web
4. **Fase 4**: Reglas personalizables y automatizaciones avanzadas
5. **Fase 5**: Integraciones con sistemas externos y APIs 