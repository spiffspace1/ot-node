import { createContainer, InjectionMode, Lifetime, asClass, asValue } from 'awilix'

class DependencyInjection {
    static initialize() {
        const container = createContainer({
            injectionMode: InjectionMode.PROXY,
        });

        container.loadModules(
            [
                'modules/controller/**/*.js',
                'modules/service/**/*.js',
                'modules/command/**/*.js',
                'modules/manager/**/*.js',
                'modules/worker/worker-pool.js',
                'src/controller/**/*.js',
                'src/modules/base-module-manager.js',
                'src/modules/**/*module-manager.js',
            ],
            {
                formatName: 'camelCase',
                resolverOptions: {
                    lifetime: Lifetime.SINGLETON,
                    register: asClass,
                },
                esModules: true,
            },
        );

        return container;
    }

    static registerValue(container, valueName, value) {
        container.register({
            [valueName]: asValue(value),
        });
    }
}

export default DependencyInjection;
