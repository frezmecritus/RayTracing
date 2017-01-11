var assert = require('assert');
var ImageBuffer = require("../src/ImageBuffer");

describe('ImageBuffer', function() {
  var impl = new ImageBuffer(1, 1);
  impl.setTestPattern(impl.PATTERN_LIGHT_ORANGE);

  describe('#setTestPattern()', function() {
    it('should return correct rgb values', function() {
      assert.equal(255, impl.iBuf[0]);
      assert.equal(128, impl.iBuf[1]);
      assert.equal(0, impl.iBuf[2]);
    });
  });

  describe('#int2float()', function () {
    it('should return translated float32 values', function() {
      assert.equal(1.0, impl.fBuf[0]);
      assert.equal(Math.round(128.0/255.0, -3), Math.round(impl.fBuf[1], -3));
      assert.equal(0.0, impl.fBuf[2]);
    });
  });

  describe('#float2int()', function () {
    it('should return translated int values', function() {
      impl.float2int();
      assert.equal(255, impl.iBuf[0]);
      assert.equal(128, impl.iBuf[1]);
      assert.equal(0, impl.iBuf[2]);
    });
  });
});
