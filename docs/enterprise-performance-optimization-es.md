---
layout: default
lang: es
title: Guía de Optimización de Rendimiento Empresarial
---

# Guía de Optimización de Rendimiento Empresarial

Guía exhaustiva para optimizar el rendimiento de ChordMe en entornos empresariales con implementaciones a gran escala, alta concurrencia y requisitos de misión crítica.

## Tabla de Contenidos

- [Resumen de Arquitectura de Rendimiento](#resumen-de-arquitectura-de-rendimiento)
- [Optimización del Servidor de Aplicación](#optimización-del-servidor-de-aplicación)
- [Ajuste de Rendimiento de Base de Datos](#ajuste-de-rendimiento-de-base-de-datos)
- [Estrategias de Caché](#estrategias-de-caché)
- [Optimización de Red](#optimización-de-red)
- [Balanceado de Carga y Distribución](#balanceado-de-carga-y-distribución)
- [Optimización de Colaboración en Tiempo Real](#optimización-de-colaboración-en-tiempo-real)
- [Almacenamiento y Entrega de Contenido](#almacenamiento-y-entrega-de-contenido)
- [Monitoreo y Alertas](#monitoreo-y-alertas)
- [Planificación de Capacidad](#planificación-de-capacidad)
- [Pruebas de Rendimiento](#pruebas-de-rendimiento)
- [Solución de Problemas y Diagnósticos](#solución-de-problemas-y-diagnósticos)

## Resumen de Arquitectura de Rendimiento

### Requisitos de Rendimiento Empresarial

**Objetivos de Escalabilidad**:
- Soporte para más de 1000 usuarios simultáneos
- Más de 10,000 usuarios activos diarios
- Tiempos de respuesta inferiores a 200ms para el 95% de las solicitudes
- Disponibilidad del 99.9%
- Colaboración en tiempo real con latencia <100ms

**Dimensiones de Rendimiento**:
- **Throughput**: Capacidad de solicitudes por segundo
- **Latencia**: Optimización del tiempo de respuesta
- **Concurrencia**: Soporte de usuarios simultáneos
- **Escalabilidad**: Escalado horizontal y vertical
- **Confiabilidad**: Rendimiento consistente bajo carga

### Principios Arquitectónicos

**Arquitectura de Microservicios**:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Balanceador    │────│   Gateway API   │────│ Servicio Auth   │
│   de Carga      │    │  (Kong/Nginx)   │    │ (OAuth/SAML)    │
│   (HAProxy)     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Servicio      │    │   Servicio      │    │   Gestión       │
│ Colaboración    │    │   Contenido     │    │ de Usuarios     │
│ (WebSocket)     │    │ (Songs/Sets)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │   PostgreSQL    │    │ Almacenamiento  │
│   (Sesiones)    │    │   (BD Principal)│    │ Archivos (S3)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Patrones de Diseño de Rendimiento**:
- **Circuit Breaker**: Prevenir fallas en cascada
- **Bulkhead**: Aislar recursos críticos
- **Timeout**: Prevenir agotamiento de recursos
- **Retry with Backoff**: Manejar fallas transitorias
- **Rate Limiting**: Protección contra abuso

## Optimización del Servidor de Aplicación

### Optimización Node.js/Express

**Clustering y Gestión de Procesos**:
```javascript
// cluster-setup.js - Configuración de clustering para producción
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Maestro ${process.pid} iniciando ${numCPUs} workers`);
  
  // Crear workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    
    // Monitorear salud del worker
    worker.on('message', (msg) => {
      if (msg.type === 'healthcheck') {
        console.log(`Worker ${worker.process.pid} salud: ${msg.status}`);
      }
    });
  }
  
  // Manejar crashes de workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} terminó. Iniciando reemplazo...`);
    cluster.fork();
  });
  
  // Apagado graceful
  process.on('SIGTERM', () => {
    console.log('Maestro cerrando workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });
} else {
  // Proceso worker
  const app = require('./app');
  const server = app.listen(process.env.PORT || 3000);
  
  // Endpoint de verificación de salud
  app.get('/health', (req, res) => {
    const healthStatus = {
      status: 'healthy',
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    process.send({ type: 'healthcheck', status: 'healthy' });
    res.json(healthStatus);
  });
  
  // Apagado graceful para workers
  process.on('SIGTERM', () => {
    console.log(`Worker ${process.pid} cerrando graciosamente`);
    server.close(() => {
      process.exit(0);
    });
  });
}
```

**Gestión de Memoria y Garbage Collection**:
```javascript
// memory-optimization.js
const v8 = require('v8');

// Configurar ajustes de heap V8
const heapStatistics = v8.getHeapStatistics();
console.log('Estadísticas Heap:', heapStatistics);

// Monitoreo de memoria
function monitorMemory() {
  const usage = process.memoryUsage();
  const heapUsed = usage.heapUsed / 1024 / 1024;
  const heapTotal = usage.heapTotal / 1024 / 1024;
  const external = usage.external / 1024 / 1024;
  
  console.log(`Uso de Memoria:
    Heap Usado: ${Math.round(heapUsed * 100) / 100} MB
    Heap Total: ${Math.round(heapTotal * 100) / 100} MB
    Externo: ${Math.round(external * 100) / 100} MB
    RSS: ${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB
  `);
  
  // Alertar si el uso de memoria es alto
  if (heapUsed > 500) { // Umbral de 500MB
    console.warn('¡Uso alto de memoria detectado!');
    // Activar garbage collection si es necesario
    if (global.gc) {
      global.gc();
    }
  }
}

// Monitorear memoria cada 30 segundos
setInterval(monitorMemory, 30000);

// Object pooling para objetos creados frecuentemente
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    
    // Pre-poblar pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : this.createFn();
  }
  
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

module.exports = { monitorMemory, ObjectPool };
```

## Ajuste de Rendimiento de Base de Datos

### Optimización PostgreSQL

**Configuración y Connection Pooling**:
```sql
-- postgresql.conf optimización para cargas empresariales

-- Configuración de Memoria
shared_buffers = 8GB                    -- 25% del RAM total
effective_cache_size = 24GB             -- 75% del RAM total
work_mem = 512MB                        -- Para consultas complejas
maintenance_work_mem = 2GB              -- Para operaciones de mantenimiento
huge_pages = try                        -- Usar huge pages si están disponibles

-- Gestión de Conexiones
max_connections = 300                   -- Ajustado para connection pooling
shared_preload_libraries = 'pg_stat_statements,pg_buffercache'

-- Write-Ahead Logging (WAL)
wal_buffers = 128MB                     -- Tamaño buffer WAL
wal_level = replica                     -- Para replicación
checkpoint_completion_target = 0.9      -- Distribuir checkpoint I/O
wal_compression = on                    -- Comprimir registros WAL

-- Planificador de Consultas
random_page_cost = 1.1                  -- Optimizado para SSD
effective_io_concurrency = 200          -- Para almacenamiento SSD
seq_page_cost = 1.0                     -- Costo de escaneo secuencial

-- Procesamiento Paralelo
max_parallel_workers = 16               -- Coincidir núcleos CPU
max_parallel_workers_per_gather = 4     -- Paralelismo por consulta
max_parallel_maintenance_workers = 4    -- Para mantenimiento

-- Registro y Monitoreo
log_min_duration_statement = 1000       -- Registrar consultas lentas (1s+)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'mod'                   -- Registrar declaraciones DDL/DML
track_activity_query_size = 2048        -- Rastrear consultas más largas
track_functions = all                   -- Rastrear rendimiento funciones
track_io_timing = on                    -- Estadísticas timing I/O

-- Ajuste Autovacuum
autovacuum_max_workers = 4              -- Workers vacuum paralelos
autovacuum_naptime = 30s                -- Frecuencia verificación vacuum
autovacuum_vacuum_threshold = 50        -- Filas mínimas para vacuum
autovacuum_vacuum_scale_factor = 0.1    -- 10% del tamaño tabla
autovacuum_analyze_threshold = 50       -- Filas mínimas para analyze
autovacuum_analyze_scale_factor = 0.05  -- 5% del tamaño tabla
```

**Estrategia de Optimización de Índices**:
```sql
-- performance_indexes.sql - Estrategia de indexación empresarial

-- Índices de usuario y autenticación
CREATE INDEX CONCURRENTLY idx_users_email_active 
ON users (email) WHERE active = true;

CREATE INDEX CONCURRENTLY idx_users_last_login 
ON users (last_login DESC) WHERE last_login > (NOW() - INTERVAL '30 days');

-- Índices de canciones y contenido
CREATE INDEX CONCURRENTLY idx_songs_user_created 
ON songs (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_songs_search_gin 
ON songs USING gin(to_tsvector('spanish', title || ' ' || content));

-- Índices de sesiones de colaboración
CREATE INDEX CONCURRENTLY idx_collaboration_sessions_active 
ON collaboration_sessions (created_at DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_collaboration_participants 
ON collaboration_participants (session_id, user_id);

-- Índices de rendimiento setlist
CREATE INDEX CONCURRENTLY idx_setlists_user_modified 
ON setlists (user_id, modified_at DESC);

CREATE INDEX CONCURRENTLY idx_setlist_songs_order 
ON setlist_songs (setlist_id, position);
```

## Estrategias de Caché

### Configuración y Optimización Redis

**Configuración Redis para Producción**:
```bash
# redis.conf - Configuración para implementación empresarial

# Red y Seguridad
bind 127.0.0.1 10.0.1.100               # Enlazar a interfaces específicas
port 6379                               # Puerto por defecto
protected-mode yes                      # Habilitar modo protegido
requirepass tu_contraseña_fuerte_aqui   # Autenticación

# Gestión de Memoria
maxmemory 8gb                          # Uso máximo de memoria
maxmemory-policy allkeys-lru           # Política de desalojo
maxmemory-samples 5                    # Muestreo LRU

# Configuración de Persistencia
save 900 1                             # Guardar después 900 seg si 1 clave cambió
save 300 10                            # Guardar después 300 seg si 10 claves cambiaron
save 60 10000                          # Guardar después 60 seg si 10000 claves cambiaron

# Ajuste de Rendimiento
tcp-keepalive 300                      # TCP keepalive
timeout 0                              # Timeout cliente (0 = deshabilitado)
tcp-backlog 511                        # TCP listen backlog
databases 16                           # Número de bases de datos

# Optimización de Memoria
hash-max-ziplist-entries 512          # Optimización hash
hash-max-ziplist-value 64             # Optimización valor hash
list-max-ziplist-size -2               # Optimización lista
set-max-intset-entries 512             # Optimización conjunto
```

**Estrategia de Caché a Nivel de Aplicación**:
```javascript
// cache-manager.js - Implementación de caché inteligente
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Conexión servidor Redis rechazada');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Tiempo de reintento agotado');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

class GestorCache {
  constructor() {
    this.defaultTTL = 300; // 5 minutos
    this.keyPatterns = {
      usuario: 'usuario:{{id}}',
      cancion: 'cancion:{{id}}',
      setlist: 'setlist:{{id}}',
      sesion: 'sesion:{{id}}',
      busqueda: 'busqueda:{{query}}:{{pagina}}'
    };
  }

  // Generar clave de caché con patrón
  generateKey(pattern, params) {
    let key = this.keyPatterns[pattern];
    Object.keys(params).forEach(param => {
      key = key.replace(`{{${param}}}`, params[param]);
    });
    return key;
  }

  // Caché multi-nivel con circuit breaker
  async get(key, fallbackFn, ttl = this.defaultTTL) {
    try {
      // Intentar caché L1 (Redis)
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback a fuente de datos
      const data = await fallbackFn();
      
      // Cachear el resultado
      if (data) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.error('Error get caché:', error);
      // Fallback a acceso directo de datos
      return await fallbackFn();
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      await client.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Error set caché:', error);
    }
  }

  async invalidate(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Error invalidación caché:', error);
    }
  }

  // Estadísticas de caché
  async getStats() {
    const info = await client.info('memory');
    const stats = {
      uso_memoria: info.match(/used_memory_human:(.+)/)?.[1],
      pico_memoria: info.match(/used_memory_peak_human:(.+)/)?.[1],
      aciertos_keyspace: info.match(/keyspace_hits:(\d+)/)?.[1],
      fallos_keyspace: info.match(/keyspace_misses:(\d+)/)?.[1]
    };
    
    if (stats.aciertos_keyspace && stats.fallos_keyspace) {
      stats.ratio_aciertos = (
        parseInt(stats.aciertos_keyspace) / 
        (parseInt(stats.aciertos_keyspace) + parseInt(stats.fallos_keyspace))
      ) * 100;
    }
    
    return stats;
  }
}

module.exports = new GestorCache();
```

## Optimización de Red

### Integración CDN y Optimización de Assets Estáticos

**Configuración CloudFlare**:
```javascript
// cdn-optimization.js
const compression = require('compression');

// Compresión de respuesta
app.use(compression({
  level: 6, // Nivel de compresión (1-9)
  threshold: 1024, // Solo comprimir respuestas > 1KB
  filter: (req, res) => {
    // No comprimir endpoints en tiempo real
    if (req.path.startsWith('/ws') || req.path.startsWith('/api/realtime')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Implementar headers de control de caché
function setCacheHeaders(req, res, next) {
  const path = req.path;
  
  if (path.match(/\.(js|css)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
    res.set('Cache-Control', 'public, max-age=604800');
  } else if (path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-cache, must-revalidate');
  } else {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  
  next();
}

module.exports = { setCacheHeaders };
```

## Balanceado de Carga y Distribución

### Configuración HAProxy

**Configuración Balanceador de Carga para Producción**:
```haproxy
# haproxy.cfg - Configuración balanceador de carga producción
global
    daemon
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    user haproxy
    group haproxy
    
    # Configuración SSL
    ssl-default-bind-ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    
    # Ajuste de rendimiento
    tune.ssl.default-dh-param 2048
    tune.bufsize 32768

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option http-server-close
    option forwardfor except 127.0.0.0/8
    retries 3
    
    # Verificación de salud
    option httpchk GET /health
    http-check expect status 200

# Frontend principal
frontend chordme_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/private/chordme.pem
    
    # Redirigir HTTP a HTTPS
    redirect scheme https if !{ ssl_fc }
    
    # Limitación de velocidad
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request reject if { sc_http_req_rate(0) gt 20 }
    
    # Enrutamiento de solicitudes
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_api path_beg /api
    acl is_static path_beg /static /assets /css /js /images
    
    # Selección de backend
    use_backend websocket_backend if is_websocket
    use_backend api_backend if is_api
    use_backend static_backend if is_static
    default_backend web_backend

# Backend WebSocket para colaboración en tiempo real
backend websocket_backend
    balance source
    option httpchk GET /ws/health
    
    server ws1 10.0.1.10:3001 check
    server ws2 10.0.1.11:3001 check
    server ws3 10.0.1.12:3001 check

# Backend API
backend api_backend
    balance roundrobin
    option httpchk GET /api/health
    
    server api1 10.0.1.10:3000 check weight 100 maxconn 300
    server api2 10.0.1.11:3000 check weight 100 maxconn 300
    server api3 10.0.1.12:3000 check weight 100 maxconn 300
```

## Optimización de Colaboración en Tiempo Real

### Ajuste de Rendimiento WebSocket

**Optimización del Servidor WebSocket**:
```javascript
// websocket-optimization.js
const WebSocket = require('ws');

class ServidorWebSocketOptimizado {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8080,
      maxConnections: options.maxConnections || 10000,
      pingInterval: options.pingInterval || 30000,
      pongTimeout: options.pongTimeout || 5000,
      ...options
    };
    
    this.connections = new Map();
    this.rooms = new Map();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerSecond: 0,
      messageCount: 0,
      lastSecond: Date.now()
    };
    
    this.setupServer();
    this.startMetricsCollection();
  }

  setupServer() {
    this.wss = new WebSocket.Server({
      port: this.options.port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          memLevel: 7,
          strategy: require('zlib').constants.Z_DEFAULT_STRATEGY,
        },
        threshold: 1024,
        concurrencyLimit: 10,
        clientMaxWindowBits: 13,
        serverMaxWindowBits: 13,
      },
      maxPayload: 16 * 1024 * 1024, // 16MB
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
  }

  handleConnection(ws, request) {
    const connectionId = this.generateConnectionId();
    const clientInfo = {
      id: connectionId,
      ip: request.socket.remoteAddress,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      rooms: new Set(),
      messageCount: 0
    };

    this.connections.set(connectionId, clientInfo);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    ws.connectionId = connectionId;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
      clientInfo.lastActivity = Date.now();
    });

    ws.on('message', (data) => {
      this.handleMessage(ws, data, clientInfo);
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`Error WebSocket para conexión ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    });
  }

  handleMessage(ws, data, clientInfo) {
    try {
      const message = JSON.parse(data);
      clientInfo.messageCount++;
      clientInfo.lastActivity = Date.now();
      this.metrics.messageCount++;

      // Enrutar mensaje basado en tipo
      switch (message.type) {
        case 'join_room':
          this.handleJoinRoom(ws, message, clientInfo);
          break;
        case 'collaboration_change':
          this.handleCollaborationChange(ws, message, clientInfo);
          break;
        case 'ping':
          this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          console.warn(`Tipo de mensaje desconocido: ${message.type}`);
      }
    } catch (error) {
      console.error('Error manejando mensaje:', error);
    }
  }

  broadcastToRoom(roomId, message, excludeConnectionId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const messageString = JSON.stringify(message);
    
    room.forEach(connectionId => {
      if (connectionId !== excludeConnectionId) {
        const connection = this.getConnectionById(connectionId);
        if (connection && connection.readyState === WebSocket.OPEN) {
          connection.send(messageString);
        }
      }
    });
  }

  startMetricsCollection() {
    setInterval(() => {
      const now = Date.now();
      const timeDiff = now - this.metrics.lastSecond;
      
      if (timeDiff >= 1000) {
        this.metrics.messagesPerSecond = 
          (this.metrics.messageCount / timeDiff) * 1000;
        this.metrics.messageCount = 0;
        this.metrics.lastSecond = now;
      }
      
      // Registrar métricas
      console.log(`Métricas WebSocket:
        Conexiones Activas: ${this.metrics.activeConnections}
        Mensajes/seg: ${this.metrics.messagesPerSecond.toFixed(2)}
        Salas Activas: ${this.rooms.size}
      `);
    }, 10000); // Cada 10 segundos

    // Heartbeat Ping/Pong
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, this.options.pingInterval);
  }

  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = ServidorWebSocketOptimizado;
```

## Pruebas de Rendimiento

### Framework de Pruebas de Carga

**Suite de Pruebas de Rendimiento Exhaustiva**:
```javascript
// load-testing.js - Framework de pruebas de carga empresarial
const autocannon = require('autocannon');

class SuitePruebasRendimiento {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      maxUsers: config.maxUsers || 1000,
      testDuration: config.testDuration || 300,
      ...config
    };
    
    this.results = {
      http: null,
      websocket: null,
      collaboration: null
    };
  }

  async runFullTestSuite() {
    console.log('Iniciando suite exhaustiva de pruebas de rendimiento...');
    
    try {
      // Prueba de Carga HTTP API
      console.log('Ejecutando prueba de carga HTTP API...');
      this.results.http = await this.runHttpLoadTest();
      
      // Generar reporte
      this.generateReport();
      
    } catch (error) {
      console.error('Suite de pruebas falló:', error);
      throw error;
    }
  }

  async runHttpLoadTest() {
    const testConfig = {
      url: this.config.baseUrl,
      connections: 100,
      duration: 60,
      pipelining: 1,
      requests: [
        {
          method: 'GET',
          path: '/api/health'
        },
        {
          method: 'GET',
          path: '/api/songs',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        }
      ]
    };

    return new Promise((resolve, reject) => {
      const instance = autocannon(testConfig, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.parseHttpResults(result));
        }
      });

      // Rastrear progreso
      autocannon.track(instance, {
        outputStream: process.stdout,
        renderProgressBar: true
      });
    });
  }

  parseHttpResults(result) {
    return {
      requests: result.requests,
      throughput: result.throughput,
      latency: {
        mean: result.latency.mean,
        p50: result.latency.p50,
        p90: result.latency.p90,
        p99: result.latency.p99
      },
      errors: result.errors,
      duration: result.duration
    };
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      results: this.results,
      summary: this.generateSummary()
    };

    const fs = require('fs');
    const reportPath = `reporte-rendimiento-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n=== RESULTADOS PRUEBAS DE RENDIMIENTO ===');
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`\nReporte detallado guardado en: ${reportPath}`);
  }

  generateSummary() {
    return {
      http: {
        solicitudesPorSegundo: this.results.http?.throughput?.mean || 0,
        latenciaPromedio: this.results.http?.latency?.mean || 0,
        latenciaP99: this.results.http?.latency?.p99 || 0,
        tasaError: (this.results.http?.errors || 0) / (this.results.http?.requests || 1) * 100
      }
    };
  }
}

module.exports = SuitePruebasRendimiento;

// Ejemplo de uso
if (require.main === module) {
  const testSuite = new SuitePruebasRendimiento({
    baseUrl: 'http://localhost:3000',
    maxUsers: 500,
    testDuration: 180 // 3 minutos
  });

  testSuite.runFullTestSuite()
    .then(() => {
      console.log('Pruebas de rendimiento completadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Pruebas de rendimiento fallaron:', error);
      process.exit(1);
    });
}
```

## Monitoreo y Alertas

### Integración Prometheus

**Configuración de Recolección de Métricas**:
```javascript
// metrics/prometheus.js
const prometheus = require('prom-client');

// Crear Registry para registrar las métricas
const register = prometheus.register;

// Definir métricas personalizadas
const httpRequestDuration = new prometheus.Histogram({
  name: 'chordme_http_request_duration_seconds',
  help: 'Duración de solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeCollaborationSessions = new prometheus.Gauge({
  name: 'chordme_active_collaboration_sessions',
  help: 'Número de sesiones de colaboración activas'
});

const databaseConnectionPool = new prometheus.Gauge({
  name: 'chordme_database_connections',
  help: 'Número de conexiones de base de datos',
  labelNames: ['state']
});

const websocketConnections = new prometheus.Gauge({
  name: 'chordme_websocket_connections',
  help: 'Número de conexiones WebSocket activas'
});

// Registrar métricas
register.registerMetric(httpRequestDuration);
register.registerMetric(activeCollaborationSessions);
register.registerMetric(databaseConnectionPool);
register.registerMetric(websocketConnections);

module.exports = {
  register,
  httpRequestDuration,
  activeCollaborationSessions,
  databaseConnectionPool,
  websocketConnections
};
```

---

## Documentación Relacionada

- [Configuración de Implementación Empresarial](enterprise-deployment-setup-es.md)
- [Mejores Prácticas de Gestión Comunitaria](community-management-best-practices-es.md)
- [Referencia de API](api-reference-es.md)
- [Lista de Verificación de Seguridad](security-checklist-es.md)
- [Guía de Solución de Problemas](troubleshooting-es.md)

---

**Cambiar idioma:** [English](enterprise-performance-optimization.md) | **Español**