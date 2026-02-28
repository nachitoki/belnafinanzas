# Keep-Alive Configuration for Render

## Problema
El servidor gratuito de Render se "duerme" después de 15 minutos de inactividad, causando tiempos de carga de 60-90 segundos.

## Solución: UptimeRobot (Gratis)

### Paso 1: Crear cuenta
1. Ve a [uptimerobot.com](https://uptimerobot.com)
2. Crea una cuenta gratuita

### Paso 2: Configurar Monitor
1. Click en **"+ Add New Monitor"**
2. Configura así:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Belna Finanzas API
   - **URL:** `https://belnafinanzas.onrender.com/health`
   - **Monitoring Interval:** 5 minutes

3. Click **"Create Monitor"**

### Resultado
UptimeRobot hará ping al servidor cada 5 minutos, manteniéndolo "despierto" y eliminando los cold starts.

---

## Alternativa: Cron-Job.org
Si prefieres otra opción:
1. Ve a [cron-job.org](https://cron-job.org)
2. Crea un job que haga GET a `https://belnafinanzas.onrender.com/health` cada 5 minutos.

---

*Nota: El plan gratuito de Render aún puede tener cold starts si el monitor falla o si hay mantenimiento programado.*
