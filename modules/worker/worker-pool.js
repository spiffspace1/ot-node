import { pool } from "workerpool";
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class WorkerPool {
    constructor() {
        // TODO minWorkers and maxWorkers to be determined automatically by number of logical cores
        // TODO is it necessary to terminate the pool?
        this.pool = pool(`${__dirname}/l1-worker.js`, { minWorkers: 2, maxWorkers: 4 });
    }

    offload(fn, args) {
        return new Promise((accept, reject) => {
            this.pool.exec(fn, args)
                .then((result) => {
                    accept(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    exec(name, args) {
        return this.pool.exec(name, args);
    }
}

export default WorkerPool;
