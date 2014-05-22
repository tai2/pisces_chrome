var pisces = (function() {

    const MTU = 1500;
    const IP_HEADER_SIZE = 20; // no options assumed
    const UDP_HEADER_SIZE = 8;
    const UDP_PAYLOAD_SIZE = MTU - IP_HEADER_SIZE - UDP_HEADER_SIZE;
    const PT_HELLO = 0x01;
    const PT_BYE = 0x02;
    const PT_MESSAGE = 0x03;
    const PT_FILE_LIST_REQUEST = 0x04;
    const PT_FILE_LIST = 0x05;
    const PT_FILE_SEGMENT_REQUEST = 0x06;
    const PT_FILE_SEGMENT = 0x07;
    const EMPTY_USER_ID = "00000000-0000-0000-0000-000000000000";
    const MESSAGE_HEADER_SIZE = 1 + 3 + 16 + 4 + 8 + 20 + 4;
    const MESSAGE_BODY_LIMIT = UDP_PAYLOAD_SIZE - MESSAGE_HEADER_SIZE;
    const BUFFER_LIMIT = 64 * 1024;

    var messagesSent = [];
    var socketId = null;
    var agent = {
        "start" : agent_start,
        "stop" : agent_stop,
        "sendHello" : agent_sendHello,
        "sendBye" : agent_sendBye,
        "sendMessage" : agent_sendMessage,
        "participants" : {},
        "config" : {
            "userId" : null,
            "groupAddress" : "224.0.0.1",
            "port" : 30000,
            "username" : null
        },
        "seqnum" : 0,
        "listeners" : {
            "onHello" : null,
            "onBye" : null,
            "onMessage" : null
        }
    }

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
        var type = dataview.getUint8(0);

        log("onReceive type=" + type + " size=" + info.data.byteLength);

        switch (type) {
        case PT_HELLO:
            parseHello(info);
            break;
        case PT_BYE:
            parseBye(info);
            break;
        case PT_MESSAGE:
            parseMessage(info);
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

                chrome.sockets.udp.bind(info.socketId, '0.0.0.0', agent.config.port, function(result) {
                    if (result < 0) {
                        log("Binding socket failed. cause=" + chrome.runtime.lastError.message);
                        // TODO: error handling
                        return;
                    }


                    chrome.sockets.udp.joinGroup(info.socketId, agent.config.groupAddress, function(result) {
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
            chrome.sockets.udp.leaveGroup(socketId, agent.config.groupAddress, function(result) {
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

    function agent_sendHello(destinationId, callback) {
        var byteLength = 1 + 3 + 16 + 16 + 20 + 60 * 2;
        var buf = new ArrayBuffer(byteLength);
        var dataview = new DataView(buf);

        var destId;
        var destAddr;
        if (destinationId === undefined) {
            destId = EMPTY_USER_ID;
            destAddr = agent.config.groupAddress;
        } else {
            if (agent.participants[destinationId]) {
                destId = destinationId;
                destAddr = agent.participants[destinationId].remoteAddress;
            } else {
                return;
            }
        }

        dataview.setUint8(0, PT_HELLO, false);
        dataview.setUuid(4, agent.config.userId);
        dataview.setUuid(4 + 16, destId);
        dataview.setSha1Hash(4 + 16 + 16, '0000000000000000000000000000000000000000');
        dataview.setString(4 + 16 + 16 + 20, 60, agent.config.username);

        chrome.sockets.udp.send(socketId, buf, destAddr, agent.config.port, function(info) {
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
        var dataview = new DataView(info.data, 4);
        var senderId = dataview.getUuid(0);
        var destinationId = dataview.getUuid(16);
        var iconHash = dataview.getSha1Hash(16 + 16);
        var username = dataview.getString(16 + 16 + 20, 60);

        agent.participants[senderId] = {
            id : senderId,
            icon_hash : iconHash,
            username : username,
            remoteAddress : info.remoteAddress,
            remotePort : info.remotePort,
            receiveBuffer : [],
            bufferSize : 0,
            assembleTable : {},
            receivedMessages : {}
        };

        if (destinationId === EMPTY_USER_ID) {
            agent_sendHello(senderId);
        }

        if (agent.listeners.onHello) {
            agent.listeners.onHello(agent.participants[senderId]);
        }
    }

    function agent_sendBye(callback) {
        var byteLength = 1 + 3 + 16;
        var buf = new ArrayBuffer(byteLength);
        var dataview = new DataView(buf);

        dataview.setUint8(0, PT_BYE, false);
        dataview.setUuid(4, agent.config.userId);

        chrome.sockets.udp.send(socketId, buf, agent.config.groupAddress, agent.config.port, function(info) {
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
        var dataview = new DataView(info.data, 4);
        var senderId = dataview.getUuid(0);

        if (senderId !== agent.config.userId) {
            var leftUser = agent.participants[senderId];

            delete agent.participants[senderId];

            if (agent.listeners.onBye) {
                agent.listeners.onBye(leftUser);
            }
        }
    }

    function findMessage(seqnum) {
        return messagesSent.find(function(elem) {
            return elem.seqnum <= seqnum && seqnum < elem.seqnum + elem.numPackets;
        });
    }

    function numPackets(messageLen) {
        return Math.floor((messageLen * 2 + MESSAGE_BODY_LIMIT - 1) / MESSAGE_BODY_LIMIT);
    }

    function sendMessagePacket(seqnum, callback) {
        var packnum, bodyLength, flags, buf, dataview, substr, info;

        info = findMessage(seqnum);
        if (!info) {
            log("No message found. seqnum=" + seqnum);
            return;
        }

        packnum = seqnum - info.seqnum;
        bodyLength = packnum < info.numPackets - 1 ?  MESSAGE_BODY_LIMIT : info.message.length * 2 - MESSAGE_BODY_LIMIT * packnum;
        flags = packnum === 0 ? 0x800000 : 0x000000;
        buf = new ArrayBuffer(MESSAGE_HEADER_SIZE + bodyLength);
        dataview = new DataView(buf);
        substr = info.message.substr(packnum * MESSAGE_BODY_LIMIT / 2, bodyLength / 2);

        dataview.setUint8(0, PT_MESSAGE, false);
        dataview.setUint8(1, (flags>>16)&0xFF);
        dataview.setUint8(2, (flags>> 8)&0xFF);
        dataview.setUint8(3, (flags>> 0)&0xFF);
        dataview.setUuid(4, agent.config.userId);
        dataview.setUint32(4 + 16, seqnum);
        dataview.setFloat64(4 + 16 + 4, info.timestamp, false);
        dataview.setSha1Hash(4 + 16 + 4 + 8, info.hash);
        dataview.setUint32(4 + 16 + 4 + 8 + 20, info.message.length, false);
        dataview.setString(4 + 16 + 4 + 8 + 20 + 4, substr.length, substr);

        chrome.sockets.udp.send(socketId, buf, agent.config.groupAddress, agent.config.port, function(info) {
            if (info.resultCode < 0) {
                log("send failed. cause=" + chrome.runtime.lastError.message);
            } else {
                log(info.bytesSent + " bytes sent. seqnum=" + seqnum);
            }

            if (callback) {
                callback(info.resultCode);
            }
        });
    }

    function seqgen(initial, num) {
        var result = [], i;
        for (i = 0; i < num; i++) {
            result.push(initial + i);
        }
        return result;
    }

    function agent_sendMessage(messageOrSeqnum, callback) {
        var packetsSent = [];
        var messageInfo, seqnums, i;

        if (typeof messageOrSeqnum === 'number') {
            sendMessagePacket(messageOrSeqnum, function(result) {
                var sent, failed;
                if (result < 0) {
                    sent = [];
                    failed = [messageOrSeqnum];
                } else {
                    sent = [messageOrSeqnum];
                    failed = [];
                }
                if (callback) {
                    callback(result, {
                        sent : sent,
                        failed : failed
                    });
                }
            });
        } else {
            messageInfo = {
                seqnum : agent.seqnum + 1,
                numPackets : numPackets(messageOrSeqnum.length),
                timestamp : Date.now(),
                message : messageOrSeqnum,
                hash : CryptoJS.SHA1(messageOrSeqnum).toString()
            };
            messagesSent.push(messageInfo);
            agent.seqnum += messageInfo.numPackets;

            seqnums = seqgen(messageInfo.seqnum, messageInfo.numPackets);
            send(0);
        }

        function send(packnum) {
            sendMessagePacket(seqnums[packnum], function(result) {
                var failed, i;
                if (result >= 0) {
                    packetsSent.push(seqnums[packnum]);

                    if (packnum + 1 == messageInfo.numPackets) {
                        if (callback) {
                            callback(result, {
                                sent : packetsSent,
                                failed : []
                            });
                        }
                    } else {
                        send(packnum + 1);
                    }
                } else {
                    if (callback) {
                        failed = [];
                        for (i = packnum; i < messageInfo.numPackets; i++) {
                            failed.push(seqnums[i]);
                        }
                        callback(result, {
                            sent : packetsSent,
                            failed : failed
                        });
                    }
                }
            });
        }
    }

    function parseMessage(info) {
        var dataview = new DataView(info.data);
        var flags = (dataview.getUint8(1)<<16) | (dataview.getUint8(2)<<8) | dataview.getUint8(3);
        var senderId = dataview.getUuid(4);
        var seqnum = dataview.getUint32(4 + 16, false);
        var timestamp = dataview.getFloat64(4 + 16 + 4, false);
        var hash = dataview.getSha1Hash(4 + 16 + 4 + 8);
        var messageLength = dataview.getUint32(4 + 16 + 4 + 8 + 20, false);
        var body = dataview.getString(4 + 16 + 4 + 8 + 20 + 4, (info.data.byteLength - MESSAGE_HEADER_SIZE) / 2);
        var user, packet, key;

        user = agent.participants[senderId];
        key = hash + '_' + timestamp;
        if (user) {
            if (!user.receivedMessages[key]) {
                packet = {
                    flags : flags,
                    seqnum : seqnum,
                    timestamp : timestamp,
                    hash : hash,
                    messageLength : messageLength,
                    body : body,
                    numPackets : numPackets(messageLength)
                };

                user.receiveBuffer.push(packet);
                user.bufferSize += body.length * 2 + MESSAGE_HEADER_SIZE;
                setupAssembling(user, packet);
                assemble(user, packet);
                shrink(user);

                log("user=" + senderId + " bufferSize=" + user.bufferSize);
            }
        } else {
            // TODO: Query user information?
        }

        function setupAssembling(user, packet) {
            var assembling, key;
            if (packet.flags&0x800000) {
                key = packet.hash + '_' + packet.timestamp;
                assembling = user.assembleTable[key];
                if (assembling) {
                    assembling.initialPacket = packet;
                    assembling.packets[packet.seqnum] = packet;
                } else {
                    assembling = {
                        initialPacket: packet,
                        packets : {},
                        seqnums : seqgen(packet.seqnum, packet.numPackets)
                    };
                    user.assembleTable[key] = assembling;
                    user.receiveBuffer.forEach(function(packet) {
                        // XXX: A little slow? It may be good to add a hash set of seqnums to assembleTable.
                        if (assembling.seqnums.indexOf(packet.seqnum) !== -1) {
                            assembling.packets[packet.seqnum] = packet;
                        }
                    });
                }
            }
        }

        function assemble(user, packet) {
            var initialPacket, allset, message, hash;
            var key = packet.hash + '_' + packet.timestamp;
            var assembling = user.assembleTable[key];
            if (assembling) {
                initialPacket = assembling.initialPacket;
                if (initialPacket.seqnum <= packet.seqnum
                        && packet.seqnum < initialPacket.seqnum + initialPacket.numPackets) {
                    assembling.packets[packet.seqnum] = packet;
                    allset = assembling.seqnums.every(function(n) { return assembling.packets[n]; });
                    if (allset) {
                        if (agent.listeners.onMessage) {
                            message = assembling.seqnums.reduce(
                                    function(prev, curr) {return prev + assembling.packets[curr].body;}, "");
                            hash = CryptoJS.SHA1(message).toString();
                            if (hash === initialPacket.hash) {
                                agent.listeners.onMessage(message, initialPacket.timestamp);
                            }
                        }
                        user.receivedMessages[key] = true;
                        delete user.assembleTable[key];
                    }
                }
            }
        }

        function shrink(user) {
            var packet, assembling, key;
            while (BUFFER_LIMIT < user.bufferSize) {
                packet = user.receiveBuffer.shift();
                user.bufferSize -= body.length * 2 + MESSAGE_HEADER_SIZE;
                key = packet.hash + '_' + packet.timestamp;
                assembling = user.assembleTable[key];
                if (assembling) {
                    if (packet.flags&0x800000) {
                        if (assembling.initialPacket === packet) {
                            delete user.assembleTable[key];
                        }
                    } else {
                        if (assembling.packets[packet.seqnum] === packet) {
                            delete assembling.packets[packet.seqnum];
                        }
                    }
                }
            }
        }
    }

    return {
        "uuid" : {
            "generate" : uuid_generate,
        },
        "agent" : agent
    };
})();
