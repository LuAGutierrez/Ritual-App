/**
 * Ritual — Configuración Supabase
 *
 * Cómo obtener los datos:
 * 1. Registrarte en https://supabase.com (GitHub, Google o email)
 * 2. Crear un proyecto: New Project → nombre, contraseña de BD, región
 * 3. Ir a Project Settings (engranaje) → pestaña API
 * 4. Copiar "Project URL" → SUPABASE_URL
 * 5. Copiar la clave "anon" "public" → SUPABASE_ANON_KEY
 *
 * Ver docs/SUPABASE-SETUP.md para más detalle.
 */
(function() {
  var SUPABASE_URL = 'https://recuvrrkejnuftdfzbyr.supabase.co';   // Project URL, ej: https://xxxxxxxx.supabase.co
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlY3V2cnJrZWpudWZ0ZGZ6YnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzQ4NjgsImV4cCI6MjA4NjExMDg2OH0.k-uW9QA7C-wbrj55eFZE1LTRmnJ8SvkJAV2sC1exT1w'; // anon public key (empieza con eyJ...)

  window.RitualSupabase = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    enabled: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
  };

  // Para cargar el cliente Supabase cuando lo integres:
  // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  // window.supabase = supabase.createClient(RitualSupabase.url, RitualSupabase.anonKey);
})();
