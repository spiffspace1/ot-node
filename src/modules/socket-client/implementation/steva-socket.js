class StevaSocket {

    async initialize(config, logger) {
        this.config = config;
        this.logger = logger;

        this.server = socketService(opts);

        this.server.onSocketOpen()
    }

    async listen(events = ['', '']) {
        events.forEach((event) {
            EventEmitter.on(event, () => {
                // find socketChannel
                // send message to socketChannel
            })
        })
    }

    listenOnEvent(event) {
        if (event==='socketOpen:PUBLISH')
        // logika za send message
    }

}

module.exports = StevaSocket;
