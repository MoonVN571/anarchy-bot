import { Image, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import { RedisManager } from "../../../redis/RedisManager";

interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export class AvatarCache {
	private static cache = new Map<string, CacheEntry<Buffer>>();
	private static readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

	public static async getAvatarImage(username: string): Promise<Image | null> {
		const lowerUser = username.toLowerCase().trim();
		const now = Date.now();

		let buffer: Buffer | null = null;

		// 1. Check L1 Memory Cache
		const memCached = this.cache.get(lowerUser);
		if (memCached && memCached.expiry > now) {
			buffer = memCached.data;
		} else {
			// 2. Check L2 Redis Cache
			const redisKey = `anarchy:cache:avatar:${lowerUser}`;
			const redisCached = await RedisManager.getBuffer(redisKey);

			if (redisCached) {
				buffer = redisCached;
				this.cache.set(lowerUser, {
					data: buffer,
					expiry: now + this.TTL_MS,
				});
			} else {
				// 3. Fetch from Network
				try {
					const res = await axios.get(
						`https://mc-heads.net/avatar/${encodeURIComponent(username)}/32.png`,
						{
							responseType: "arraybuffer",
							timeout: 2500,
						}
					);
					buffer = Buffer.from(res.data as ArrayBuffer);
					this.cache.set(lowerUser, {
						data: buffer,
						expiry: now + this.TTL_MS,
					});
					await RedisManager.setBuffer(redisKey, buffer, 600);
				} catch {
					// Fallback to minotar
					try {
						const res = await axios.get(
							`https://minotar.net/avatar/${encodeURIComponent(username)}/32.png`,
							{
								responseType: "arraybuffer",
								timeout: 2000,
							}
						);
						buffer = Buffer.from(res.data as ArrayBuffer);
						this.cache.set(lowerUser, {
							data: buffer,
							expiry: now + this.TTL_MS,
						});
						await RedisManager.setBuffer(redisKey, buffer, 600);
					} catch {
						buffer = null;
					}
				}
			}
		}

		if (!buffer) return null;
		try {
			return await loadImage(buffer);
		} catch {
			return null;
		}
	}
}
