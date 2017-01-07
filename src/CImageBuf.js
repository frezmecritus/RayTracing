//==============================================================================
// Construct an 'image-buffer' object to hold a floating-point ray-traced image.
//  Contains BOTH
//  iBuf -- 2D array of 8-bit RGB pixel values we can display on-screen, AND
//  fBuf -- 2D array of floating-point RGB pixel values we usually CAN'T display,
//          but contains full-precision results of ray-tracing.
//          --Both buffers hold the same numbers of pixel values (xSiz,ySiz,pixSiz)
//          --imgBuf.int2float() copies/converts current iBuf contents to fBuf
//          --imgBuf.float2int() copies/converts current fBuf contents to iBuf
//  WHY?  
//  --Our ray-tracer computes floating-point light amounts(e.g. radiance L)
//    but neither our display nor our WebGL texture-map buffers can accept 
//      images with floating-point pixel values.
//  --You will NEED all those floating-point values for applications such as
//    environment maps (re-lighting from sky image) and lighting simulations.
// Stay simple in early versions of your ray-tracer: keep 0.0 <= RGB < 1.0, 
// but later you can modify your ray-tracer 
// to use radiometric units of Radiance (watts/(steradians*meter^2), or convert 
// to use photometric units of luminance (lumens/(steradians*meter^2 aka cd/m^2) 
// to compute in physically verifiable units of visible light.
function CImgBuf(wide, tall) {

	this.xSiz = wide;			// image width in pixels
	this.ySiz = tall;			// image height in pixels
	this.pixSiz = 3;			// pixel size (3 for RGB, 4 for RGBA, etc)
	this.iBuf = new Uint8Array(  this.xSiz * this.ySiz * this.pixSiz);  
	this.fBuf = new Float32Array(this.xSiz * this.ySiz * this.pixSiz);
}

//==============================================================================
// Replace current 8-bit RGB contents of 'imgBuf' with a colorful pattern
// 2D color image:  8-bit unsigned integers in a 256*256*3 array
// to store r,g,b,r,g,b integers (8-bit)
// In WebGL texture map sizes MUST be a power-of-two (2,4,8,16,32,64,...4096)
// with origin at lower-left corner
// (NOTE: this 'power-of-two' limit will probably vanish in a few years of
// WebGL advances, just as it did for OpenGL)
CImgBuf.prototype.setTestPattern = function(pattNum) {
	 
	// use local vars to set the array's contents.
  for(var j=0; j< this.ySiz; j++) {                     // for the j-th row of pixels
  	for(var i=0; i< this.xSiz; i++) {                   // and the i-th pixel on that row,
  		var idx = (j*this.xSiz + i)*this.pixSiz;// Array index at pixel (i,j) 
  		switch(pattNum) {
  			case 0: //================(Colorful L-shape)============================
  				if(i < this.xSiz/4 || j < this.ySiz/4) {
  					this.iBuf[idx   ] = i;                              // 0 <= red <= 255
  					this.iBuf[idx +1] = j;                              // 0 <= grn <= 255
  				}
  				else {
  					this.iBuf[idx   ] = 0;
  					this.iBuf[idx +1] = 0;
  					}
  				this.iBuf[idx +2] = 255 -i -j;                              // 0 <= blu <= 255
  				break;
  			  case 1: //================(bright orange)===============================
  				this.iBuf[idx   ] = 255;    // bright orange
  				this.iBuf[idx +1] = 128;
  				this.iBuf[idx +2] =   0;
  				break;
  			default:
  				console.log("imgBuf.setTestPattern() says: WHUT!?");
  			break;
  		}
  	}
  }
  this.int2float();     // fill the floating-point buffer with same test pattern.
}

//==============================================================================
// Convert current integerRGB image in iBuf into floating-point RGB image in fBuf
CImgBuf.prototype.int2float = function() {
	for(var j=0; j< this.ySiz; j++) {       // for each scanline
		for(var i=0; i< this.xSiz; i++) {       // for each pixel on that scanline
			var idx = (j*this.xSiz + i)*this.pixSiz;// Find array index at pixel (i,j)
				// convert integer 0 <= RGB <= 255 to floating point 0.0 <= R,G,B <= 1.0
			this.fBuf[idx   ] = this.iBuf[idx   ] / 255.0;  // red
			this.fBuf[idx +1] = this.iBuf[idx +1] / 255.0;  // grn
			this.fBuf[idx +2] = this.iBuf[idx +2] / 255.0;  // blu
		}
  }
}

//==============================================================================
// Convert current floating-point RGB image in fBuf into integerRGB image in iBuf
CImgBuf.prototype.float2int = function() {
	for(var j=0; j< this.ySiz; j++) {       // for each scanline
		for(var i=0; i< this.xSiz; i++) {   // for each pixel on that scanline
			var idx = (j*this.xSiz + i)*this.pixSiz;// Find array index at pixel (i,j)
				// find 'clamped' color values that stay >=0.0 and <=1.0:
			var rval = Math.min(1.0, Math.max(0.0, this.fBuf[idx   ]));
			var gval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +1]));
			var bval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +2]));
				// Divide [0,1] span into 256 equal-sized parts: e.g.  Math.floor(rval*256)
				// In the rare case when rval==1.0 you get unwanted '256' result that won't
				// fit into the 8-bit RGB values.  Fix it with Math.min():
			this.iBuf[idx   ] = Math.min(255,Math.floor(rval*256.0));   // red
			this.iBuf[idx +1] = Math.min(255,Math.floor(gval*256.0));   // grn
			this.iBuf[idx +2] = Math.min(255,Math.floor(bval*256.0));   // blu
		}
  }
}
