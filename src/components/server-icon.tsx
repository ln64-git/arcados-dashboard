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
        console.log('🔹 Fetching server icon...');
        const response = await fetch('/api/server-icon');
        console.log('🔹 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔹 Server data:', data);
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
    console.log('🔹 Loading or no icon URL - showing transparent placeholder');
    return <div className={className} />;
  }

  // Show Discord icon with fade-in effect
  console.log('🔹 Showing Discord icon:', serverData.iconUrl);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={serverData.iconUrl}
      alt={serverData.serverName || 'Server Icon'}
      className={`rounded-full ${className} transition-opacity duration-300 cursor-pointer hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
      width={36}
      height={36}
      onClick={() => {
        console.log('🔹 Opening Discord server:', serverData.serverId);
        window.open(`https://discord.com/channels/${serverData.serverId}`, '_blank');
      }}
      onLoad={() => {
        console.log('🔹 Image loaded successfully');
        setImageLoaded(true);
      }}
      onError={(e) => {
        console.log('🔸 Image load error, falling back to VercelLogo');
        setError('Image failed to load');
      }}
    />
  );
}
