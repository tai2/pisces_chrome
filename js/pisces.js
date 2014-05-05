var pisces;

(function() {
    var agent = createAgent('224.0.0.1', 30000);

    function generateUuid() {
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
    function uuidBinaryRepresentation(uuid) {
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

    pisces = {
        "uuid" : {
            "generate" : generateUuid,
            "binrepl" : uuidBinaryRepresentation
        },
        "agent" : agent
    };
})();
