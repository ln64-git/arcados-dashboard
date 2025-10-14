'use client'

import { useEffect, useState } from 'react'
import type { DiscordChannel } from './channels-table'
import { ChannelsTable } from './channels-table'

export function ChannelsLive({ initialChannels, initialTotal }: { initialChannels: DiscordChannel[]; initialTotal: number }) {
	const [channels, setChannels] = useState<DiscordChannel[]>(initialChannels)
	const [total, setTotal] = useState<number>(initialTotal)

	useEffect(() => {
		function onUpdate(ev: Event) {
			console.log("Custom event received:", ev);
			const e = ev as CustomEvent<{ channels: DiscordChannel[]; totalChannels: number }>
			if (e.detail?.channels) {
				console.log("Updating channels state:", e.detail);
				setChannels(e.detail.channels)
				setTotal(e.detail.totalChannels)
			}
		}
		window.addEventListener('channels:update', onUpdate as EventListener)
		return () => window.removeEventListener('channels:update', onUpdate as EventListener)
	}, [])

	return <ChannelsTable channels={channels} offset={Math.min(channels.length, 5)} totalChannels={total} />
}


