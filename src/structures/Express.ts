import express, { Application } from "express";

export class Express {
    private express: Application;
    constructor() {
        this.express = express();
        this.express.get("/", (req,res) => {
            res.status(200).send("Hello world");
        });
        this.express.listen(80);
    }
}