var pisces;

(function() {

    const PT_HELLO = 0x01;
    const PT_BYE = 0x02;
    const PT_MESSAGE = 0x03;
    const PT_FILE_LIST_REQUEST = 0x04;
    const PT_FILE_LIST = 0x05;
    const PT_FILE_SEGMENT_REQUEST = 0x06;
    const PT_FILE_SEGMENT = 0x07;
    const EMPTY_USER_ID = "00000000-0000-0000-0000-000000000000";

    var socketId = null;
    var agent_config = {
        "userId" : null,
        "groupAddress" : "224.0.0.1",
        "port" : 30000,
        "username" : "Anonymous"
    };
    var agent_listeners = {
        "onHello" : null,
        "onBye" : null,
        "onMessage" : null
    };
    var agent_participants = {};

    function log(msg) {
        chrome.runtime.getBackgroundPage(function(window) {
            window.console.log(msg);
        })
    }

    function uuid_generate() {
        // XXX: I don't now this is a correct way to generate a random UUID.
        var array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return new DataView(array.buffer).getUuid(0);
    }

    chrome.sockets.udp.onReceive.addListener(function(info) {
        if (socketId !== info.socketId) {
            return;
        }

        // TODO: Check data length

        var dataview = new DataView(info.data);
        var type = dataview.getUint16(0, false);

        log("onReceive type=" + type + " size=" + info.data.byteLength);

        switch (type) {
        case PT_HELLO:
            parseHello(info);
            break;
        case PT_BYE:
            parseBye(info);
            break;
        }
    });

    chrome.sockets.udp.onReceiveError.addListener(function (info) {
        log("onReceiveError resultCode=" + info.resultCode);

        // TODO: error handling
    });

    function agent_start(callback) {
        chrome.sockets.udp.create({}, function(info) {
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
                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        });
    }

    function agent_stop(callback) {
        if (socketId) {
            chrome.sockets.udp.leaveGroup(socketId, agent_config.groupAddress, function(result) {
                if (result < 0) {
                    log("leaving multicast group failed. cause=" + chrome.runtime.lastError.message);
                }
                chrome.sockets.udp.close(socketId, function() {
                    socketId = null;
                    if (callback) {
                        callback();
                    }
                });
            });
        }
    }

    function agent_sendMessage(message) {
    }

    function agent_sendHello(destinationId, callback) {
        var byteLength = 2 + 16 + 16 + 20 + 60 * 2;
        var buf = new ArrayBuffer(byteLength);
        var dataview = new DataView(buf);

        var destId;
        var destAddr;
        if (destinationId === undefined) {
            destId = EMPTY_USER_ID;
            destAddr = agent_config.groupAddress;
        } else {
            if (agent_participants[destinationId]) {
                destId = destinationId;
                destAddr = agent_participants[destinationId].remoteAddress;
            } else {
                return;
            }
        }

        dataview.setUint16(0, PT_HELLO, false);
        dataview.setUuid(2, agent_config.userId);
        dataview.setUuid(2 + 16, destId);
        dataview.setSha1Hash(2 + 16 + 16, '0000000000000000000000000000000000000000');
        dataview.setString(2 + 16 + 16 + 20, 60, agent_config.username);

        chrome.sockets.udp.send(socketId, buf, destAddr, agent_config.port, function(info) {
            if (callback) {
                callback(info.resultCode);
            }

            if (info.resultCode < 0) {
                log("send failed. cause=" + chrome.runtime.lastError.message);
                // TODO: error handling
                return;
            }
            log(info.bytesSent + " bytes sent.");
        });
    }

    function parseHello(info) {
        var dataview = new DataView(info.data, 2);
        var senderId = dataview.getUuid(0);
        var destinationId = dataview.getUuid(16);
        var iconHash = dataview.getSha1Hash(16 + 16);
        var username = dataview.getString(16 + 16 + 20, 60);

        if (senderId !== agent_config.userId) {
            agent_participants[senderId] = {
                "id" : senderId,
                "icon_hash" : iconHash,
                "username" : username,
                "remoteAddress" : info.remoteAddress,
                "remotePort" : info.remotePort
            }

            if (destinationId === EMPTY_USER_ID) {
                agent_sendHello(senderId);
            }

            if (agent_listeners.onHello) {
                agent_listeners.onHello(agent_participants[senderId]);
            }
        }
    }

    function agent_sendBye(callback) {
        var byteLength = 2 + 16;
        var buf = new ArrayBuffer(byteLength);
        var dataview = new DataView(buf);

        dataview.setUint16(0, PT_BYE, false);
        dataview.setUuid(2, agent_config.userId);

        chrome.sockets.udp.send(socketId, buf, agent_config.groupAddress, agent_config.port, function(info) {
            if (callback) {
                callback(info.resultCode);
            }

            if (info.resultCode < 0) {
                log("send failed. cause=" + chrome.runtime.lastError.message);
                // TODO: error handling
                return;
            }
            log(info.bytesSent + " bytes sent.");
        });
    }

    function parseBye(info) {
        var dataview = new DataView(info.data, 2);
        var senderId = dataview.getUuid(0);

        if (senderId !== agent_config.userId) {
            var leftUser = agent_participants[senderId];

            delete agent_participants[senderId];

            if (agent_listeners.onBye) {
                agent_listeners.onBye(leftUser);
            }
        }
    }

    pisces = {
        "uuid" : {
            "generate" : uuid_generate,
        },
        "agent" : {
            "start" : agent_start,
            "stop" : agent_stop,
            "sendHello" : agent_sendHello,
            "sendBye" : agent_sendBye,
            "sendMessage" : agent_sendMessage,
            "participants" : agent_participants,
            "config" : agent_config,
            "listeners" : agent_listeners
        }
    };
})();
