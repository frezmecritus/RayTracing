//==============================================================================
// A complete ray tracer object prototype (formerly a C/C++ 'class').
//      My code uses just one CScene instance (myScene) to describe the entire 
//			ray tracer.  Note that I could add more CScene variables to make multiple
//			ray tracers (perhaps on different threads or processors) and combine
//			their results into a video sequence, a giant image, or use one result
//			to help create another.
//
//The CScene class includes:
// One CImgBuf object that holds a floating-point RGB image, and uses that
//		  image to create a corresponding 8,8,8 bit RGB image suitable for WebGL
//			display as a texture-map in an HTML-5 canvas object within a webpage.
// One CCamera object that describes an antialiased ray-tracing camera;
//      in my code, it is the 'rayCam' variable within the CScene prototype.
//      The CCamera class defines the SOURCE of rays we trace from our eyepoint
//      into the scene, and uses those rays to set output image pixel values.
// One CRay object 'eyeRay' that describes the ray we're currently tracing from
//      eyepoint into the scene.
// One CHitList object 'eyeHits' that describes each 3D point where the 'eyeRay'
//      pierces a shape (a CGeom object) in our CScene.  Each CHitList object
//      in our ray-tracer holds a COLLECTION of hit-points (CHit objects) for a
//      ray, and keeps track of which hit-point is closest to the camera. That
//			collection is held in the eyeHits member of the CScene class.
// a COLLECTION of CGeom objects that each describe an individual visible thing,
//      single item or thing we may see in the scene.  That collection is the 
//			held in the 'item[]' array within the CScene class.
//      Each CGeom element in the 'item[]' array holds one shape on-screen.
//      To see three spheres and a ground-plane we'll have 4 CGeom objects, one 
//			for each of the spheres, and one for the ground-plane.
//      Each CGeom object includes a 'matlIndex' index number that selects which
//      material to use in rendering the CGeom shape. I assume all lights in the
//      scene may affect all CGeom shapes, but you may wish to add an light-src
//      index to permit each CGeom object to choose which lights(s) affect it.
// a COLLECTION of CMatl objects; each describes one light-modifying material.
//      That collection is held in the 'matter[]' array within the CScene class.
//      Each CMatl element in the 'matter[]' array describes one particular
//      individual material we will use for one or more CGeom shapes. We may
//      have one CMatl object that describes clear glass, another for a
//      Phong-shaded brass-metal material, another for a texture-map, another
//      for a bump mapped material for the surface of an orange (fruit),
//      another for a marble-like material defined by Perlin noise, etc.
// a COLLECTION of CLight objects that each describe one light source.  
//			That collection is held in the 'lamp[]' array within the CScene class.
//      Note that I apply all lights to all CGeom objects.  You may wish to
//      add an index to the CGeom class to select which lights affect each item.
//
// The default CScene constructor creates a simple scene that will create a
// picture if traced:
// --rayCam with +/- 45 degree Horiz field of view, aimed at the origin from 
// 			world-space location (0,0,5)
// --item[0] is a unit sphere at the origin that uses matter[0] material;
// --matter[0] material is a shiny red Phong-lit material, lit by lamp[0];
// --lamp[0] is a point-light source at location (5,5,5).

//==================== All our globally-applied literals========================

const TITLE    = "CS352 RayTrace Starter";// Display window's title bar:
const WIDTH    = 512;                     // initial window half-width,
const HEIGHT   = 512;                     // initial window height in pixels.
const XPOS     = 0;                     // initial window position
const YPOS     = 256;
const ZNEAR    = 1.0;                     // near, far clipping planes for
const ZFAR     = 5000.0;                  // the OpenGL 3D camera.
//==============================================================================
// SET RAY-TRACER CAPACITY   (fixed-sized arrays)
//
const SHAPES_MAX   = 16;        // max # of shapes in a CScene object
const MATLS_MAX    = 16;        // max # of materials in CScene object
const LIGHTS_MAX   = 8;        // max # of light sources in CScene object.
const HITLIST_MAX  = 2*SHAPES_MAX;
									// max # of ray/object intersection points.
const RAND_MAX     = 10000;
const RAY_EPSILON  = 10E-10;      // 'SUBTLE HACK' offset to ray start points
									// to push them above or below surfaces.


function CScene () {

	this.rayCam = new CCamera(LOOK_AT[0],LOOK_AT[1],LOOK_AT[2],90);	// The ray-tracing camera we'll use;
	this.eyeRay = new CRay();			// Current 'eye' ray we're tracing
												// (ray from camera used to make a pixel)
	this.eyeHits = new CHitList();					// Intersections between eyeRay ray and each
												// CGeom object in the CScene::item[] array,
												// made by calling trace(&eyeRay,eyeHits); - CHitList

	this.items = new Array();	// List of each shape in the scene, held
										// sequentially in array starting at item[0] - CGeom
	this.itemCount;						// item[] list length: # of elements in use.

	this.matter = new Array();	// List of materials objects, sequentially
										// in array starting at matter[0]. - CMatl
	this.matterCount;					// matter[] list length: #of elements in use.

	this.lamp = new Array();	// List of light-source object, sequentially
										// in array starting at lamp[0]. - CLight
	this.lampCount;						// lamp[] list length; # of eleements in use.

	this.bkgndColr = vec4.fromValues(0.0,0.5,0.7,1.0);             	  // default RGBA background color; use this
										// for rays that don't hit any scene shapes. - vec4
	this.errorColr = vec4.fromValues(1.0,0.0,0.0,1.0);						// initial RGBA value for recursive rays.
										// A==opacity; default A = 1 = opaque. - vec4

	this.depthMax = reflDepth;					// Max. allowed recursion depth for rays.
	this.isAA = true;					// isAnti-Aliased. if TRUE, use jittered
										// supersampling over 'tiny square' area of
										// image, and avg the colors found within.
	this.xSuperAA = 5;
	this.ySuperAA = 5;					// # of Anti-Alias supersamples per pixel.

};

//=============================================================================
// Use ray-tracing to render 'scanCount' new scanlines of the 'myPic' image.
CScene.prototype.makeRayTracedImage = function(destPic, scanCount) {

	var ubegin, vbegin, xray, yray;
	var ustep = (this.rayCam.iRight - this.rayCam.iLeft) / destPic.xSiz;
	var vstep = (this.rayCam.iTop   - this.rayCam.iBot)  / destPic.ySiz;

	if(this.isAA == false) { // ***NO*** antialiasing...
		var ubegin = this.rayCam.iLeft + 0.5*ustep;  // start at lower-left corner PLUS
		var vbegin = this.rayCam.iBot + 0.5*vstep;   // a half-tile width, height.
			
		for(var j=0; j< destPic.ySiz; j++) {	// for each row of the image,
			for(var i=0; i<destPic.xSiz; i++) {	// for each column of the image,
				var idx = (j*destPic.xSiz + i)*destPic.pixSiz;		// Array index at pixel (i,j)
				
				var xray = ubegin + i*ustep;    // find ray thru center of
				var yray = vbegin + j*vstep;    // each pixel's 'little square'
				this.rayCam.setEyeRay(this.eyeRay,xray,yray);
				this.trace(this.eyeRay, this.eyeHits, this.depthMax); // trace 'eyeRay' into the
																		// scene, collecting each ray/object
																		// intersection in the 'eyeHits'
																		// object. Find the nearest hit pt,
																		// and find the surface color there.
				destPic.fBuf[idx   ] = this.eyeHits.pierce[this.eyeHits.iNearest].colr[0];
				destPic.fBuf[idx +1] = this.eyeHits.pierce[this.eyeHits.iNearest].colr[1];
				destPic.fBuf[idx +2] = this.eyeHits.pierce[this.eyeHits.iNearest].colr[2];
																		// Put that color in frame-buffer.
			}
		}
	} else {
		// Otherwise, use antialiasing!
		ubegin = this.rayCam.iLeft;  // start at lower-left corner of image;
		vbegin = this.rayCam.iBot;
		// RECALL 'ustep' and 'vstep' are width of the 'little square' for this pixel
		var uustep = ustep / this.xSuperAA;  // the super-sampling tile width within it;
		var vvstep = vstep / this.ySuperAA;  // the super-sampling tile height within it;

		var countAcc = this.xSuperAA * this.ySuperAA; // number of rays per pixel.
		for(var j=0; j< destPic.ySiz; j++) {// for each row of the image,
			for(var i=0; i<destPic.xSiz; i++) {	// For each pixel,
				var idx = (j*destPic.xSiz + i)*destPic.pixSiz;		// Array index at pixel (i,j)
				var colrAcc = vec4.create();         // clear the color accumulator
				
				for(var jj=0; jj<this.ySuperAA; jj++) {			// for each row of tiles in the pixel
					for(var ii=0; ii<this.xSuperAA; ii++) {		// for each column of tiles ...
						// find the corner of the super-sampling 'little tile'
						// within our our pixel's 'little square':
						xray = ubegin + i*ustep + ii*uustep;
						yray = vbegin + j*vstep + jj*uustep;
						// then add jittering: random position within that tile:
						xray += (uustep*Math.random());
						yray += (vvstep*Math.random());
						// create the jittered super-sampling ray;
						this.rayCam.setEyeRay(this.eyeRay, xray,yray);
						this.trace(this.eyeRay, this.eyeHits, this.depthMax);
						// trace 'eyeRay' into the scene & collect results in the
						// 'eyeHit' structure, with enough info for'findSurfColor()'
						// to find the ray's on-screen color.
						vec4.add(colrAcc, colrAcc, this.eyeHits.pierce[this.eyeHits.iNearest].colr);
					}
				}
				// find average color of all this pixel's rays:
				vec4.scale(colrAcc, colrAcc, 1.0/countAcc);	// divide by # of rays,
				destPic.fBuf[idx   ] = colrAcc[0];
				destPic.fBuf[idx +1] = colrAcc[1];
				destPic.fBuf[idx +2] = colrAcc[2];
			}
		}
	}
	destPic.float2int();
};

//=============================================================================
// Trace the ray at pRay through the ENTIRE CScene (all elements of item[] array),
// and each time we find a ray/object inter-section, append it to the list of
// CHit objects in the CHitList at pList.
// Return index of pList hit closest to ray.
CScene.prototype.trace = function(pRay, pList, depth) {

	pList.initList(this.bkgndColr);						// wipe any previous contents.
	for(var i=0; i<this.itemCount; i++) {	// For every item in our scene,
		if(i==1 && pList.isShadowRay==true)
		// if( (pRay.orig[0]-0.0)*(pRay.orig[0]-0.0) + (pRay.orig[1]-0.0)*(pRay.orig[1]-0.0) <1) 
			var a = 1;
		switch(this.items[i].shapeType) {				// trace ray to find all intersections
			case GEOM_GNDPLANE:
				this.items[i].hitGrid(pRay, pList, i);
				break;
			case GEOM_SPHERE:
				this.items[i].hitSphere(pRay, pList, i);
				break;
			case GEOM_BOX:
				this.items[i].hitCube(pRay, pList, i);
				break;
			case GEOM_CYLINDER:
				this.items[i].hitCylinder(pRay, pList, i);
				break;
			case GEOM_CONE:
				this.items[i].hitCone(pRay, pList, i);
				break;
			case GEOM_HALFSPH:
				this.items[i].hitHalfSphere(pRay, pList, i);
				break;
			case GEOM_TRIANGLE:
			case GEOM_BLOBBIES:
			default:
				console.log("CScene::trace() Invalid shapeType!");
			break;
		}

		pList.findNearestHit();			// update iNearest; find the hit-point
																// in the pList->pierce[] array that's closest to the ray start-point.

		if(pList.isShadowRay==true) // Shadow rays don't need color
			return pList.iNearest;

		// Fill in the rest of CHit object so that we're ready to compute color:
		var pHit = pList.pierce[pList.iNearest]; // point to it; then
		// Find world-space hit-point:   hitPt = pRay->orig + pHit->t * pRay->dir
		pHit.hitPt = vec4.scale(vec4.create(), pRay.dir, pHit.t);
		vec4.add(pHit.hitPt, pHit.hitPt, pRay.orig);

		// Shading: find color at hit-point;
		this.findShade(pList, pList.iNearest, depth);
		// may also send shadow, reflection, and transparency rays recursively.
	}
};

//------------------------------------------------------------------------------
// Find the color at the ray hit-point described in pList->pierce[hitNum].
// Use the CGeom's  materials (CMatl), make 'shadow' rays to each valid light source,
// compute Phong lighting, and recursively trace more rays to determine the color
// caused by reflection and transparency;
// 'depth' == recursion depth allowed.
CScene.prototype.findShade = function(pList, hitNum, depth) {
	// var blend;                           // [0.0 - 1.0] weight for solid textures
	var myMatl = new CMatl();                   // describes material at our hit-pt.
	// var xfrac,yfrac,zfrac;               // (for computing solid textures)
	// var xhit,yhit,zhit;

	if(depth < 0) return;               // catch exception
	if(hitNum==0) return;               // pierce[0] is the scene background;
																			// it's color is already set.
	if( hitNum <0 || hitNum >= pList.pierce.length) {
		console.log("!?!? CScene::findShade() 'hitNum' invalid!!\n");
		return;
	}

	var pHit = pList.pierce[hitNum];						// Make ptr to the CHit object we'll use,
	var itemID = pHit.hitItem;									// get ID# for the CGeom item[] that we hit,
	var Astuff = this.items[itemID].matlNum;		// ID# for primary material descriptor, and
	var Bstuff = this.matter[Astuff].matlB_ID;	// secondary material, if any.
	var flags = this.matter[Astuff].matlFlags;	// Each bit enables/disables a material
																							// property: e.g. LSB = phong shading on/off
	pHit.colr = vec4.create();									// initialize our hit-point color to black,
																							// then add in each color component:

	if(flags == BIT_SOLIDTEX) {
		// If surface has solid texture, first find the blend value at hit
		// point, then find each of our Phong materials attributes to use
		// by linear interpolation:  matl = matlA*(blend) + matlB*(1-blend)
		blend = 1.0;       // find blend factor.
		// use the the material descriptor's 'solidID' to select the blending
		// function and evaluate it at the model-space hit-point:
		switch(this.matter[Astuff].solidID) {
			case SOLID_2DGRID:   // 2D grid-plane; xy axis-aligned lines
														// spaced by xgap,ygap in x,y directions,
														// with line-widths of penwidth*(xgap,ygap).
				var xhit = pHit.modelHitPt[0]; // get model-space x,y of
				var yhit = pHit.modelHitPt[1]; // the hit-point.
				// get the fractional part of (xhit/xgap) and (yhit/ygap):
				var xfrac = xhit - Math.floor(xhit / this.matter[Astuff].xgap);
				var yfrac = yhit - Math.floor(yhit / this.matter[Astuff].ygap);
				if( (xfrac < this.matter[Astuff].penwidth) ||
						(yfrac < this.matter[Astuff].penwidth))
				{   // line color== matlB, secondary color.
						var blend = 0.0;
				}
				else 
					var blend = 1.0;   // background color; primary color.
			break;
			case SOLID_CHECKERBOARD: // 3D checkerboard; size xgap,ygap,zgap
					var xhit = pHit.modelHitPt[0]; // get model-space x,y,z of
					var yhit = pHit.modelHitPt[1]; // the hit-point.
					var zhit = pHit.modelHitPt[2];
					// sum the integer parts of(xhit/xgap),(yhit/ygap),(zhit/zgap)
					var tmp = Math.floor(xhit / this.matter[Astuff].xgap) +
										Math.floor(yhit / this.matter[Astuff].ygap) +
								    Math.floor(zhit / this.matter[Astuff].zgap);
					blend = tmp%2;    // odd/even means matlA/matlB.
					break;
			case SOLID_NONE:     // solidID wasn't initialized?!?
			case SOLID_SPHERE_SINE:      // spherical sine-wave.
			case SOLID_CYLINDER_SINE:    // cylindrical sine-wave.
			default:
					console.log("ERROR! CSCene::findShade() non-existent solid texture!");
					break;
		}

		myMatl.lerp(blend, this.matter[Astuff], this.matter[Bstuff]);
	}
	else
	{       // Otherwise, copy our 'primary' Phong materials attributes for use.
		myMatl = this.matter[Astuff];
	}   //-----------------DONE with BIT_SOLIDTEX

	// Do light
	if(flags == BIT_PHONG || flags == BIT_SOLIDTEX)
	{   // Compute Phong lighting contribution, as found in openGL
			// Phong shading:
			// find the world-space surface normal for our selected hit-point,
			this.items[itemID].findNormal(pHit);      // & record it at pHit
			vec4.copy(pHit.colr, myMatl.K_emi);

			var hList = new CHitList();
			for(var i=0; i<this.lampCount; i++) {
				var l = this.lamp[i];
				var amb = vec4.mul(vec4.create(), l.I_a, myMatl.K_amb)
				vec4.add(pHit.colr, pHit.colr, amb);

				// shadow closed
				// hList.initShadow();	// reset a new shadow hitList
				// var rayDir = vec4.sub(vec4.create(), l.pos, pHit.hitPt);
				// if(this.trace(new CRay(pHit.hitPt, rayDir), hList, 1)>0)	// if shadow ray hits a object... no dif and spc color
				// 	return;

				var s = vec4.sub(vec4.create(), l.pos, pHit.hitPt);	// vector from hit point to source
				vec4.normalize(s, s);
				var mDotS = vec4.dot(s, pHit.surfNorm);	// the lambert term
				var dif = vec4.mul(vec4.create(), myMatl.K_dif, vec4.scale(vec4.create(), l.I_d, Math.max(0,mDotS)))
				vec4.add(pHit.colr, pHit.colr, dif);

				var h = vec4.sub(vec4.create(), s, vec4.scale(vec4.create(), pHit.viewN, 0.5));
				vec4.normalize(h,h);
				var mDotH = vec4.dot(h, pHit.surfNorm);
				var spc = vec4.mul(vec4.create(), 
				                   myMatl.K_spec, 
				                   vec4.scale(vec4.create(), l.I_s, Math.pow(Math.max(0,mDotH), myMatl.K_shiny)));
				vec4.add(pHit.colr, pHit.colr, spc);

				if(depth==0) return;

				if(this.matter[Astuff].K_shiny > 80) { // shiny_enough
					var amount = 2*vec4.dot(pHit.viewN, pHit.surfNorm);
					var rayDir = vec4.sub(vec4.create(), 
					                      vec4.scale(vec4.create(), pHit.surfNorm, amount),
					                      pHit.viewN); // dir = -pHit.viewN => r = dir - 2*(dir dot N)N
					hList = new CHitList();
					var dep = depth-1;
					this.trace(new CRay(pHit.hitPt, rayDir), hList, dep);
					vec4.add(pHit.colr, pHit.colr, hList.pierce[hList.iNearest].colr);
				}

			}
	}
	else if(flags == BIT_MIRROR) {
		// Compute mirror-like reflection contribution
	}
	else if(flags == BIT_GLASS) {
		// Compute transparency ray contribution
	}
};

/*    void wipeScene(void);           // delete all shapes,materials,and lights;
									// get ready to make an entirely new scene.
	void createMirrorSphereTrio(double rad); // delete all current shapes, and
									// make a trio of mirror-like spheres around
									// the origin touch and interreflect.

	int createMatl(void);           // find an unused material index;isAlive=true
									// return -1 if no more materials available.
	int createShape(void);          // find an unused shape index; isAlive=true
									// return -1 if no more shapes available.
	int createLight(void);          // find an unused lamp index; isAlive=true
									// return -1 if no more lights available.
	bool destroyMatl(int xmatl);    // At index 'xmatl', set isAlive=false.
									// return false if xmatl doesn't exist.
	bool destroyShape(int xshape);  // At index 'xshape', set isAlive=false.
									// return false if xshape doesn't exist.
	bool destroyLight(int xlamp);   // At index 'xlamp', set isAlive=false.
									// return false if xlamp doesn't exist.
*/

