import fs from 'fs-extra';
import appRootPath from "app-root-path";
import {join} from 'path';
import { exec } from 'child_process';
import BaseMigration from './base-migration.js';

const pjson = JSON.parse(fs.readFileSync(join(appRootPath.path, 'package.json')));
const CONFIGURATION_NAME = '.origintrail_noderc';

class M1FolderStructureInitialMigration extends BaseMigration {
    constructor(logger, config) {
        super('M1FolderStructureInitialMigration', logger, config);
        this.logger = logger;
        this.config = config;
    }

    async run() {
        if (process.env.NODE_ENV === 'testnet' || process.env.NODE_ENV === 'mainnet') {
            if (await this.migrationAlreadyExecuted()) {
                return;
            }

            const currentSymlink = join(appRootPath.path, '..', 'current');
            if (await fs.pathExists(currentSymlink)) {
                await this.finalizeMigration();
                return;
            }

            const currentVersion = pjson.version;
            const temporaryAppRootPath = join(appRootPath.path, '..', 'ot-node-tmp');
            const newTemporaryAppDirectoryPath = join(temporaryAppRootPath, currentVersion);
            await fs.ensureDir(newTemporaryAppDirectoryPath);

            const currentAppRootPath = appRootPath.path;

            await fs.copy(currentAppRootPath, newTemporaryAppDirectoryPath);

            await fs.remove(currentAppRootPath);

            await fs.rename(temporaryAppRootPath, currentAppRootPath);

            const newAppDirectoryPath = join(currentAppRootPath, currentVersion);

            const currentSymlinkFolder = join(currentAppRootPath, 'current');
            if (await fs.pathExists(currentSymlinkFolder)) {
                await fs.remove(currentSymlinkFolder);
            }
            await fs.ensureSymlink(newAppDirectoryPath, currentSymlinkFolder);

            const oldConfigurationPath = join(newAppDirectoryPath, CONFIGURATION_NAME);
            const newConfigurationPath = join(currentAppRootPath, CONFIGURATION_NAME);
            await fs.move(oldConfigurationPath, newConfigurationPath);

            await this.finalizeMigration(join(currentAppRootPath, 'data', 'migrations'));
            const otnodeServicePath = join(
                newAppDirectoryPath,
                'installer',
                'data',
                'otnode.service',
            );

            try {
                await this.updateOtNodeService(otnodeServicePath);
            } catch (error) {
                this.logger.warn(
                    `Unable to apply new ot-node service file please do it manually! Error: ${error}`,
                );
            }
            this.logger.info('Folder structure migration completed, node will now restart!');
            process.exit(1);
        } else {
            this.logger.info(
                `Folder structure initial migration skipped for env: ${process.env.NODE_ENV}`,
            );
        }
    }

    async updateOtNodeService(otnodeServicePath) {
        return new Promise((resolve, reject) => {
            const command = `cp ${otnodeServicePath} /lib/systemd/system/ && systemctl daemon-reload`;
            this.logger.trace(
                `Copy and apply new otnode service file. Running the command: ${command}`,
            );
            const child = exec(command);

            child.stdout.on('end', () => {
                resolve();
            });
        });
    }
}

export default M1FolderStructureInitialMigration;
