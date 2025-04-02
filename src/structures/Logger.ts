/* eslint-disable */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

class Logger {
	private logger: winston.Logger;

	constructor() {
		this.logger = this.initLogger();
	}

	public getLogger(): winston.Logger {
		return this.logger;
	}

	private initLogger(): winston.Logger {
		const { timestamp, align } = winston.format;
		const print = winston.format.printf((info) => {
			const log = `${info.timestamp} [${info.level}] ${info.message}`;

			return info.stack
				? `${log}\n${info.stack}`
				: log;
		});
		const transports: winston.transport[] = [
			new winston.transports.Console(),
		];
		if (process.env.NODE_ENV !== "development") {
			transports.push(
				new DailyRotateFile({
					filename: "logs/log-%DATE%.log",
					datePattern: "DD-MM-YYYY",
					zippedArchive: true,
					maxSize: "20m",
					maxFiles: "14d",
				})
			);
		}
		return winston.createLogger({
			level: "debug",
			format: winston.format.combine(
				winston.format.errors({ stack: true }),
				timestamp({ format: "DD-MM-YYYY hh:mm:ss.SSS A" }),
				align(),
				print,
			),
			transports,
		});
	}

	private formatArgs(...args: any[]): string {
		return args.map(arg => {
			if (typeof arg === 'object') {
				try {
					return JSON.stringify(String(arg), (key, value) =>
						typeof value === 'bigint' ? value.toString() : value
					, 3);
				} catch {
					return String(arg);
				}
			}
			return String(arg);
		}).join(' ');
	}

	debug(...args: any[]) {
		const message = this.formatArgs(...args);
		const stack = new Error().stack;
		const callerLine = stack?.split('\n')[2] || 'unknown';
		this.logger.debug(`${message} (${callerLine.trim()})`);
	}

	info(...args: any[]) {
		const message = this.formatArgs(...args);
		this.logger.info(message);
	}

	start(...args: any[]) {
		const message = this.formatArgs(...args);
		this.logger.info(message);
	}

	warn(...args: any[]) {
		const message = this.formatArgs(...args);
		this.logger.warn(message);
	}

	error(...args: any[]) {
		const message = this.formatArgs(...args);

		const errorObj = args.find(arg => arg instanceof Error);
		if (errorObj && errorObj.stack)
			this.logger.error(`${errorObj.stack}`);
		else
			this.logger.error(message);

	}
}

const logger = new Logger();
export default logger;