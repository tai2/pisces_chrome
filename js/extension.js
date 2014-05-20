function addPiscesExtension(window) {

    window.Function.prototype.method = function(name, func) {
        if (typeof this.prototype[name] === 'undefined') {
            this.prototype[name] = func;
        }
        return this;
    };

    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    window.Array.method('find', function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            if (i in list) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
        }
        return undefined;
    }); 

    // TODO: Validate data source to guarantee a valid UTF-16 string.
    window.DataView.method('getString', function(byteOffset, length) {
        var array = new Array(length);
        var i, code;
        for (i = 0; i < length; i++) {
            code = this.getUint16(byteOffset + 2 * i, false);
            if (code === 0) {
                array.length = i;
                break;
            } else {
                array[i] = code;
            }
        }
        return String.fromCharCode.apply(null, array);
    });

    // TODO: This method may cut a surrogate pair. We should check the value.
    window.DataView.method('setString', function(byteOffset, length, value) {
        var strlen = value.length;
        var i;
        for (i = 0; i < length; i++) {
            if (i < strlen) {
                this.setUint16(byteOffset + 2 * i, value.charCodeAt(i), false);
            } else {
                this.setUint16(byteOffset + 2 * i, 0, false);
            }
        }
    });

    window.DataView.method('getUuid', function(byteOffset) {
        var uuid = "";
        var i;

        for (i = 0; i < 4; i++) {
            uuid += ((this.getUint8(byteOffset)>>4)&0xF).toString(16);
            uuid += ((this.getUint8(byteOffset)>>0)&0xF).toString(16);
            byteOffset++;
        }
        uuid += "-";
        for (i = 0; i < 2; i++) {
            uuid += ((this.getUint8(byteOffset)>>4)&0xF).toString(16);
            uuid += ((this.getUint8(byteOffset)>>0)&0xF).toString(16);
            byteOffset++;
        }
        uuid += "-";
        for (i = 0; i < 2; i++) {
            uuid += ((this.getUint8(byteOffset)>>4)&0xF).toString(16);
            uuid += ((this.getUint8(byteOffset)>>0)&0xF).toString(16);
            byteOffset++;
        }
        uuid += "-";
        for (i = 0; i < 2; i++) {
            uuid += ((this.getUint8(byteOffset)>>4)&0xF).toString(16);
            uuid += ((this.getUint8(byteOffset)>>0)&0xF).toString(16);
            byteOffset++;
        }
        uuid += "-";
        for (i = 0; i < 6; i++) {
            uuid += ((this.getUint8(byteOffset)>>4)&0xF).toString(16);
            uuid += ((this.getUint8(byteOffset)>>0)&0xF).toString(16);
            byteOffset++;
        }

        return uuid;
    });

    window.DataView.method('setUuid', function(byteOffset, uuid) {
        var i = 0;

        // first segment
        this.setUint8(byteOffset + 0, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 1, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 2, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 3, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        i++;

        // second segment
        this.setUint8(byteOffset + 4, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 5, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        i++;

        // third segment
        this.setUint8(byteOffset + 6, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 7, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        i++;

        // fourth segment
        this.setUint8(byteOffset + 8, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 9, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        i++;

        // last segment
        this.setUint8(byteOffset + 10, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 11, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 12, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 13, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 14, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
        this.setUint8(byteOffset + 15, (parseInt(uuid.charAt(i++), 16)<<4) | parseInt(uuid.charAt(i++), 16));
    });

    window.DataView.method('getSha1Hash', function(byteOffset) {
        var hash = "", i;
        for (i = byteOffset; i < byteOffset + 20; i++) {
            hash += ((this.getUint8(i)>>4)&0xF).toString(16);
            hash += ((this.getUint8(i)>>0)&0xF).toString(16);
        }
        return hash;
    });

    window.DataView.method('setSha1Hash', function(byteOffset, hash) {
        var i;
        for (i = 0; i < 20; i++) {
            this.setUint8(byteOffset + i, (parseInt(hash.charAt(2 * i), 16)<<4) | parseInt(hash.charAt(2 * i + 1), 16));
        }
    });
}
