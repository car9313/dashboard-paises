## Qué cambia

<!-- Una frase. Si no cabe, probablemente son dos PRs. -->

## Por qué

<!-- El problema o la decisión. Si es una decisión de arquitectura, enlaza el ADR. -->

## Cómo se probó

- [ ] `pnpm verify` en local (tipos · lint · cobertura · build · presupuesto)
- [ ] `pnpm e2e` si toca UI o flujo crítico
- [ ] Captura antes/después si cambia la interfaz

## Checklist

- [ ] Sin `any` ni `fetch` directo fuera de `core/`
- [ ] Datos del servidor solo en TanStack Query; UI/sesión solo en Zustand
- [ ] Sin `useEffect` para estado derivado
- [ ] Tokens del sistema de diseño, sin hex sueltos
- [ ] Docs actualizados si cambia el contrato, el plan o una decisión
- [ ] Nombres y comentarios en español donde describen dominio; identificadores en inglés
