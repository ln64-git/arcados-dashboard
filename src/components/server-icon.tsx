"use client";

import { useEffect, useState } from 'react';
import { VercelLogo } from '@/components/icons';

interface ServerIconData {
  iconUrl: string | null;
  serverName: string;
  serverId: string;
}

export function ServerIcon({ className }: { className?: string }) {
  const [serverData, setServerData] = useState<ServerIconData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const fetchServerIcon = async () => {
      try {
        const response = await fetch('/api/server-icon');
        
        if (response.ok) {
          const data = await response.json();
          setServerData(data);
          setError(null);
        } else {
          const errorText = await response.text();
          console.log('🔸 Failed to fetch server icon:', response.status, errorText);
          setError(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('🔸 Failed to fetch server icon:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServerIcon();
  }, []);

  if (error) {
    console.log('🔸 Error state:', error, '- showing VercelLogo fallback');
    return <VercelLogo className={className} />;
  }

  // If loading or no icon URL, show nothing (no waiting icon)
  if (isLoading || !serverData?.iconUrl) {
    return <div className={className} />;
  }

  // Show Discord icon with fade-in effect
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={serverData.iconUrl}
      alt={serverData.serverName || 'Server Icon'}
      className={`rounded-full ${className} transition-opacity duration-300 cursor-pointer hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
      width={36}
      height={36}
      onClick={() => {
        window.open(`https://discord.com/channels/${serverData.serverId}`, '_blank');
      }}
      onLoad={() => {
        setImageLoaded(true);
      }}
      onError={(e) => {
        console.log('🔸 Image load error, falling back to VercelLogo');
        setError('Image failed to load');
      }}
    />
  );
}
