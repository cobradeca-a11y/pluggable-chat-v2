import { useState, useEffect } from 'react';

export function useVideoGeneration(jobId: string) {
  const [status, setStatus] = useState<string>('queued');
  const [progress, setProgress] = useState<number>(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    let timeoutId: any;
    let polls = 0;
    const MAX_POLLS = 200; // 10 minutes at 3s per poll
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      if (polls >= MAX_POLLS) {
        setStatus('error');
        setError("Timeout: O vídeo demorou mais de 10 minutos para ser gerado.");
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/generate/video/${jobId}`);
        
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStatus(data.status);
            setProgress(data.progress || 0);
            
            if (data.status === 'completed' && data.url) {
              setUrl(data.url);
              return; // stop polling
            } else if (data.status === 'error') {
              setError(data.error || "Erro durante a geração do vídeo.");
              return; // stop polling
            }
          }
        }
      } catch (err) {
        console.error("Polling error", err);
        // Continue polling even if there's a temporary network error
      }

      polls++;
      if (isMounted) {
        timeoutId = setTimeout(poll, 3000);
      }
    };

    if (jobId) {
      if (jobId.startsWith("http")) {
        // If it's already a URL, skip polling
        setStatus("completed");
        setUrl(jobId);
        setProgress(100);
      } else {
        poll();
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  useEffect(() => {
    if (status === 'queued' || status === 'processing') {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return { status, progress, url, error, elapsedSeconds };
}
