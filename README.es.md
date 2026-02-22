# 📐 Axioma

> El Framework de Desarrollo Spec-Driven para Agentes de IA.
> Rigor sobre velocidad. Ingeniería sobre impulsividad.

[![Status](https://img.shields.io/badge/Status-RFC-orange.svg)](#-únete-a-la-discusión-rfc)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/Stack-AI_Agents_%7C_MCP-success.svg)](#%EF%B8%8F-stack-tecnológico)
[![Lang](https://img.shields.io/badge/Version-English-yellow.svg)](README.md)
[![Lang](https://img.shields.io/badge/Versi%C3%B3n-Espa%C3%B1ol-yellow.svg)](README.es.md)

Axioma es un framework de arquitectura y una metodología diseñada para transformar a los agentes de IA en ingenieros de software rigurosos. Se basa en la premisa de que la ambigüedad es el fallo del sistema y la **Especificación (Spec)** es la única fuente de verdad innegociable.

---

## 🌟 La Visión: Esclavos de Código vs. Ingenieros de Software

El desarrollo asistido por IA hoy sufre de "hiper-actividad":
*   ❌ **Estado Actual (Agentes como "Code Slaves"):** Los agentes escriben código antes de entender realmente el problema, lo que genera deuda técnica, alucinaciones y regresiones.
*   ✅ **Axioma (Agentes como Ingenieros de Software):** Impone un flujo de ingeniería basado en contratos y el ciclo 🟢🔴🟢 (TDD para Agentes). **No se permite escribir una sola línea de código sin una validación previa de la lógica, el alcance y la capacidad de prueba (testability).**

---

## 🔄 El Flujo Axiomático: Vibe Coding y Autonomía

Axioma une lo mejor del mundo conversacional interactivo ("Vibe Coding") con el rigor de la ingeniería de software clásica ("Fire and Forget"). Ejecuta un estricto protocolo dividido por una **Frontera de Aprobación Humana**:

```mermaid
graph TD
    User([Petición del Usuario]) --> A
    
    subgraph Fase 1: Vibe Coding (Chatbot Interactivo)
    A[The Archivist] -- MCP --> Repo[(Repositorio)]
    A -.->|Aclarar Ambigüedad| User
    A --> B[The Blueprint]
    B --> Spec[.spec.md / Ledger]
    B -.->|Refinar Diseño| User
    end
    
    Spec ===>|Frontera de Aprobación Humana| C
    
    subgraph Fase 2: Fire and Forget (Flujo Autónomo)
    C{The Censor} -->|Veto| A
    C -->|Aprobado| J[The Justice]
    J --> Tests((Tests))
    Tests -->|Debe Fallar 🔴| M
    M[The Mason] --> Src{src/}
    Src -->|Tests Pasan 🟢| Done([Código Desplegable])
    Src -->|Tests Fallan 🔴| M
    end
```

### 🎭 El Elenco: Agentes Especializados

Axioma opera mediante una jerarquía de agentes con roles y responsabilidades innegociables:

**🗣️ Los Agentes de Diseño / Chatbot (Fase 1):**
1.  **The Archivist (El Guardián del Contexto):** Reduce la incertidumbre a cero. Entrevista al usuario, analiza el repositorio mediante MCP y detecta dependencias. No asume; pregunta.
2.  **The Blueprint (El Arquitecto):** Traduce la intención en un archivo `.spec.md` estructurado y define las fixtures (datos sintéticos).

**🤖 Los Constructores Autónomos (Fase 2):**
3.  **The Censor (El Auditor):** Posee poder de veto. Rechaza la Spec si es ambigua, si el alcance es demasiado grande o si rompe reglas invariantes del sistema.
4.  **The Justice (El Juez):** Crea los tests y asegura que fallen (Paso Rojo) antes de permitir cualquier implementación. Es el garante de la verdad.
5.  **The Mason (El Constructor):** El artesano que implementa el código mínimo necesario para satisfacer a The Justice.

---

## 🛠️ Stack Tecnológico

Axioma está diseñado para ser agnóstico pero potenciado por un core de alto rendimiento:

*   **Motor:** Google Gen AI SDK (Gemini 2.0+).
*   **Capacidad:** Soporte nativo de **Model Context Protocol (MCP)** para interactuar de forma segura con el sistema de archivos, Git y el entorno de ejecución.
*   **Seguridad:** Control de estado mediante un **Ledger (Libro de registro)** inyectado en la propia Spec para una trazabilidad total.

---

## 📂 Estructura del Proyecto

Vista general de la estructura:

```text
/tu-proyecto
├── .axioma/
│   └── prompts/       # Prompts de sistema personalizables para los agentes
├── docs/specs/        # Fuente de la Verdad (.spec.md)
├── docs/fixtures/     # Datos sintéticos vinculados a las specs
└── src/               # Código implementado y validado
```

---

## 📚 Deep Dive (Arquitectura)

Si quieres entender la mecánica rigurosa detrás de Axioma, lee nuestros documentos de arquitectura core:

1.  **[El Estándar Manifest y el Ledger](docs/architecture/01-the-manifest.md):** Por qué el `.spec.md` es la única fuente de verdad.
2.  **[El Elenco de Agentes](docs/architecture/02-the-agents.md):** Análisis profundo de los "Invariants" (reglas inquebrantables) de cada agente especializado.
3.  **[Integración MCP y Seguridad](docs/architecture/03-mcp-integration.md):** Cómo aislamos el acceso para prevenir la destrucción del sistema local.
4.  **[El Bucle Red-Green-Refactor](docs/architecture/04-the-red-green-refactor-loop.md):** El flujo obligatorio de TDD y el `git rollback` automático.

---

## 🤝 Únete a la Discusión (RFC)

Axioma es actualmente un **RFC (Request For Comments)**. No buscamos solo código; buscamos pensamiento crítico y visionarios.

**¿Qué perfiles buscamos?**
*   **Arquitectos de Software** para ayudar a definir el estándar del archivo `.spec.md`.
*   **Prompt Engineers** para calibrar a *The Censor* y formular sus criterios de veto.
*   **Desarrolladores MCP** para construir servidores de acceso seguro y lectura/escritura.

¿Crees en un futuro donde la IA escriba código de calidad industrial? Ayúdanos a definir el estándar.

👉 **[Ve a GitHub Discussions](https://github.com/axioma-framework/axioma/discussions) para participar.**

---

## 📄 Licencia
Este proyecto está bajo la [Licencia Apache 2.0](LICENSE).
