# Menú de casa

Planificador semanal de comidas y cenas con biblioteca de recetas y lista de la compra automática, agrupada por secciones del súper.

PWA instalable, funciona sin conexión y guarda todo en el dispositivo. La sincronización con Google Sheets es opcional.

---

## 1. Subirlo a GitHub Pages

1. Crea un repositorio nuevo, por ejemplo `Menu-casa`.
2. Sube estos archivos **en la raíz** del repositorio (no dentro de una carpeta):

```
index.html
styles.css
app.js
manifest.json
sw.js
icons/
  icon-192.png
  icon-512.png
  icon-maskable-512.png
  apple-touch-icon.png
```

3. En el repo: **Settings ▸ Pages ▸ Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. En un par de minutos estará en `https://pgamundi13.github.io/Menu-casa/`.
5. Ábrelo en el móvil y añádelo a la pantalla de inicio para que se instale como app.

> Los archivos `supabase.sql` y `README.md` puedes subirlos también: no molestan.

**Al actualizar archivos**, sube el cambio y además incrementa la versión de la caché en `sw.js` (`menu-casa-v1` → `menu-casa-v2`). Si no, el móvil seguirá sirviendo la versión antigua.

---

## 2. Sincronizar con Supabase (opcional)

Sin esto la app funciona perfectamente, pero cada móvil tiene sus propios datos. Con esto, todos los móviles de casa comparten el mismo menú.

1. Entra en [supabase.com](https://supabase.com) ▸ **New project**. Ponle nombre (`menu-de-casa`), una contraseña de base de datos y región **West EU (Ireland)** o **Central EU (Frankfurt)**. Tarda un par de minutos en levantarse.
2. En el menú lateral: **SQL Editor** ▸ **New query**. Pega el contenido de `supabase.sql` y pulsa **Run**. Debe decir *Success*.
3. Menú lateral: **Project Settings ▸ API Keys**. Necesitas dos cosas:
   - **Project URL** → `https://xxxxxxxx.supabase.co` (está en *Project Settings ▸ Data API*)
   - **Publishable key** → empieza por `sb_publishable_…`

   Si tu proyecto es antiguo verás **anon public** en su lugar, una cadena que empieza por `eyJ…`. Cualquiera de las dos vale: la app detecta el formato sola y envía las cabeceras que toquen.

   ⚠️ **Nunca uses la clave `secret` ni `service_role`.** Esas se saltan todas las protecciones y no deben salir de un servidor.

4. Abre la app ▸ **Ajustes** (arriba a la derecha) y rellena:
   - URL del proyecto
   - Clave publishable
   - Código de casa: la app genera uno al azar. **Trátalo como una contraseña.**
5. Pulsa **Enviar**. El punto de la barra superior se pone verde.

### Añadir otro móvil

En el móvil ya configurado: **Ajustes ▸ Copiar enlace para otro móvil**. Manda ese enlace por WhatsApp; al abrirlo desde el otro móvil, la conexión se configura sola. Después, **Ajustes ▸ Traer**.

### Cómo funciona

- Todo se guarda **primero en el móvil**, así que la app va instantánea y funciona sin cobertura.
- Cada cambio se envía a Supabase unos segundos después, en segundo plano.
- Al abrir la app se comprueba el servidor: si tiene datos más nuevos, se traen automáticamente.
- Gana siempre la versión más reciente. Si dos personas editan a la vez, la última en guardar se impone; pulsa **Traer** antes de una sesión larga de edición.

### Sobre la seguridad

La clave publishable está **diseñada para ser pública**: va dentro del código de la app, que cualquiera puede ver en GitHub. Eso es normal y no es un fallo.

Lo que de verdad protege vuestros datos es el **código de casa**, porque la política SQL permite leer y escribir a quien tenga la clave. Con un código largo y aleatorio nadie dará con vuestra fila; con `casa` o `familia`, sí. Por eso la app genera uno al azar: no lo cambies por algo corto.

Aun así, un menú semanal no es información sensible. No metas ahí nada que no quieras que se pueda ver.

En la tabla `menu_casa` de Supabase verás una fila por casa, con todo el contenido en la columna `datos` (JSON). Se puede consultar desde el **Table Editor**.

## 3. Cómo se usa

**Semana** — Siete días, cada uno con Comida y Cena. Toca un hueco vacío para asignar una receta y decir para cuántas raciones. La × quita la receta del hueco. La franja de color de la izquierda dice de un vistazo si el día está completo. También puedes copiar la semana anterior de golpe.

**Recetas** — Biblioteca reutilizable. Cada receta tiene nombre, icono, raciones base, ingredientes (cantidad, unidad y sección del súper) y notas de preparación. La sección del súper se rellena sola a partir del nombre del ingrediente; puedes cambiarla siempre.

**Compra** — Se genera sola con las recetas de la semana que estés viendo. Los ingredientes repetidos se suman (2 tomates el lunes + 3 el jueves = 5 tomates) y las cantidades se escalan según las raciones de cada día. Debajo de cada artículo aparece de qué recetas viene. Toca para marcar lo que ya tienes. **Compartir la lista** la manda por WhatsApp o la copia al portapapeles.

Los artículos marcados se guardan por semana, así que la lista de la semana siguiente empieza limpia.

---

## Copia de seguridad

En **Ajustes ▸ Descargar copia** se baja un `.json` con todo. **Restaurar copia** lo vuelve a cargar. Útil antes de cambiar de móvil.
