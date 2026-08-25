# Forkear el marco a otra cuenta

Un fork del marco **sigue ejecutando las actions de la cuenta original**, y no hay
nada que lo denuncie: el CI del fork sale verde. Es la clase de cosa que solo se ve
cuando alguien la busca, y por eso esta página existe.

**De dónde sale esto, y de dónde no.** El mecanismo está medido en este árbol: los
comandos de más abajo enumeran, hoy, cada línea que lleva la cuenta escrita a mano.
Lo que **no** hay es un incidente registrado —ni entrada de CHANGELOG, ni fila de
[reglas-no-escritas.md](reglas-no-escritas.md), ni commit— de que esto le haya pasado
a alguien. La página se sostiene por lo que se puede contar con `grep`, no por una
anécdota.

**Para quién es esta página.** Para quien va a **copiar el marco entero a otra
cuenta de GitHub** y tiene que dejarlo apuntando a la cuenta nueva. **Es una
página técnica y muy acotada**: si no estás haciendo eso, no es tuya.

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[andamio](glosario.md), [builder](glosario.md), [bump](glosario.md),
[censo](glosario.md), [change](glosario.md), [CODEOWNERS](glosario.md),
[delta](glosario.md), [guardrail](glosario.md), [marcador](glosario.md),
[PO](glosario.md), [pin](glosario.md), [reusable](glosario.md),
[scaffold](glosario.md).

⚠️ **Y forkear el marco no es una salida para un proyecto.** [`AGENTS.md`](../AGENTS.md)
lo lista entre lo que no se hace nunca («Hacer fork de Projects para un proyecto»),
por el mismo motivo por el que un proyecto no copia el marco: desde el momento en que
existen dos copias, la divergencia es cuestión de tiempo y la corrección de un
incidente deja de propagarse. Esta página **es para quien se lleva el marco entero a
otra cuenta u organización** —que es otro caso, y no lo resuelve un `Ctrl+C`—, no para
quien adopta el marco en un proyecto: eso es
[arrancar-un-proyecto.md](arrancar-un-proyecto.md).

## Por qué no hay un rojo que lo avise

GitHub resuelve un `uses: <cuenta>/<repo>/<ruta>@<ref>` contra la cuenta que dice el
texto, **no** contra el repositorio donde está el workflow. No existe una forma
relativa: `uses: ./actions/x` sólo funciona para una action del checkout del propio
job, y el marco no la puede usar porque cuando un consumidor llama al reusable, **el
árbol checkouteado es el del consumidor**.

Consecuencia: cada `uses:` del marco lleva la cuenta escrita a mano. Un fork se lleva
esas líneas tal cual, y el resultado es un fork que corre código de la cuenta que
forkeó — con su versión, sus arreglos y sus cambios. Si la cuenta original es privada
y el fork no tiene acceso, falla con «repositorio no encontrado», que parece un typo.
Si tiene acceso, **funciona**, y ese es el caso peligroso: nadie se entera.

## 1. Lo que el fork EJECUTA de la cuenta original

Son las únicas líneas que corren de verdad, y son **dos**:

```bash
git ls-files -z -- '.github/workflows/*' \
  | xargs -0 grep -nE '^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*"?im-diego-ec/'
```

Al 2026-08-24 devuelve dos líneas de `.github/workflows/marco-ci.yml`:
`actions/guardrail-deltas@v1` y `actions/constitucion@v1.7.0`. **Las dos hay que
reescribirlas con la cuenta del fork**, y es lo primero que se hace: hasta que eso
pase, el fork no es un marco, es un cliente del marco de al lado.

⚠️ **Y con ellas viajan los tags.** La primera va por `@v1` y la segunda por una
versión exacta; los dos refs tienen que existir **en el fork**. Un fork hecho por el
botón de GitHub se los lleva; uno hecho clonando y empujando a un repo vacío, **no**,
salvo que el push lleve `--tags`. Comprobalo en el fork:

```bash
git ls-remote --tags origin | grep -E 'refs/tags/(v1|v1\.[0-9]+\.[0-9]+)$'
```

Si `v1` no está, el job de deltas del fork falla con `Unable to resolve action`. Ese
tag no es decorativo y no se puede retirar: `marco-ci.yml` referencia a una de sus
propias actions hermanas por `@v1` porque GitHub no admite expresiones en `uses:`, y
pinar la versión que se está cortando pondría en rojo al PR que la corta.

## 2. Lo que el fork REPARTE con la cuenta original adentro

El andamio consume el marco por `uses:`, y ahí la cuenta no está escrita: está el
marcador `{{ORG}}`.

```bash
git ls-files -z -- 'plantilla/*' \
  | xargs -0 grep -nE '^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*"?\{\{ORG\}\}/Projects'
```

Al 2026-08-24 son **cinco** líneas, en `ci.yml` y `actualizar-marco.yml`.

🛑 **Y acá está la trampa, que es de diseño y hay que decirla:** `{{ORG}}` es **la
organización del proyecto**, y el andamio la usa **también** como dueño del marco. O
sea que el scaffold asume que el marco vive en la misma cuenta que los proyectos que
lo consumen. Mientras eso sea cierto, funciona; en cuanto el fork viva en otra cuenta
—que es el caso normal de un fork— cada proyecto nuevo nace apuntando al lugar
equivocado, y el error que ve es «repositorio no encontrado», indistinguible de un
typo en el nombre del repo.

**Lo que se puede hacer hoy, sin tocar la herramienta:** revisar esas cinco líneas
después de correr `projects init` y antes del primer push. Se ve con un comando en el
repo recién instanciado:

```bash
grep -rnE '^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*"?[^ "]+/Projects' .github/workflows/
```

**Lo que falta para que no dependa de que alguien se acuerde**, y es la versión
derivada: un marcador propio para el dueño del marco —separado de `{{ORG}}`— que
`herramientas/projects-init.mjs` pida en `REQUERIDOS` y que por defecto sea la cuenta
del clon desde el que se corre. Es un cambio de `herramientas/` y de `plantilla/`, o
sea un change de OpenSpec, y no entra por esta página.

## 3. Lo que apunta a la cuenta original y NO se ejecuta

El resto de las apariciones son prosa, ejemplos y comandos de diagnóstico. No rompen
nada, pero un fork que las deje manda a su gente a la cuenta de al lado. La lista
entera:

```bash
git ls-files -z | xargs -0 grep -nE 'im-diego-ec'
```

Son decenas y **la cifra no se escribe acá a propósito**: crece con cada documento
que cita un `uses:`, y esta misma página suma varias. El comando es el dato. De todo
lo que devuelve, lo que merece atención propia por lo que **hace** —y no por lo que
dice— son tres archivos:

| Dónde | Qué pasa si no se cambia | Cómo se ve |
|---|---|---|
| `.github/CODEOWNERS` | Las reglas nombran equipos con el prefijo de la cuenta original (`@im-diego-ec/builders`, `@im-diego-ec/po`). En otra cuenta esos equipos no existen, y **GitHub no rechaza un CODEOWNERS malformado: ignora la línea y no asigna a nadie**. El review cruzado y el gate del PO desaparecen en silencio | `grep -n '@im-diego-ec' .github/CODEOWNERS` |
| `actions/aviso-version/aviso-version.mjs` | El repositorio tiene un **default cableado** para cuando `GITHUB_REPOSITORY` no está. Fuera de Actions, el aviso saldría nombrando el repo original | `grep -n 'im-diego-ec' actions/aviso-version/aviso-version.mjs` |
| `actions/constitucion/cableado.mjs` | El job que el mensaje de fallo ofrece **para pegar** trae la cuenta original. El check en sí es agnóstico —matchea el segmento `actions/constitucion`, no el dueño—, así que un consumidor del fork pasa igual; lo que queda mal es el snippet que se copia | `grep -n 'im-diego-ec' actions/constitucion/cableado.mjs` |

Que el check de cableado sea agnóstico al dueño es deliberado y conviene no perderlo:
es lo que hace que un fork pueda verificar a sus propios consumidores sin reescribir
la lógica.

## 4. Lo que no es texto, y por eso no sale en ningún grep

- **`Settings → Actions → General → Access`.** Si el fork es privado y sus
  consumidores también, hay que dejarlo en *«Accessible from repositories in the
  organization»*. Sin eso, el consumidor falla con un error de repositorio no
  encontrado que parece un typo en la ruta. Requiere un plan que soporte compartir
  Actions entre repos privados.
- **El acceso de Dependabot al fork.** Es un ajuste de la **organización** (`Settings
  → Code security → Dependabot → repository access`), no del repo. Sin eso los
  consumidores no reciben PRs de bump — y como el PR de bump **es** el canal de
  distribución y el censo, el fork queda sin canal y sin censo, en silencio. Ver
  [censo-de-consumidores.md](censo-de-consumidores.md).
- **El secret `AVISO_VERSION_DESTINO`.** Los secrets no se forkean. Sin él, cada
  release del fork se publica sin avisarle a ningún consumidor; el workflow lo dice
  con un `::warning::` ruidoso y deja el mensaje en el resumen de la corrida, así que
  esto **sí** avisa.

## 5. Lo que NO hay que cambiar, y por qué

**El nombre del repositorio: `Projects`, con mayúscula.** Es la única pieza de esta
página que conviene dejar quieta, y no es estilo. Los escaneos que el marco corre
sobre sí mismo para comprobar que sus referencias estén pinadas van **por texto y por
el nombre del repo**, no por el dueño: `pruebas/andamio/pinado.test.mjs` busca
`projects/<algo>@<ref>` sin distinguir mayúsculas y **sin mirar la cuenta**. Es lo que
hace que el guardrail siga funcionando en un fork sin tocar una línea.

Renombrar el fork sí lo rompe, y rompe hacia el verde: el escaneo deja de encontrar
las líneas que viene a auditar y sale verde por construcción. El banco tiene puesta
una red para eso —una aserción de que encuentra al menos quince pines, con el mensaje
«un cero acá es el banco roto»— así que un rename se ve como un rojo con explicación
en vez de como un silencio. Comprobarlo antes de decidir un rename:

```bash
node --test pruebas/andamio/pinado.test.mjs
```

## Checklist del fork

- [ ] Los dos `uses:` de `.github/workflows/marco-ci.yml` reescritos con la cuenta del fork
- [ ] Los tags `v1` y `vX.Y.Z` existen en el fork (`git ls-remote --tags origin`)
- [ ] `.github/CODEOWNERS` con equipos que **existen y tienen gente** en la cuenta nueva
- [ ] Las cinco líneas `{{ORG}}/Projects` de `plantilla/` revisadas contra dónde vive el fork
- [ ] `Settings → Actions → General → Access` habilitado si el fork es privado
- [ ] Acceso de Dependabot al fork, a nivel organización
- [ ] `AVISO_VERSION_DESTINO` cargado, o asumido el aviso perdido a sabiendas
- [ ] `node --test "pruebas/**/*.test.mjs" "actions/**/pruebas/*.test.mjs"` en verde en el fork
