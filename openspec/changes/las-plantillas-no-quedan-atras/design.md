---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — las-plantillas-no-quedan-atras

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `.claude/skills/projects-release/SKILL.md` | canónico | procedimiento del marco |
| `pruebas/docs/plantillas-al-dia.test.mjs` | canónico | banco del marco |

Nada viaja al consumidor.

## Por qué en el release y no en el CI

El momento del riesgo es **exactamente** el release: es cuando el marco avanza y las
plantillas no. Un check de CI que corriera en cada PR consultaría GitHub decenas de
veces al día para responder una pregunta que sólo cambia cuando se publica.

## Por qué el banco no consulta GitHub, y qué se pierde con eso

El banco corre sin red ni dependencias. Una compuerta que depende de un tercero se
pone roja por motivos ajenos, y el marco ya desconfía de eso por escrito: el censo
de consumidores no se cuelga de Dependabot justamente por depender «del
comportamiento de un tercero que el marco no puede verificar».

**Lo que se pierde, declarado:** esto **no impide** publicar con las plantillas
atrasadas. Impide que el paso desaparezca del procedimiento. Es enforcement sobre el
procedimiento, no sobre el resultado — y decirlo así es más honesto que llamarlo
compuerta.

## La lista se deriva

El banco no escribe «plantilla-sitio, plantilla-aplicacion»: las lee de `PLANTILLAS`
en `herramientas/projects-plantilla-repos.mjs`, que es la que las genera. El día que
aparezca una tercera forma, el caso se pone rojo hasta que el release la nombre.

Sin eso, agregar una forma nueva dejaría un consumidor sin verificar y el banco
seguiría en verde — que es la forma exacta en que estos huecos aparecen.

## La segunda comprobación, que no es obvia

Además del pin, se verifica `is_template`. Un repositorio que deja de ser plantilla
rompe el botón *Use this template* que `docs/04` manda apretar, y **el error que ve
la persona no menciona al marco por ningún lado**: ve un repo normal y no entiende
por qué la guía le habla de un botón que no está.
