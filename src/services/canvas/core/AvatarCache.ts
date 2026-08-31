import { Image, loadImage } from "@napi-rs/canvas";
import axios from "axios";
import fs from "fs";
import path from "path";
import { RedisManager } from "../../../redis/RedisManager";

interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export class AvatarCache {
	private static cache = new Map<string, CacheEntry<Buffer>>();
	private static readonly TTL_MS = 10 * 60 * 1000; // 10 minutes (Memory)
	private static diskCacheDir = path.resolve(process.cwd(), ".canvas/avatars");

	private static ensureDiskCacheDir(): void {
		if (!fs.existsSync(this.diskCacheDir)) {
			try {
				fs.mkdirSync(this.diskCacheDir, { recursive: true });
			} catch {}
		}
	}

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
				// 3. Check L3 Persistent Disk Cache (.canvas/avatars/)
				this.ensureDiskCacheDir();
				const diskPath = path.join(this.diskCacheDir, `${lowerUser}.png`);

				if (fs.existsSync(diskPath)) {
					try {
						buffer = fs.readFileSync(diskPath);
						this.cache.set(lowerUser, {
							data: buffer,
							expiry: now + this.TTL_MS,
						});
						await RedisManager.setBuffer(redisKey, buffer, 600);
					} catch {
						buffer = null;
					}
				}

				// 4. Fetch from Network if not cached on disk
				if (!buffer) {
					try {
						const res = await axios.get(
							`https://mc-heads.net/avatar/${encodeURIComponent(username)}/32.png`,
							{
								responseType: "arraybuffer",
								timeout: 2500,
							}
						);
						buffer = Buffer.from(res.data as ArrayBuffer);
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
						} catch {
							buffer = null;
						}
					}

					if (buffer) {
						// Save to L1 Memory + L2 Redis + L3 Disk
						this.cache.set(lowerUser, {
							data: buffer,
							expiry: now + this.TTL_MS,
						});
						await RedisManager.setBuffer(redisKey, buffer, 600);

						try {
							this.ensureDiskCacheDir();
							fs.writeFileSync(diskPath, buffer);
						} catch {}
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
