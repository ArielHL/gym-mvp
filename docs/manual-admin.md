# Manual de administrador

La administración se hace **dentro de la misma app** (no hay panel web aparte). Las pestañas siguen siendo Home, Clases, Reservas y Perfil. El menú **Admin** aparece solo en **Perfil** si tu cuenta tiene rol de administrador (insignia **⭐ Admin**).

---

## Acceso de administrador

No se puede promover a alguien desde la app. En Supabase (SQL) hay que asignar el rol y luego **cerrar sesión y volver a entrar**:

```sql
update public.profiles set role = 'admin' where email = 'tu@correo.com';
```

Sin ese rol, las pantallas `/admin` no se abren.

---

## Menú Admin (Perfil)

1. **Gestionar Clases** — plantillas recurrentes
2. **Gestionar Ubicaciones** — sedes o salas
3. **Gestionar Suscripciones** — planes de socios
4. **Gestionar Tipos de Clase** — categorías
5. **Asistencia** — quién asistió
6. **Configuración de Clases** — ventana de cancelación
7. **Contenido de la App** — carrusel e imágenes

### Orden recomendado la primera vez

1. Ubicaciones  
2. Tipos de clase  
3. Clases  
4. Contenido, ajustes, suscripciones y asistencia (según necesites)

---

## 1. Gestionar Ubicaciones

Pantalla: **Gestionar Ubicaciones**.

Sirve para sedes o salas. Hace falta **al menos una** antes de crear clases.

| Acción | Cómo |
|---|---|
| Crear | **Nuevo** → Nombre (obligatorio), Descripción y Dirección (opcionales) → **Crear Ubicación** |
| Editar | Toca la fila → cambia datos → guardar |
| Activar / desactivar | Píldora **ACTIVO** / **INACTIVO** |

No se pueden borrar. Si desactivas una, los socios no podrán usarla en reservas nuevas.

El nombre debe ser único.

---

## 2. Gestionar Tipos de Clase

Pantalla: **Tipos de Clase**.

Categorías que aparecen en Home y en el formulario de clases. Suelen existir **Fuerza**, **Movilidad**, **Cardio** y **Yoga**.

| Campo | Notas |
|---|---|
| **Nombre** | Mínimo 2 caracteres |
| **Slug** | minúsculas, números y guiones (`fuerza`, `yoga`) |
| **Descripcion** | Opcional |
| **Orden** | Número ≥ 0 (orden en listas) |
| **Imagen (URL)** | Opcional; también se puede poner en **Contenido de la App** |

| Acción | Cómo |
|---|---|
| Crear | **Nuevo** → **Crear Tipo** |
| Editar | Toca la fila |
| Activar / desactivar | **ACTIVO** / **INACTIVO** |
| Borrar | **Eliminar Tipo** — solo si ninguna clase lo usa |

Solo los tipos **activos** se pueden asignar a una clase nueva.

---

## 3. Gestionar Clases

Pantalla: **Gestion de Clases**.

Aquí se crean **plantillas recurrentes** (título, días, hora, cupo). No se generan sesiones una a una: la sesión concreta aparece cuando un socio reserva esa fecha.

Filtro **Estado**: Todos / Activo / Inactivo.

### Crear

**Nueva** → completa el formulario → **Crear Clase**.

| Campo | Qué poner |
|---|---|
| **Título** | Nombre visible para el socio |
| **Descripción** | Texto de la clase |
| **Entrenador** | Nombre en texto (no hay listado de instructores) |
| **Tipo** | Un tipo **activo** |
| **Duración (minutos)** | Entre 10 y 240 (por defecto 60) |
| **Días** | Al menos un día (Dom–Sáb) |
| **Hora de inicio** | Reloj, formato HH:MM |
| **Capacidad** | Cupos por sesión (1–500, por defecto 20) |
| **Dificultad** | principiante / intermedio / avanzado |
| **Ubicación** | Una de las ubicaciones cargadas |
| **Válido desde** | Fecha de inicio (YYYY-MM-DD) |
| **Válido hasta** | Opcional; vacío = sin fecha de fin |

### Editar y desactivar

- Toca la fila → **Editar Clase** → **Guardar Cambios**. Si cambias el cupo, se actualiza en sesiones futuras ya creadas.
- La píldora **ACTIVE** / **INACTIVE** oculta o muestra la clase a los socios. No hay borrado definitivo.

---

## 4. Configuración de Clases

Pantalla: **Ajustes de Clases**.

Único ajuste:

- **Ventana de cancelación** → **Horas antes de la clase**

Ejemplo: `2` = el socio no puede cancelar si faltan menos de 2 horas. Mínimo **0,5** horas.

Ese valor es el que ve el socio en *Clase no cancelable, estás dentro de las N horas de iniciar*.

---

## 5. Contenido de la App

Pantalla: **Contenido de la App**.

### Carrusel Principal (Home)

Cada slide:

- **Titulo**, **Subtitulo**, **Etiqueta**
- **Color de etiqueta** (`#RRGGBB`)
- **URL de la imagen**

Acciones: **Nueva Slide**, **Editar**, **Eliminar**, reordenar ↑↓, **Buscar imagen** (Unsplash), **Guardar Carrusel**.

Si no hay slides guardados, Home muestra un carrusel por defecto.

### Imagenes de Tipos de Clase

Por cada tipo: pega una URL o usa **Buscar imagen** y **Guardar**. Esas fotos se ven en las tarjetas de **Clases**.

---

## 6. Gestionar Suscripciones

Pantalla: **Gestionar Suscripciones**.

Lista todos los perfiles con su último plan y cuántas clases asistieron.

Filtros: búsqueda por nombre, con/sin suscripción, tipo de plan y estado.

### Asignar o actualizar un plan

1. Elige un usuario.
2. Completa **Plan**, **Estado** (por ejemplo `active`), **ID Suscripción (Stripe)** y **Fin del Período**.
3. **Crear Suscripción** o **Guardar Cambios**.

Si el período ya venció, puedes **Crear Nueva** o **Actualizar Existente**.

Esto **no cobra** ni abre Stripe. El ID se escribe a mano. Tampoco se crean ni se borran cuentas, ni se cambia el rol a admin.

El socio solo **consulta** su plan en **Mi Suscripción**. Tener o no plan **no impide** reservar.

---

## 7. Asistencia

Pantalla: **Asistencia**.

Lista reservas **confirmadas**. Filtro **Período**: **Pasadas** (por defecto), **Próximas** o **Todas**.

En cada fila: nombre, clase, fecha/hora, ubicación.

Pulsa **ASISTIÓ** / **NO ASISTIÓ** para marcar.

Desde aquí no se crean ni se cancelan reservas.

---

## Qué no se configura en la app

- Dar o quitar rol **admin**
- Alta o baja de cuentas de socio
- Un directorio de instructores (el nombre va en **Entrenador**)
- Varios “gimnasios” aparte de **Ubicaciones**
- Calendario de sesiones por adelantado (nacen al reservar)
- Cancelar reservas o clases en nombre del socio
- Cobros o checkout
- Notificaciones push

---

## Relación con lo que ve el socio

| Tú configuras | El socio ve |
|---|---|
| Ubicación activa | Dirección en detalles y en la reserva |
| Tipo + imagen | Filtros de Home y fotos de tarjetas |
| Clase activa, días, hora, vigencia | Listados, calendario y reserva |
| Capacidad | Tope al confirmar (**Clase llena**) |
| Horas de cancelación | Si puede o no pulsar **Cancelar** |
| Carrusel | Home |
| Suscripción | **Mi Suscripción** (solo lectura) |
| Asistencia | No lo ve; es control interno |
