declare module NodeJS {
    interface ProcessEnv {
        TOKEN: string;
        USERNAME: string;
        PIN: string;
        EMAIL: string;
        PASSWORD: string
        AUTHME: string;
        PORT: string;
        API_KEY: string;
    }
}