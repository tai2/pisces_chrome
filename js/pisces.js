function createAgent(groupAddress, port) {
    var socketId = null;
    var listeners = {
        "onMessage" : null
    };

    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    function str2ab(str) {
       var buf = new ArrayBuffer(str.length * 2);
       var bufView = new Uint16Array(buf);
       var len = str.length;
       for (var i = 0; i < len; i++) {
         bufView[i] = str.charCodeAt(i);
       }
       return buf;
    }

    function onReceive(info) {
        if (socketId !== info.socketId) {
            return;
        }

        var msg = ab2str(info.data);
        log("from " + info.remoteAddress + ":" + info.remotePort + " " + info.data.byteLength + " bytes received");
        log(msg);
        if (listeners.onMessage) {
            listeners.onMessage(msg);
        }
    }

    function log(msg) {
        chrome.runtime.getBackgroundPage(function(window) {
            window.console.log(msg);
        })
    }

    function onReceiveError(info) {
        log("onReceiveError resultCode=" + info.resultCode);

        // TODO: error handling
    }

    function start() {
        chrome.sockets.udp.create({}, function(info) {
            chrome.sockets.udp.onReceive.addListener(onReceive);
            chrome.sockets.udp.onReceiveError.addListener(onReceiveError);
            chrome.sockets.udp.bind(info.socketId, "0.0.0.0", port, function(result) {
                if (result < 0) {
                    log("Binding socket failed.");
                    // TODO: error handling
                    return;
                }

                chrome.sockets.udp.joinGroup(info.socketId, groupAddress, function(result) {
                    if (result < 0) {
                        log("joining multicast group failed.");
                        // TODO: error handling
                        return;
                    }

                    socketId = info.socketId;
                    log("pisces agent started.");
                });
            });
        });
    }

    function stop() {
        if (socketId) {
            chrome.sockets.udp.leaveGroup(socketId, groupAddress, function(result) {
                if (result < 0) {
                    log("leaving multicast group failed.");
                }
                chrome.sockets.udp.close(socketId, function() {
                    socketId = null;
                    log("pisces agent stopped.");
                });
            });
        }
    }

    function sendMessage(message) {
        chrome.sockets.udp.send(socketId, str2ab(message), groupAddress, port, function(info) {
           log(info.bytesSent + " bytes sent.");
        });
    }

    return {
        "start" : start,
        "stop" : stop,
        "sendMessage" : sendMessage,
        "groupAddress" : groupAddress,
        "port" : port,
        "listeners" : listeners
    };
}

