export function getEnvInfo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const urlLoaded = Boolean(url);
  const anonLoaded = Boolean(anonKey);
  
  let urlHost = null;
  if (url) {
    try {
      const urlObj = new URL(url);
      urlHost = urlObj.host;
    } catch (e) {
      urlHost = 'invalid-url';
    }
  }
  
  let maskedAnonKey = null;
  if (anonKey && anonKey.length > 8) {
    maskedAnonKey = anonKey.substring(0, 4) + '***' + anonKey.substring(anonKey.length - 4);
  } else if (anonKey) {
    maskedAnonKey = '***';
  }
  
  return {
    urlLoaded,
    anonLoaded,
    urlHost,
    maskedAnonKey
  };
}


