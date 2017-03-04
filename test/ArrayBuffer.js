var chai = require('chai');
var assert = chai.assert;
var ArrayBuffer = require("../src/ArrayBuffer.js");
var BasicShape = require("../src/BasicShape.js");

describe('ArrayBufferFloat32Array', function() {
    var brick = new BasicShape.Brick();
    var brickVertices = brick.getVertices();
    var BRICK = 'brick';
    var impl = new ArrayBuffer.ArrayBufferFloat32Array(brickVertices.length);

    describe('#getArray', function() {
        it('should return Float32Array', function() {
            assert.instanceOf(impl.getArray(), Float32Array);
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return undefined when no object appended', function() {
            assert.isUndefined(impl.getObjectStartPosition(BRICK));
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return 0 when appended brick object', function() {
            impl.appendObject(BRICK, brickVertices);
            assert.equal(0, impl.getObjectStartPosition(BRICK));
        });
    });

    describe('#getArray', function() {
        it('should return the same value as brickVertices when access the same index', function() {
            var array = impl.getArray();
            var testIndex = 7;
            assert.strictEqual(brickVertices[7], array[7]);
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return undefined when no cylinder object appended', function() {
            assert.isUndefined(impl.getObjectStartPosition('cylinder'));
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should throw RangeError when appended out of range', function() {
            assert.throws(
                function() { impl.appendObject(BRICK, brickVertices)},
                RangeError);
        });
    });
});

describe('ArrayBufferUint8Array', function() {
    var brick = new BasicShape.Brick();
    var brickVerticesIndices = brick.getVerticesIndices();
    var BRICK = 'brick';
    var impl = new ArrayBuffer.ArrayBufferUint8Array(brickVerticesIndices.length);

    describe('#getArray', function() {
        it('should return Uint8Array', function() {
            assert.instanceOf(impl.getArray(), Uint8Array);
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return undefined when no object appended', function() {
            assert.isUndefined(impl.getObjectStartPosition(BRICK));
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return 0 when appended brick object', function() {
            impl.appendObject(BRICK, brickVerticesIndices);
            assert.equal(0, impl.getObjectStartPosition(BRICK));
        });
    });

    describe('#getArray', function() {
        it('should return the same value as brickVerticesIndices when access the same index', function() {
            var array = impl.getArray();
            var testIndex = 7;
            assert.strictEqual(brickVerticesIndices[7], array[7]);
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should return undefined when no cylinder object appended', function() {
            assert.isUndefined(impl.getObjectStartPosition('cylinder'));
        });
    });

    describe('#getObjectStartPosition', function() {
        it('should throw RangeError when appended out of range', function() {
            assert.throws(
                function() { impl.appendObject(BRICK, brickVerticesIndices)},
                RangeError);
        });
    });
});