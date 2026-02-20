# 📐 Axioma
> El Framework de Desarrollo Spec-Driven para Agentes de IA. > Rigor sobre velocidad. Ingeniería sobre impulsividad.
> 

Axioma es un framework de arquitectura y una metodología diseñada para transformar a los agentes de IA en ingenieros de software rigurosos. Se basa en la premisa de que la ambigüedad es el fallo del sistema y la Especificación (Spec) es la única fuente de verdad innegociable.

## 🌟 La Visión
El desarrollo asistido por IA hoy sufre de "hiper-actividad": los agentes escriben código antes de entender realmente el problema, lo que genera deuda técnica, alucinaciones y regresiones.
Axioma impone un flujo de ingeniería basado en contratos y el ciclo 🟢🔴🟢 (TDD para Agentes). No se permite escribir una sola línea de código sin una validación previa de la lógica, el alcance y la capacidad de prueba (testability).

## 🎭 El Elenco: Agentes Especializados
Axioma opera mediante una jerarquía de agentes con roles y responsabilidades innegociables:
 * The Archivist (El Guardián del Contexto): Reduce la incertidumbre a cero. Entrevista al usuario, analiza el repositorio mediante MCP y detecta dependencias. No asume; pregunta.
 * The Blueprint (El Arquitecto): Traduce la intención en un archivo .spec.md estructurado y define las fixtures (datos sintéticos).
 * The Censor (El Auditor): Posee poder de veto. Rechaza la Spec si es ambigua, si el alcance es demasiado grande o si rompe reglas invariantes del sistema.
 * The Justice (El Juez): Crea los tests y asegura que fallen (Paso Rojo) antes de permitir cualquier implementación. Es el garante de la verdad.
 * The Mason (El Constructor): El artesano que implementa el código mínimo necesario para satisfacer a The Justice.

## 🔄 El Flujo Axiomático
Axioma no solo "chatea" con el código; ejecuta un protocolo de confianza:
 * Fase de Indagación: Identificación de archivos involucrados y reducción de ambigüedad.
 * Redacción: Generación del Axioma Manifest (.spec.md).
 * Auditoría: Validación de calidad por parte de The Censor.
 * El Juicio: Generación de tests unitarios o de integración que deben fallar inicialmente.
 * Construcción: Implementación de código y rollback automático vía Git si los tests no pasan.

## 🛠️ Stack Tecnológico
Axioma está diseñado para ser agnóstico pero potenciado por un core de alto rendimiento:
 * Motor: Google Gen AI SDK (Gemini 2.0+).
 * Capacidad: Soporte nativo de Model Context Protocol (MCP) para interactuar de forma segura con el sistema de archivos, Git y el entorno de ejecución.
 * Seguridad: Control de estado mediante un Ledger (Libro de registro) inyectado en la propia Spec para una trazabilidad total.

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

## 🤝 Únete a la Discusión
Axioma es actualmente un RFC (Request For Comments). No buscamos solo código; buscamos pensamiento crítico. Como creador del framework, he abierto debates técnicos en la pestaña de Discussions sobre:
 * [ ] Definición del Estándar del Manifest (.spec.md).
 * [ ] Criterios de veto para The Censor.
 * [ ] Seguridad y permisos para servidores MCP con acceso de escritura.
¿Crees en un futuro donde la IA escriba código de calidad industrial? Ayúdanos a definir el estándar.

## 📄 Licencia
Este proyecto está bajo la Licencia Apache 2.0.
¿Qué te parece? Si estás de acuerdo, podemos proceder a crear el "System Prompt" de The Archivist para que la gente vea cómo empieza a ejecutarse el primer paso de Axioma.
