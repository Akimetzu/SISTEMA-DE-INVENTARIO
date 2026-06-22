-- ============================================================
--  SCHEMA COMPATIBLE CON SUPABASE (PostgreSQL 15+)
--  Generado para: Sistema de Inventario con Auditoría Blockchain
--  Notas:
--    • gen_random_uuid() es nativo en PG 13+ — no requiere extensión
--    • RLS habilitado en todas las tablas (buena práctica en Supabase)
--    • Trigger updated_at para tablas con actualizado_en
--    • Se conserva toda la lógica de constraints original
-- ============================================================


-- ------------------------------------------------------------
-- 0. FUNCIÓN AUXILIAR: auto-actualizar actualizado_en
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE public.roles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(20)  NOT NULL UNIQUE,
    descripcion     VARCHAR(100) NOT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_roles_codigo
        CHECK (codigo IN ('admin', 'operador', 'auditor'))
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.roles          IS 'Catálogo de roles del sistema.';
COMMENT ON COLUMN public.roles.codigo   IS 'Identificador corto del rol: admin | operador | auditor.';


-- ============================================================
-- 2. USUARIOS
-- ============================================================
CREATE TABLE public.usuarios (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id          UUID         NOT NULL,
    nombre_usuario  VARCHAR(50)  NOT NULL UNIQUE,
    nombre_completo VARCHAR(120) NOT NULL,
    correo          VARCHAR(120) NOT NULL UNIQUE,
    clave_hash      VARCHAR(255) NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id) REFERENCES public.roles (id)
        ON DELETE RESTRICT
);

CREATE TRIGGER trg_usuarios_actualizado_en
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.usuarios              IS 'Usuarios del sistema con sus credenciales y rol asignado.';
COMMENT ON COLUMN public.usuarios.clave_hash   IS 'Hash bcrypt de la contraseña. Nunca almacenar en texto plano.';
COMMENT ON COLUMN public.usuarios.activo       IS 'FALSE = cuenta deshabilitada (soft-delete).';


-- ============================================================
-- 3. PRODUCTOS
-- ============================================================
CREATE TABLE public.productos (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sku            VARCHAR(50)   NOT NULL UNIQUE,
    nombre         VARCHAR(150)  NOT NULL,
    descripcion    TEXT,
    categoria      VARCHAR(80)   NOT NULL,
    precio         NUMERIC(12,2) NOT NULL,
    activo         BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_productos_precio
        CHECK (precio >= 0)
);

CREATE TRIGGER trg_productos_actualizado_en
    BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.productos        IS 'Catálogo maestro de productos.';
COMMENT ON COLUMN public.productos.sku    IS 'Stock Keeping Unit — código único por producto.';
COMMENT ON COLUMN public.productos.activo IS 'FALSE = producto retirado (soft-delete).';


-- ============================================================
-- 4. INVENTARIO
-- ============================================================
CREATE TABLE public.inventario (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id             UUID        NOT NULL UNIQUE,   -- relación 1-a-1 con productos
    stock_actual            INTEGER     NOT NULL DEFAULT 0,
    stock_reservado         INTEGER     NOT NULL DEFAULT 0,
    umbral_stock_bajo       INTEGER     NOT NULL DEFAULT 0,
    alerta_stock_bajo_activa BOOLEAN    NOT NULL DEFAULT FALSE,
    ultima_alerta           TIMESTAMPTZ,
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_inventario_producto
        FOREIGN KEY (producto_id) REFERENCES public.productos (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inventario_stock_actual
        CHECK (stock_actual >= 0),

    CONSTRAINT chk_inventario_stock_reservado
        CHECK (stock_reservado >= 0),

    CONSTRAINT chk_inventario_umbral
        CHECK (umbral_stock_bajo >= 0)
);

CREATE TRIGGER trg_inventario_actualizado_en
    BEFORE UPDATE ON public.inventario
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_actualizado_en();

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.inventario                       IS 'Estado de stock por producto (relación 1-a-1).';
COMMENT ON COLUMN public.inventario.stock_reservado       IS 'Unidades comprometidas en pedidos pendientes.';
COMMENT ON COLUMN public.inventario.umbral_stock_bajo     IS 'Si stock_actual <= umbral, se activa la alerta.';


-- ============================================================
-- 5. INTENTOS DE ACCESO
-- ============================================================
CREATE TABLE public.intentos_acceso (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_usuario_intentado VARCHAR(50) NOT NULL,
    usuario_id              UUID,                          -- NULL si el usuario no existe
    exito                   BOOLEAN     NOT NULL DEFAULT FALSE,
    intentado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    direccion_ip            VARCHAR(45),                   -- admite IPv6
    agente_usuario          TEXT,

    CONSTRAINT fk_intentos_usuario
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id)
        ON DELETE SET NULL
);

ALTER TABLE public.intentos_acceso ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.intentos_acceso               IS 'Registro de todos los intentos de login (exitosos y fallidos).';
COMMENT ON COLUMN public.intentos_acceso.direccion_ip  IS 'Acepta tanto IPv4 como IPv6 (máx. 45 chars).';


-- ============================================================
-- 6. TRANSACCIONES
-- ============================================================
CREATE TABLE public.transacciones (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id    UUID        NOT NULL,
    producto_id      UUID        NOT NULL,
    usuario_id       UUID        NOT NULL,
    tipo_transaccion VARCHAR(15) NOT NULL,
    cantidad         INTEGER     NOT NULL,
    stock_antes      INTEGER     NOT NULL,
    stock_despues    INTEGER     NOT NULL,
    nota_referencia  TEXT,
    ocurrido_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transacciones_inventario
        FOREIGN KEY (inventario_id) REFERENCES public.inventario (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transacciones_producto
        FOREIGN KEY (producto_id) REFERENCES public.productos (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transacciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_transacciones_tipo
        CHECK (tipo_transaccion IN ('IN', 'OUT', 'AJUSTE')),

    CONSTRAINT chk_transacciones_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_transacciones_stock_antes
        CHECK (stock_antes >= 0),

    CONSTRAINT chk_transacciones_stock_despues
        CHECK (stock_despues >= 0)
);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.transacciones                  IS 'Historial inmutable de movimientos de stock.';
COMMENT ON COLUMN public.transacciones.tipo_transaccion IS 'IN = entrada, OUT = salida, AJUSTE = corrección manual.';
COMMENT ON COLUMN public.transacciones.stock_antes      IS 'Stock antes de aplicar la transacción.';
COMMENT ON COLUMN public.transacciones.stock_despues    IS 'Stock resultante tras la transacción.';


-- ============================================================
-- 7. AUDITORÍA BLOCKCHAIN
-- ============================================================
CREATE TABLE public.auditoria_blockchain (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    transaccion_id      UUID         NOT NULL UNIQUE,
    usuario_id          UUID         NOT NULL,
    hash_anterior       CHAR(64)     NOT NULL,
    hash_actual         CHAR(64)     NOT NULL UNIQUE,
    timestamp_bloque    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    datos               JSONB        NOT NULL DEFAULT '{}',
    firma_usuario       TEXT         NOT NULL,
    red_blockchain      VARCHAR(30)  NOT NULL DEFAULT 'sepolia',
    hash_transaccion    VARCHAR(120),                      -- hash on-chain (opcional hasta confirmar)
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_auditoria_transaccion
        FOREIGN KEY (transaccion_id) REFERENCES public.transacciones (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_hash_anterior_hex
        CHECK (hash_anterior ~ '^[0-9a-fA-F]{64}$'),

    CONSTRAINT chk_hash_actual_hex
        CHECK (hash_actual ~ '^[0-9a-fA-F]{64}$')
);

ALTER TABLE public.auditoria_blockchain ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.auditoria_blockchain               IS 'Cadena de bloques off-chain ligada a cada transacción.';
COMMENT ON COLUMN public.auditoria_blockchain.hash_anterior IS 'SHA-256 del bloque anterior (64 hex chars).';
COMMENT ON COLUMN public.auditoria_blockchain.hash_actual   IS 'SHA-256 de este bloque (64 hex chars).';
COMMENT ON COLUMN public.auditoria_blockchain.datos         IS 'Snapshot JSON de los datos de la transacción en el momento del bloque.';


-- ============================================================
-- 8. REGISTROS DE EVENTOS
-- ============================================================
CREATE TABLE public.registros_eventos (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID,                                 -- NULL para eventos anónimos
    producto_id      UUID,                                 -- NULL si el evento no involucra producto
    tipo_evento      VARCHAR(40) NOT NULL,
    categoria_evento VARCHAR(20) NOT NULL,
    detalles         JSONB       NOT NULL DEFAULT '{}',
    direccion_ip     VARCHAR(45),
    agente_usuario   TEXT,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_eventos_usuario
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id)
        ON DELETE SET NULL,

    CONSTRAINT fk_eventos_producto
        FOREIGN KEY (producto_id) REFERENCES public.productos (id)
        ON DELETE SET NULL,

    CONSTRAINT chk_eventos_categoria
        CHECK (categoria_evento IN ('CRITICO', 'NO_CRITICO')),

    CONSTRAINT chk_eventos_tipo
        CHECK (tipo_evento IN (
            'LOGIN_EXITOSO',
            'LOGIN_FALLIDO',
            'PRODUCTO_CREADO',
            'PRODUCTO_ACTUALIZADO',
            'PRODUCTO_ELIMINADO',
            'PRODUCTO_VISTO',
            'PRODUCTO_BUSCADO',
            'STOCK_INGRESO',
            'STOCK_SALIDA',
            'AJUSTE_STOCK',
            'CAMBIO_PRECIO',
            'ALERTA_STOCK_BAJO'
        ))
);

ALTER TABLE public.registros_eventos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.registros_eventos               IS 'Log de auditoría de eventos del sistema (append-only).';
COMMENT ON COLUMN public.registros_eventos.detalles      IS 'Payload JSON con contexto adicional del evento.';
COMMENT ON COLUMN public.registros_eventos.categoria_evento IS 'CRITICO = requiere atención inmediata, NO_CRITICO = informativo.';


-- ============================================================
-- 9. ÍNDICES RECOMENDADOS
--    (Supabase no los crea automáticamente salvo PKs y UNIQUEs)
-- ============================================================

-- Búsquedas frecuentes por usuario
CREATE INDEX idx_usuarios_rol_id          ON public.usuarios        (rol_id);
CREATE INDEX idx_usuarios_correo          ON public.usuarios        (correo);

-- Transacciones — filtrado por fecha y tipo
CREATE INDEX idx_transacciones_ocurrido   ON public.transacciones   (ocurrido_en DESC);
CREATE INDEX idx_transacciones_tipo       ON public.transacciones   (tipo_transaccion);
CREATE INDEX idx_transacciones_usuario    ON public.transacciones   (usuario_id);
CREATE INDEX idx_transacciones_producto   ON public.transacciones   (producto_id);

-- Intentos de acceso — consultas de seguridad
CREATE INDEX idx_intentos_intentado_en    ON public.intentos_acceso (intentado_en DESC);
CREATE INDEX idx_intentos_ip              ON public.intentos_acceso (direccion_ip);
CREATE INDEX idx_intentos_usuario_id      ON public.intentos_acceso (usuario_id);

-- Eventos — filtrado por tipo y fecha
CREATE INDEX idx_eventos_tipo             ON public.registros_eventos (tipo_evento);
CREATE INDEX idx_eventos_categoria        ON public.registros_eventos (categoria_evento);
CREATE INDEX idx_eventos_creado_en        ON public.registros_eventos (creado_en DESC);
CREATE INDEX idx_eventos_usuario          ON public.registros_eventos (usuario_id);
CREATE INDEX idx_eventos_producto         ON public.registros_eventos (producto_id);

-- Auditoría — búsqueda por hash (para verificar cadena)
CREATE INDEX idx_auditoria_hash_actual    ON public.auditoria_blockchain (hash_actual);
CREATE INDEX idx_auditoria_red            ON public.auditoria_blockchain (red_blockchain);

-- Productos — búsqueda por categoría y activo
CREATE INDEX idx_productos_categoria      ON public.productos (categoria);
CREATE INDEX idx_productos_activo         ON public.productos (activo);


-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
