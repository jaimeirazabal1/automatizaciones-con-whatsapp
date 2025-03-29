# Planificación de Sprints

Este documento detalla la planificación de sprints para el desarrollo del bot de WhatsApp, incluyendo el desglose de tareas, estimaciones y criterios de aceptación.

## Estimación de Esfuerzo (EE)

Utilizamos una escala del 1 al 5 para estimar el esfuerzo requerido para cada tarea:

| EE | Descripción | Horas aproximadas |
|----|-------------|-------------------|
| 1  | Muy simple  | 4 horas           |
| 2  | Simple      | 8 horas           |
| 3  | Medio       | 12 horas          |
| 4  | Complejo    | 16 horas          |
| 5  | Muy complejo| 20 horas          |

## Sprints Planificados

### Sprint 1: Configuración y Funcionalidades Básicas (2 semanas)
- Configuración del proyecto y dependencias (EE: 1) - 4h
- Implementación de autenticación QR (EE: 2) - 8h
- Sistema básico de respuestas a mensajes (EE: 3) - 12h
- Persistencia de sesión básica (EE: 2) - 8h
- Pruebas e integración (EE: 2) - 8h
- **Total horas estimadas**: 40h

### Sprint 2: Funcionalidades Avanzadas (2 semanas)
- Sistema de comandos avanzado (EE: 3) - 12h
- Manejo de multimedia básico (EE: 4) - 16h
- Mensajes programados (EE: 3) - 12h
- Gestión básica de grupos (EE: 3) - 12h
- Pruebas e integración (EE: 2) - 8h
- **Total horas estimadas**: 60h

### Sprint 3: Panel de Administración (2 semanas)
- Diseño de interfaz administrativa (EE: 4) - 16h
- Backend para panel admin (EE: 4) - 16h
- Integración de panel con funcionalidades del bot (EE: 3) - 12h
- Pruebas e integración (EE: 3) - 12h
- **Total horas estimadas**: 56h

### Sprint 4: Mejoras y Optimizaciones (2 semanas)
- Reglas personalizables (EE: 5) - 20h
- Funcionalidades avanzadas de grupo (EE: 4) - 16h
- Mejoras de rendimiento (EE: 3) - 12h
- Documentación completa (EE: 2) - 8h
- Pruebas finales (EE: 2) - 8h
- **Total horas estimadas**: 64h

## Criterios de Definición de Hecho (DoD)

Para considerar una tarea como completada, debe cumplir con los siguientes criterios:

1. **Código completado**: Todos los elementos de la tarea están codificados
2. **Documentación**: Código y funcionalidades documentadas adecuadamente
3. **Pruebas**: Se han realizado pruebas unitarias y funcionales
4. **Revisión de código**: El código ha sido revisado por al menos un miembro del equipo
5. **Integración**: Funciona correctamente con el resto del sistema
6. **Dockerización**: La funcionalidad funciona correctamente en el entorno Docker

## Dependencias entre Sprints

La planificación tiene en cuenta las siguientes dependencias:

- El Sprint 2 requiere que se complete el Sprint 1
- El Sprint 3 puede comenzar una vez completada la mayor parte del Sprint 2
- El Sprint 4 requiere que se complete el Sprint 3

## Riesgos Identificados

- **Limitaciones de WhatsApp**: WhatsApp puede cambiar su API web, requiriendo adaptaciones
- **Bloqueo de cuentas**: Riesgo de bloqueo por uso automatizado intensivo
- **Consumo de recursos**: Puppeteer y Chrome pueden requerir más recursos de los estimados inicialmente

## Ajustes a la Planificación

Esta planificación es flexible y se ajustará según:

- Retroalimentación al final de cada sprint
- Cambios en los requerimientos del cliente
- Limitaciones técnicas descubiertas durante el desarrollo
- Disponibilidad del equipo

## Estimación Total del Proyecto

- **Total de sprints**: 4
- **Duración total**: 8 semanas
- **Horas totales estimadas**: 220 horas 