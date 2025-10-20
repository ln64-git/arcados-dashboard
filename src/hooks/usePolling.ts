"use client";
import { useCallback, useEffect, useState } from "react";

export interface UsePollingOptions<T> {
	queryFn: () => Promise<T>;
	interval?: number;
	enabled?: boolean;
	onError?: (error: Error) => void;
	onSuccess?: (data: T) => void;
}

export interface UsePollingReturn<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
	lastUpdate: Date | null;
	refetch: () => Promise<void>;
}

export function usePolling<T>({
	queryFn,
	interval = 2000,
	enabled = true,
	onError,
	onSuccess,
}: UsePollingOptions<T>): UsePollingReturn<T> {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

	const fetchData = useCallback(async () => {
		if (!enabled) return;

		try {
			setLoading(true);
			setError(null);
			const result = await queryFn();
			setData(result);
			setLastUpdate(new Date());
			onSuccess?.(result);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			console.error("🔸 Polling fetch error:", err);
			setError(errorMessage);
			onError?.(err instanceof Error ? err : new Error(errorMessage));
		} finally {
			setLoading(false);
		}
	}, [queryFn, enabled, onError, onSuccess]);

	const refetch = useCallback(async () => {
		await fetchData();
	}, [fetchData]);

	useEffect(() => {
		if (!enabled) return;

		// Initial fetch with a small delay to ensure page is loaded
		const initialTimeout = setTimeout(fetchData, 100);

		// Set up polling
		const intervalId = setInterval(fetchData, interval);

		return () => {
			clearTimeout(initialTimeout);
			clearInterval(intervalId);
		};
	}, [fetchData, interval, enabled]);

	return {
		data,
		loading,
		error,
		lastUpdate,
		refetch,
	};
}
