import request from "request";

class HttpApiHelper {
    info(nodeRpcUrl) {
        return new Promise((accept, reject) => {
            request(
                `${nodeRpcUrl}/info`,
                { json: true },
                (err, res, body) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    accept(body);
                },
            );
        });
    }
}

export default HttpApiHelper;
