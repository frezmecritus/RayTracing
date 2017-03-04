function ArrayBufferPrototype() {}

ArrayBufferPrototype.prototype.getArray = function () {
    return this.array;
}

ArrayBufferPrototype.prototype.appendObject = function (objectName, vertices) {
    this.objectsNameStartPositionMap[objectName] = this.currentEnd;
    this.objectsNameLengthMap[objectName] = vertices.length;
    try {
        this.array.set(vertices, this.currentEnd);
    } catch (e) {
        throw e;
    };
    this.currentEnd += vertices.length;
}

ArrayBufferPrototype.prototype.getObjectStartPosition = function(objectName) {
    return this.objectsNameStartPositionMap[objectName];
}

ArrayBufferPrototype.prototype.getObjectLength = function(objectName) {
    return this.objectsNameLengthMap[objectName];
}

ArrayBufferFloat32Array.prototype = Object.create(ArrayBufferPrototype.prototype);
ArrayBufferFloat32Array.prototype.constructor = ArrayBufferFloat32Array;
function ArrayBufferFloat32Array(length) {
    this.array = new Float32Array(length);
    this.objectsNameStartPositionMap = {};
    this.objectsNameLengthMap = {};
    this.currentEnd = 0;
}

ArrayBufferUint8Array.prototype = Object.create(ArrayBufferPrototype.prototype);
ArrayBufferUint8Array.prototype.constructor = ArrayBufferUint8Array;
function ArrayBufferUint8Array(length) {
    this.array = new Uint8Array(length);
    this.objectsNameStartPositionMap = {};
    this.objectsNameLengthMap = {};
    this.currentEnd = 0;
}

if(typeof exports !== 'undefined') {
    module.exports = {ArrayBufferFloat32Array, ArrayBufferUint8Array};
}
