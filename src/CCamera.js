//==============================================================================
// Object for a ray-tracing camera defined the 'world' coordinate system, with
// a) -- 'extrinsic' parameters that set the camera's position and aiming
//	from the camera-defining UVN coordinate system 
// (coord. system origin at the eye-point; coord axes U,V define camera image 
// horizontal and vertical; camera gazes along the -N axis): 
// Default settings: put camera eye-point at world-space origin, and
function CCamera(eye, center, up, fov) {		// all input in vec4

	// this.eyePt = vec4.fromValues(0,0,0,1);
	this.eyePt = eye;
	this.front = vec4.sub(vec4.create(),eye,center);
	this.refUp = up;
	this.fov   = fov;

	this.nAxis = vec4.normalize(vec4.create(),this.front);
	this.uAxis = vec4.normalize(vec4.create(),vec4.cross(this.nAxis,this.refUp));
	this.vAxis = vec4.normalize(vec4.create(),vec4.cross(this.nAxis,this.uAxis));
			// (and thus we're gazing down the -Z axis with default camera). 

// b) --  Camera 'intrinsic' parameters that set the camera's optics and images.
// They define the camera's image frustum: its image plane is at N = -znear  (the
// plane that 'splits the universe', perpendicular to N axis), and no 'zfar' 
// plane at all (not needed: ray-tracer doesn't have or need the CVV).  
// The ray-tracing camera creates an rectangular image plane perpendicular to  
//	the cam-coord. system N axis at -iNear (defined by N vector in world coords),
// 			horizontally	spanning 'iLeft' <= u <= 'iRight' along the U vector, and
//			vertically    spanning  'iBot' <= v <=  'iTop' along the V vector. 
// As the default camera creates an image plane at distance iNear = 1 from the 
// camera's center-of-projection (at the u,v,n origin), these +/-1 
// defaults define a square ray-traced image with a +/-45-degree field-of-view:
	this.iNear  =  1.0;
	this.iLeft  = -1.0;
	this.iRight =  1.0;
	this.iBot   = -1.0;
	this.iTop   =  1.0;
// And the lower-left-most corner of the image is at (u,v,n) = (iLeft,iBot,-1).
	this.xmax   = 256;			// horizontal,
	this.ymax   = 256;			// vertical image resolution.
// To ray-trace an image of xmax,ymax pixels, divide this rectangular image plane
// into xmax,ymax rectangular tiles, and shoot eye-rays from the camera's
// center-of-projection through those tiles to find scene color values.  For the 
// simplest, fastest image (without antialiasing) trace each eye-ray through the 
// CENTER of each tile to find pixel colors.  For slower, better-looking, 
// anti-aliased image making, apply jittered super-sampling:
//  For each pixel:		--subdivide the 'tile' into equal-sized 'sub-tiles'  
//										--trace one ray per sub-tile, but randomize (jitter)
//											 the ray's position within the sub-tile,
//										--set pixel color to the average of all sub-tile colors. 
// Divide the image plane into rectangular tiles, one for each pixel:
	this.ufrac = (this.iRight - this.iLeft) / this.xmax;	// pixel tile's width
	this.vfrac = (this.iTop   - this.iBot ) / this.ymax;	// pixel tile's height.
}

CCamera.prototype.setFrustum = function(left, right, body, top, near, xsize, ysize) {
	this.iLeft = left;
	this.iRight = right;
	this.iBot = body;
	this.iTop = top;
	this.iNear = near;

	this.xmax = xsize;
	this.ymax = ysize;

	this.ufrac = (this.iRight - this.iLeft)/this.xmax;
	this.vfrac = (this.iTop - this.iBot)/this.ymax;
};

//==============================================================================
// Set values of a CRay object to specify a ray in world coordinates that 
// originates at the camera's eyepoint (its center-of-projection: COP) and aims 
// in the direction towards the image-plane location (xpos,ypos) given in units 
// of pixels.  The ray's direction vector is *NOT* normalized.
//
// !CAREFUL! Be SURE you understand these floating-point xpos,ypos arguments!
// For the default CCamera (+/-45 degree FOV, xmax,ymax == 256x256 resolution) 
// the function call makeEyeRay(0,0) creates a ray to the image rectangle's 
// lower-left-most corner at U,V,N = (iLeft,iBot,-1), and the function call
// makeEyeRay(256,256) creates a ray to the image rectangle's upper-left-most  
// corner at U,V,N = (iRight,iTop,-1). 
//	To get the eye ray for pixel (x,y), DON'T call setEyeRay(myRay, x,y);
//                                   instead call setEyeRay(myRay,x+0.5,y+0.5)
// (Later you will trace multiple eye-rays per pixel to implement antialiasing) 
// WHY?  
//	-- because the half-pixel offset (x+0.5, y+0.5) traces the ray through the
//     CENTER of the pixel's tile, and not its lower-left corner.
// As we learned in class (and from optional reading "A Pixel is Not a Little 
// Square" by Alvy Ray Smith), a pixel is NOT a little square -- it is a 
// point-like location, one of many in a grid-like arrangement, where we store a 
// neighborhood summary of an image's color(s).  While we could (and often do) 
// define that pixel's 'neighborhood' as a small tile of the image plane, and 
// summarize its color as the tile's average color, it is not our only choice 
// and certainly not our best choice.  
// (ASIDE: You can dramatically improve the appearance of a digital image by 
//     making pixels  that summarize overlapping tiles by making a weighted 
//     average for the neighborhood colors, with maximum weight at the pixel 
//     location, and with weights that fall smoothly to zero as you reach the 
//     outer limits of the pixel's tile or 'neighborhood'. Google: antialiasing 
//     bilinear filter, Mitchell-Netravali piecewise bicubic prefilter, etc).
CCamera.prototype.setEyeRay = function(myeRay, xpos, ypos) {

	// Convert image-plane location (xpos,ypos) in the camera's U,V,N coords:
	// var posU = this.iLeft + xpos*this.ufrac; // U coord,
	// var posV = this.iBot  + ypos*this.vfrac;	// V coord,
	var posU = xpos;
	var posV = ypos;
	//  and the N coord is always -1, at the image-plane (zNear) position.
	// Then convert this point location to world-space X,Y,Z coords using our 
	// camera's unit-length coordinate axes uAxis,vAxis,nAxis
	xyzPos = vec4.create();    // make vector 0,0,0,0.	
	vec4.scaleAndAdd(xyzPos, xyzPos, this.uAxis, posU);	// xyzPos += Uaxis * posU;
	vec4.scaleAndAdd(xyzPos, xyzPos, this.vAxis, posV);	// xyzPos += Vaxis * posU;
	vec4.scaleAndAdd(xyzPos, xyzPos, this.nAxis, -1);	// xyzPos += Naxis * (-1)
	// NEXT, WE --COULD-- 
	// finish converting from UVN coordinates to XYZ coordinates: we made a
	// weighted sum of the U,V,N axes; now add UVN origin point, and we
	// would get (xyzPos + eyePt).
	// BUT WE DON'T NEED TO DO THAT.
	// The eyeRay we want consists of just 2 world-space values:
	//  	-- the ray origin == camera origin == eyePt in XYZ coords
	//		-- the ray direction TO image-plane point FROM ray origin;
	//				myeRay.dir = (xyzPos + eyePt) - eyePt = xyzPos; thus
	vec4.copy(myeRay.orig, this.eyePt);	
	vec4.copy(myeRay.dir, xyzPos);
}

