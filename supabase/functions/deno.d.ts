/** Tipos mínimos para que el IDE reconozca Deno en Edge Functions. El runtime real es Deno en Supabase. */
declare namespace Deno {
  function serve(handler: (req: Request) => Promise<Response> | Response): void;
  const env: { get(key: string): string | undefined };
}

