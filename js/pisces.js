var pisces;

(function() {

    const PT_HELLO = 0x01;
    const PT_BYE = 0x02;
    const PT_MESSAGE = 0x03;
    const PT_FILE_LIST_REQUEST = 0x04;
    const PT_FILE_LIST = 0x05;
    const PT_FILE_SEGMENT_REQUEST = 0x06;
    const PT_FILE_SEGMENT = 0x07;

    var socketId = null;
    var agent_config = {
        "userId" : null,
        "groupAddress" : "224.0.0.1",
        "port" : 30000,
        "userName" : "Anonymous"
    };
    var agent_listeners = {
        "onMessage" : null
    };

    function log(msg) {
        chrome.runtime.getBackgroundPage(function(window) {
            window.console.log(msg);
        })
    }

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

    function uuid_generate() {
        // XXX: I don't now this is a correct way to generate a random UUID.
        var array = new Uint8Array(16);
        crypto.getRandomValues(array);

        var str = "";
        var i;
        for (i = 0; i < 4; i++) {
            str += ((array[i]>>0)&0xF).toString(16);
            str += ((array[i]>>4)&0xF).toString(16);
        }
        str += "-";
        for (i = 4; i < 6; i++) {
            str += ((array[i]>>0)&0xF).toString(16);
            str += ((array[i]>>4)&0xF).toString(16);
        }
        str += "-";
        for (i = 6; i < 8; i++) {
            str += ((array[i]>>0)&0xF).toString(16);
            str += ((array[i]>>4)&0xF).toString(16);
        }
        str += "-";
        for (i = 8; i < 10; i++) {
            str += ((array[i]>>0)&0xF).toString(16);
            str += ((array[i]>>4)&0xF).toString(16);
        }
        str += "-";
        for (i = 10; i < 16; i++) {
            str += ((array[i]>>0)&0xF).toString(16);
            str += ((array[i]>>4)&0xF).toString(16);
        }
        return str;
    }

    function uuid_binrepl(uuid) {
        var array = new Uint8Array(16);
        var i = 0;

        // first segment
        array[0] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[1] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[2] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[3] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        i++;

        // second segment
        array[4] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[5] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        i++;

        // third segment
        array[6] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[7] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        i++;

        // fourth segment
        array[8] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[9] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        i++;

        // last segment
        array[10] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[11] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[12] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[13] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[14] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);
        array[15] = (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16);

        return array;
    }

    function onReceive(info) {
        if (socketId !== info.socketId) {
            return;
        }

        var msg = ab2str(info.data);
        log("from " + info.remoteAddress + ":" + info.remotePort + " " + info.data.byteLength + " bytes received");
        log(msg);
        if (agent_listeners.onMessage) {
            agent_listeners.onMessage(msg);
        }
    }

    function onReceiveError(info) {
        log("onReceiveError resultCode=" + info.resultCode);

        // TODO: error handling
    }

    function agent_start() {
        chrome.sockets.udp.create({}, function(info) {
            chrome.sockets.udp.onReceive.addListener(onReceive);
            chrome.sockets.udp.onReceiveError.addListener(onReceiveError);
            chrome.sockets.udp.setMulticastLoopbackMode(info.socketId, true, function(result) {
                if (result < 0) {
                    log("Setting loopback mode failed. cause=" + chrome.runtime.lastError.message);
                    // TODO: error handling
                    return;
                }

                chrome.sockets.udp.bind(info.socketId, '0.0.0.0', agent_config.port, function(result) {
                    if (result < 0) {
                        log("Binding socket failed. cause=" + chrome.runtime.lastError.message);
                        // TODO: error handling
                        return;
                    }


                    chrome.sockets.udp.joinGroup(info.socketId, agent_config.groupAddress, function(result) {
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

    function agent_stop() {
        if (socketId) {
            chrome.sockets.udp.leaveGroup(socketId, agent_config.groupAddress, function(result) {
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

    function agent_sendMessage(message) {
        chrome.sockets.udp.send(socketId, str2ab(message), agent_config.groupAddress, agent_config.port, function(info) {
            if (info.resultCode < 0) {
                log("send failed. cause=" + chrome.runtime.lastError.message);
                // TODO: error handling
                return;
            }
            log(info.bytesSent + " bytes sent.");
        });
    }

    pisces = {
        "uuid" : {
            "generate" : uuid_generate,
            "binrepl" : uuid_binrepl
        },
        "agent" : {
            "start" : agent_start,
            "stop" : agent_stop,
            "sendMessage" : agent_sendMessage,
            "config" : agent_config,
            "listeners" : agent_listeners
        }
    };
})();
