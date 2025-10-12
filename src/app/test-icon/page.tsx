import { ServerIcon } from '@/components/server-icon';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Server Icon Test</h1>
      <div className="flex items-center gap-4">
        <div>
          <h2 className="font-semibold mb-2">ServerIcon Component:</h2>
          <ServerIcon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Direct Image Test:</h2>
          <img 
            src="https://cdn.discordapp.com/icons/1254694808228986912/1e2d444230ce90e4990f7438d1425853.png?size=64"
            alt="Direct Discord Icon"
            className="h-8 w-8 rounded-full"
            width={32}
            height={32}
          />
        </div>
      </div>
    </div>
  );
}
