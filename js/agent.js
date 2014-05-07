function createAgent(groupAddress, port) {

    const PT_HELLO = 0x01;
    const PT_BYE = 0x02;
    const PT_MESSAGE = 0x03;
    const PT_FILE_LIST_REQUEST = 0x04;
    const PT_FILE_LIST = 0x05;
    const PT_FILE_SEGMENT_REQUEST = 0x06;
    const PT_FILE_SEGMENT = 0x07;

    var socketId = null;
    var config = {
        "userId" : null,
        "groupAddress" : groupAddress,
        "port" : port,
    };
    var listeners = {
        "onMessage" : null
    };

    function ab2str(buf) {
        var bufview = new DataView(buf);
        var len = buf.byteLength / 2;
        var array = new Array(len);
        for (var i = 0; i < len; i++) {
            array[i] = bufview.getUint16(2 * i);
        }
        return String.fromCharCode.apply(null, array);
    }

    function str2ab(str) {
       var buf = new ArrayBuffer(str.length * 2);
       var bufview = new DataView(buf);
       var len = str.length;
       for (var i = 0; i < len; i++) {
         bufview.setUint16(2 * i, str.charCodeAt(i), false);
       }
       return buf;
    }

    function log(msg) {
        chrome.runtime.getBackgroundPage(function(window) {
            window.console.log(msg);
        })
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

    function onReceiveError(info) {
        log("onReceiveError resultCode=" + info.resultCode);

        // TODO: error handling
    }

    function start() {
        chrome.sockets.udp.create({}, function(info) {
            chrome.sockets.udp.onReceive.addListener(onReceive);
            chrome.sockets.udp.onReceiveError.addListener(onReceiveError);
            chrome.sockets.udp.setMulticastLoopbackMode(info.socketId, true, function(result) {
                if (result < 0) {
                    log("Setting loopback mode failed. cause=" + chrome.runtime.lastError.message);
                    // TODO: error handling
                    return;
                }

                chrome.sockets.udp.bind(info.socketId, '0.0.0.0', port, function(result) {
                    if (result < 0) {
                        log("Binding socket failed. cause=" + chrome.runtime.lastError.message);
                        // TODO: error handling
                        return;
                    }


                    chrome.sockets.udp.joinGroup(info.socketId, groupAddress, function(result) {
                        if (result < 0) {
                            log("joining multicast group failed. cause=" + chrome.runtime.lastError.message);
                            // TODO: error handling
                            return;
                        }

                        socketId = info.socketId;
                        log("pisces agent started.");
                    });
                });
            });
        });
    }

    function stop() {
        if (socketId) {
            chrome.sockets.udp.leaveGroup(socketId, groupAddress, function(result) {
                if (result < 0) {
                    log("leaving multicast group failed. cause=" + chrome.runtime.lastError.message);
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
            if (info.resultCode < 0) {
                console.log("send failed. cause=" + chrome.runtime.lastError.message);
                // TODO: error handling
                return;
            }
            log(info.bytesSent + " bytes sent.");
        });
    }

    return {
        "start" : start,
        "stop" : stop,
        "sendMessage" : sendMessage,
        "config" : config,
        "listeners" : listeners
    };
}

