// allowable values for CGeom.shapeType variable.  Add some of your own!
//------------------------------------------------------------------------------
const GEOM_GNDPLANE = 0;	// An endless 'ground plane' at z=0 with xy lines.
const GEOM_SPHERE   = 1;	// A sphere centered at origin; 'radius' sets size
const GEOM_BOX      = 2;	// Axis-aligned cube at origin; 'radius' half-width
const GEOM_CYLINDER = 3;	// A cylinder centered on x axis with user-settable
													// radius at each end and user-settable length.
													// Make a cone by setting either end's radius to 0;
													// Make a disk by setting zero lengh, equal radius.
const GEOM_TRIANGLE	= 4;	// a triangle with 3 vertices.
const GEOM_BLOBBIES = 5;	// Implicit surface:Blinn-style Gaussian 'blobbies'.
const GEOM_CONE			= 6;
const GEOM_HALFSPH	= 7;

//==============================================================================
// Generic object for a geometric shape.  Each instance describes just one shape,
// but you can select from several different kinds of shapes by setting
// the 'shapeType' member.
// CGeom can describe ANY shape, including sphere, box, cone, quadric, etc. and
// it holds all/any variables needed for each shapeType.
//
// Advanced Version: try it!
//        Ray tracing lets us position and distort these shapes in a new way;
// instead of transforming the shape itself for 'hit' testing against a traced
// ray, we transform the 3D ray by the matrix 'world2model' before the hit-test.
// This matrix simplifies our shape descriptions, because we don't need
// separate parameters for position, orientation, scale, or skew.  For example,
// JT_SPHERE and JT_BOX need NO parameters--they each describe a unit sphere or
// unit cube centered at the origin.  To get a larger, rotated, offset sphere
// or box, just set the parameters in world2model matrix. Note that you can scale
// the box or sphere differently in different directions, forming ellipsoids for
// the unit sphere and rectangles (or prisms) from the unit box.
function CGeom (shapeSelect)
{
	// this.isAlive;						// true/false == use/ignore this shape.

	if(shapeSelect == undefined) 
		shapeSelect = GEOM_GNDPLANE;			// default
	else	
		this.shapeType = shapeSelect;     // set to GEOM_SPHERE, GEOM_BOX, etc.

	this.matlNum;                       // material selector; render with CMatl
																			// object at CScene::matter[matlNum]

	this.worldRay2model;                // 4x4 matrix used to transform
																			// rays from 'world' coord system to
																			// the coord system for this object.
	this.w2mTranspose;                  // TRANSPOSE of worldRay2model matrix,
																			// used by CShape::findShade() function
																			// to find world-space surface normal.

	this.vertices;


	// for GEOM_SPHERE, GEOM_BOX:
	// !NO! parameters needed: a sphere with radius 1.0 centered at origin
	// !NO! parameters needed: axis-aligned box centered at origin +/-1.0

	// Ground-plane 'Line-grid' parameters:
	this.zGrid = -5.0;	// create line-grid on the unbounded plane at z=zGrid
	this.xgap = 1.0;	// line-to-line spacing
	this.ygap = 1.0;
	this.lineWidth = 0.4;	// fraction of xgap used for grid-line width
	this.lineColor = vec4.fromValues(0.1,0.1,0.1,1.0);	// RGBA green(A== opacity)
	this.gapColor  = vec4.fromValues(0.9,0.9,0.9,1.0);	// near-white

	this.rayLoadIdentity();
}

//==============================================================================
// Find intersection of CRay object 'inRay' with the grid-plane at z== this.zGrid
// return -1 if ray MISSES the plane
// return  0 if ray hits BETWEEN lines
// return  1 if ray hits ON the lines
// HOW?!?
// 1) we parameterize the ray by 't', so that we can find any point on the
// ray by:
//          Ray(t) = ray.orig + t*ray.dir
// To find where the ray hit the plane, solve for t where R(t) = x,y,zGrid:
//          Ray(t0) = zGrid = ray.orig[2] + t0*ray.dir[2];
//  solve for t0:   t0 = (zGrid - ray.orig[2]) / ray.dir[2]
//  then find x,y value along ray for value t0:
//  hitPoint = ray.orig + t0*ray.dir
//  BUT if t0 <0, we can only hit the plane at points BEHIND our camera;
//  thus the ray going FORWARD through the camera MISSED the plane!.
//
// 2) Our grid-plane exists for all x,y, at the value z=zGrid.
//      location x,y, zGrid is ON the lines on the plane if
//          (x/xgap) has fractional part < linewidth  *OR*
//          (y/ygap) has fractional part < linewidth.
//      otherwise ray hit BETWEEN the lines.
// 
//==============================================================================
// Find intersections of ray at pRay with this one CGeom object, & append
// the hit-point record to pList's end, at pList->pierce[pList->iEnd].
// iThis==index# for this CGeom object.
CGeom.prototype.hitGrid = function(pRay, pList, iThis) {

	var xhit,yhit;         // the x,y position where ray hits the plane - pHit
	var t0;                // ray length where pRay hits the plane:
	var xfrac,yfrac;       // fractional part of x/xgap, y/ygap;

	t0 = (this.zGrid - pRay.orig[2]) / pRay.dir[2];
	if(t0 <= 0.0) {
		// console.log('ray MISSED plane!?!? (HOW?!) ');
		// pRay.printMe();
		return -1;  	// the ray doesn't hit our plane
	}

	// YES! we hit the grid, so record the hit point:
	var pHit = new CHit();
	pHit.t = t0;
	pHit.hitItem = iThis;  // record the item# of the object we hit.
	pHit.isEntering = true;    // (grid-plane has no 'interior'; can't exit.
	if(pList.isShadowRay == false) {			// If we care about hit-point color, then
		// find direction from hit-point back to ray's source
		pHit.viewN = vec4.scale(vec4.create(), pRay.dir, -1.0); // (reverse ray direction)
		// find model-space intersection:
		//      ( for procedural textures such a grid-plane )
		// pHit.modelHitPt.scale(pRay.dir, pHit.t); // (tdir*hit.t)
		pHit.modelHitPt = vec4.scale(vec4.create(), pRay.dir, pHit.t);
		// pHit.modelHitPt.add(pHit.modelHitPt, pRay.orig);// torg + (tdir*hit.t)
		vec4.add(pHit.modelHitPt, pHit.modelHitPt, pRay.orig);
	}
	pList.pierce.push(pHit);
};

CGeom.prototype.hitSphere = function(pRay, pList, iThis) {

	// if(pRay.orig[0]-0.0<0.01 && pRay.orig[1]-0.0<0.01 && pList.isShadowRay==true)
	if( (pRay.orig[0]-0.0)*(pRay.orig[0]-0.0) + (pRay.orig[1]-0.0)*(pRay.orig[1]-0.0) <1) 
		if (pList.isShadowRay==true)
			var a = 1;

	// var 
	var cOri = vec4.transformMat4(vec4.create(), pRay.orig, this.worldRay2model);	// cOri == transformed origin
	var cDir = vec4.transformMat4(vec4.create(), pRay.dir,  this.worldRay2model);	// cDir == transformed direction

	var r2s = vec4.create();
	// vec4.sub(r2s, [0,0,0,1], cOri);	// set cOri to vector starting from sphere center
	vec4.sub(r2s, cOri, [0,0,0,1]);	// set cOri to vector starting from sphere center

	// sphere equation s(P) = x^2 + y^2 + z^2 - 1 = |P|^2 - 1
	// apply ray equation to P to find the hit point (in cmaear coords): |cOri + cDir*t|^2 - 1 = 0
	// In quadratic quation form: |D|^2*t^2 + 2* DdotO + (|O|^2 -1) = 0
	var a = vec4.dot(cDir, cDir);
	var b = vec4.dot(r2s, cDir);
	var c = vec4.dot(r2s, r2s) - 1;	// actually the distance from cOri to sphere boundary
	var discriminant = b * b - a * c;

	if (discriminant < 0) // no hit
		return;

	if (c > 0) {	// the ray begins OUTSIDE the sphere
		
		// Still here? then LM2 must be <= 1.0; the ray hits the sphere at 2 points.
		if(pList.isShadowRay == true) { // if we don't care about WHERE we hit,
			var pHit = new CHit();
			pHit.hitItem = iThis;
			pList.pierce.push(pHit);
			return;             // done! we know we're in shadow; that's enough
		}

		// Record the first hit point:
		var t1 = (-b - Math.sqrt(discriminant)) / a;
		if (t1>0.0001) {
			var pHit = new CHit();
			pHit.t = t1;
			// ray begins OUTSIDE the sphere, so at larger t we LEAVE the sphere
			pHit.isEntering = true;
			// record basics for finding color at this hit-point:
			vec4.negate(pHit.viewN, pRay.dir); // (reverse ray direction)
			// find model-space intersection:( for solid textures e.g. checkerboard)
			vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
			pHit.hitItem = iThis;         // record the item# of the object we hit.
			pList.pierce.push(pHit);			// append the hit-point to the list.
		}

		// Record the second hit point:
		var t2 = (-b + Math.sqrt(discriminant)) / a;
		if (t2>0.0001) {
			pHit = new CHit();
			pHit.t = t2;
			// ray begins OUTSIDE the sphere, so at larger t we LEAVE the sphere
			pHit.isEntering = false;
			// record basics for finding color at this hit-point:
			vec4.negate(pHit.viewN, pRay.dir); // (reverse ray direction)
			// find model-space intersection:( for solid textures e.g. checkerboard)
			vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
			pHit.hitItem = iThis;         // record the item# of the object we hit.
			pList.pierce.push(pHit);			// append the hit-point to the list.
		}
	} else {   // the ray begins INSIDE the sphere

		if(c < -1.0) { // dot product of itself < 0 --> impossible
				console.log("!?!? CGeom::hitSphere() IMPOSSIBLE WEIRDNESS!!");
				console.log("ray inside sphere doesn't pierce its surface ?!?");
				return;
		}

		var pHit = new CHit();
		//  Record the hit point whose t > 0:
		pHit.t = (-b + Math.sqrt(discriminant)) / a;
		// ray begins OUTSIDE the sphere, so at larger t we LEAVE the sphere
		pHit.isEntering = false;
		// record basics for finding color at this hit-point:
		vec4.negate(pHit.viewN, pRay.dir); // (reverse ray direction)
		// find model-space intersection:( for solid textures e.g. checkerboard)
		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.hitItem = iThis;         // record the item# of the object we hit.
		pList.pierce.push(pHit);			// append the hit-point to the list.
	}
};

CGeom.prototype.hitCube = function(pRay, pList, iThis) {

	// var 
	var tHit, numer, denom;
	var tIn = -1000000, tOut = 1000000;
	var inSurf, outSurf;
	var cOri = vec4.transformMat4(vec4.create(), pRay.orig, this.worldRay2model);	// cOri == transformed origin
	var cDir = vec4.transformMat4(vec4.create(), pRay.dir,  this.worldRay2model);	// cDir == transformed direction

	for (var i=0; i<6; i++) {
		switch(i) {
			case 0:
				numer = 1.0 - cOri[1]; denom =  cDir[1]; break;
			case 1:
				numer = 1.0 + cOri[1]; denom = -cDir[1]; break;
			case 2:
				numer = 1.0 - cOri[0]; denom =  cDir[0]; break;
			case 3:
				numer = 1.0 + cOri[0]; denom = -cDir[0]; break;
			case 4:
				numer = 1.0 - cOri[2]; denom =  cDir[2]; break;
			case 5:
				numer = 1.0 + cOri[2]; denom = -cDir[2]; break;
		}

		if(Math.abs(denom)<0.00001) { // ray is parallel
			if(numer<0) return -1;	// ray is out
		} else {	// not parallel
			tHit = numer / denom;
			if (denom>0) {
				if(tHit< tOut) {	// a new earlier exit
					tOut = tHit;
					outSurf = i;
				}
			} else {	// denom is negative: entering
				if(tHit> tIn) {	// a later enterance
					tIn = 	tHit;
					inSurf = i;
				}
			}
		}
		if(tIn>=tOut) return -1;	// it's a miss, early out.
	}

	var num = 0;
	if (tIn>0.00001) {
		var pHit = new CHit();
		pHit.t = tIn;
		// ray begins OUTSIDE the sphere, so at larger t we LEAVE the sphere
		pHit.isEntering = true;
		// record basics for finding color at this hit-point:
		vec4.negate(pHit.viewN, pRay.dir); // (reverse ray direction)
		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.hitItem = iThis;         // record the item# of the object we hit.
		pHit.surfNorm = vec4.clone(cubeNormal(inSurf));
		pList.pierce.push(pHit);			// append the hit-point to the list.
		num++;
	}

	if (tOut>0.00001) {
		pHit = new CHit();
		pHit.t = tOut;
		// ray begins OUTSIDE the sphere, so at larger t we LEAVE the sphere
		pHit.isEntering = false;
		// record basics for finding color at this hit-point:
		vec4.negate(pHit.viewN, pRay.dir); // (reverse ray direction)
		// find model-space intersection:( for solid textures e.g. checkerboard)
		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.hitItem = iThis;         // record the item# of the object we hit.
		pHit.surfNorm = vec4.clone(cubeNormal(outSurf));
		pList.pierce.push(pHit);			// append the hit-point to the list.
		num++;
	}

	function cubeNormal(idx) {
		switch(idx) {
			case 0:
				return [ 0.0, 1.0, 0.0, 0.0];
			case 1:
				return [ 0.0,-1.0, 0.0, 0.0];
			case 2:
				return [ 1.0, 0.0, 0.0, 0.0];
			case 3:
				return [-1.0, 0.0, 0.0, 0.0];
			case 4:
				return [ 0.0, 0.0, 1.0, 0.0];
			case 5:
				return [ 0.0, 0.0,-1.0, 0.0];
			default:
				console.log("CGeom::hitCube find cube normal impossible!?");
				return [ 0.0, 0.0, 0.0, 0.0];
		}
	}

	return (num>0);
};

CGeom.prototype.hitCylinder = function(pRay, pList, iThis) {

	var cOri = vec4.transformMat4(vec4.create(), pRay.orig, this.worldRay2model);	// cOri == transformed origin
	var cDir = vec4.transformMat4(vec4.create(), pRay.dir,  this.worldRay2model);	// cDir == transformed direction

	var hList = new Array();
	var pHit;
	var smallRad = 1.0;
	var sm = smallRad - 1;
	var fDir = sm * cDir[2];
	var fStart = sm * cOri[2] + 1;

	var r2s = vec4.create();
	vec4.sub(r2s, cOri, [0,0,0,1]);	// set cOri to vector starting from sphere center

	var a = cDir[0]*cDir[0] + cDir[1]*cDir[1] - fDir*fDir;
	var b = cOri[0]*cDir[0] + cOri[1]*cDir[1] - fStart*fDir;
	var c = cOri[0]*cOri[0] + cOri[1]*cOri[1] - fStart*fStart;	// actually the distance from cOri to sphere boundary
	var discriminant = b * b - a * c;

	if (discriminant > 0) {

		// Record the first hit point:
		var t1 = (-b - Math.sqrt(discriminant)) / a;
		var zHit = cOri[2] + cDir[2] * t1; // zComponent of ray
		if (t1>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t1,0]);	// hit on the wall

		// Record the second hit point:
		var t2 = (-b + Math.sqrt(discriminant)) / a;
		zHit = cOri[2] + cDir[2] * t2; // zComponent of ray
		if (t2>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t2,0]);	// hit on the wall
	}

	// test the base is at z=0
	var tb = -cOri[2]/cDir[2];	// hit time at z = 0 plane
	if (tb>0.00001 && Math.pow((cOri[0] + cDir[0] * tb), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tb), 2) < 1) {	// within disc of base
		hList.push([tb,1]);	// hit on the base
	}

	// test the cap is at z=1
	var tc = (1 - cOri[2])/cDir[2];	// hit time at z = 1 plane
	if (tc>0.00001 && Math.pow((cOri[0] + cDir[0] * tc), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tc), 2) < Math.pow(smallRad, 2)) {	// within disc of base
		hList.push([tc,2]);	// hit on the cap
	}

	if(hList.length==0)
		return;

	if(hList.length==1) {	// eye inside cylinder - only have existing hit
		hList[0].push(false);
	} else {	// have two hits - first must be entering - sort the two hits
		if (hList[0][0] > hList[1][0]) {	// have larger hitTime - must reverse them
			var tmp = hList[0];
			hList[0] = hList[1];
			hList[1] = tmp;
		}
		hList[0].push(true);
		hList[1].push(false);
	}

	for (var i = 0; i<hList.length; i++) {
		pHit = new CHit();
		pHit.t = hList[i][0];

		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.isEntering = hList[i][2];
		vec4.negate(pHit.viewN, pRay.dir);
		pHit.hitItem = iThis;

		if(hList[i][1] == 0) // wall
			pHit.surfNorm = vec4.fromValues(pHit.modelHitPt[0], pHit.modelHitPt[1], -sm*(1+sm*pHit.modelHitPt[2]), 0.0);
		else if(hList[i][1] == 1) // base
			pHit.surfNorm = vec4.fromValues(0.0, 0.0, -1.0, 0.0);
		else // cap
			pHit.surfNorm = vec4.fromValues(0.0, 0.0,  1.0, 0.0);

		pList.pierce.push(pHit);
	}
};

CGeom.prototype.hitCone = function(pRay, pList, iThis) {

	var cOri = vec4.transformMat4(vec4.create(), pRay.orig, this.worldRay2model);	// cOri == transformed origin
	var cDir = vec4.transformMat4(vec4.create(), pRay.dir,  this.worldRay2model);	// cDir == transformed direction

	var hList = new Array();
	var pHit;
	var smallRad = 0.0;
	var sm = smallRad - 1;
	var fDir = sm * cDir[2];
	var fStart = sm * cOri[2] + 1;

	var r2s = vec4.create();
	vec4.sub(r2s, cOri, [0,0,0,1]);	// set cOri to vector starting from sphere center

	var a = cDir[0]*cDir[0] + cDir[1]*cDir[1] - fDir*fDir;
	var b = cOri[0]*cDir[0] + cOri[1]*cDir[1] - fStart*fDir;
	var c = cOri[0]*cOri[0] + cOri[1]*cOri[1] - fStart*fStart;	// actually the distance from cOri to sphere boundary
	var discriminant = b * b - a * c;

	if (discriminant > 0) {

		// Record the first hit point:
		var t1 = (-b - Math.sqrt(discriminant)) / a;
		var zHit = cOri[2] + cDir[2] * t1; // zComponent of ray
		if (t1>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t1,0]);	// hit on the wall

		// Record the second hit point:
		var t2 = (-b + Math.sqrt(discriminant)) / a;
		zHit = cOri[2] + cDir[2] * t2; // zComponent of ray
		if (t2>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t2,0]);	// hit on the wall
	}

	// test the base is at z=0
	var tb = -cOri[2]/cDir[2];	// hit time at z = 0 plane
	if (tb>0.00001 && Math.pow((cOri[0] + cDir[0] * tb), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tb), 2) < 1) {	// within disc of base
		hList.push([tb,1]);	// hit on the base
	}

	// test the cap is at z=1
	var tc = (1 - cOri[2])/cDir[2];	// hit time at z = 1 plane
	if (tc>0.00001 && Math.pow((cOri[0] + cDir[0] * tc), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tc), 2) < Math.pow(smallRad, 2)) {	// within disc of base
		hList.push([tc,2]);	// hit on the cap
	}

	if(hList.length==0)
		return;

	if(hList.length==1) {	// eye inside cylinder - only have existing hit
		hList[0].push(false);
	} else {	// have two hits - first must be entering - sort the two hits
		if (hList[0][0] > hList[1][0]) {	// have larger hitTime - must reverse them
			var tmp = hList[0];
			hList[0] = hList[1];
			hList[1] = tmp;
		}
		hList[0].push(true);
		hList[1].push(false);
	}

	for (var i = 0; i<hList.length; i++) {
		pHit = new CHit();
		pHit.t = hList[i][0];

		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.isEntering = hList[i][2];
		vec4.negate(pHit.viewN, pRay.dir);
		pHit.hitItem = iThis;

		if(hList[i][1] == 0) // wall
			pHit.surfNorm = vec4.fromValues(pHit.modelHitPt[0], pHit.modelHitPt[1], -sm*(1+sm*pHit.modelHitPt[2]), 0.0);
		else if(hList[i][1] == 1) // base
			pHit.surfNorm = vec4.fromValues(0.0, 0.0, -1.0, 0.0);
		else // cap
			pHit.surfNorm = vec4.fromValues(0.0, 0.0,  1.0, 0.0);

		pList.pierce.push(pHit);
	}
};

CGeom.prototype.hitHalfSphere = function(pRay, pList, iThis) {

	var cOri = vec4.transformMat4(vec4.create(), pRay.orig, this.worldRay2model);	// cOri == transformed origin
	var cDir = vec4.transformMat4(vec4.create(), pRay.dir,  this.worldRay2model);	// cDir == transformed direction

	var hList = new Array();
	var pHit;
	var smallRad = 0.0;
	var sm = smallRad - 1;
	var fDir = sm * cDir[2];
	var fStart = sm * cOri[2] + 1;

	var r2s = vec4.create();
	vec4.sub(r2s, cOri, [0,0,0,1]);	// set cOri to vector starting from sphere center

	var a = vec4.dot(cDir, cDir);
	var b = vec4.dot(r2s, cDir);
	var c = vec4.dot(r2s, r2s) - 1;
	var discriminant = b * b - a * c;

	if (discriminant > 0) {

		// Record the first hit point:
		var t1 = (-b - Math.sqrt(discriminant)) / a;
		var zHit = cOri[2] + cDir[2] * t1; // zComponent of ray
		if (t1>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t1,0]);	// hit on the wall

		// Record the second hit point:
		var t2 = (-b + Math.sqrt(discriminant)) / a;
		zHit = cOri[2] + cDir[2] * t2; // zComponent of ray
		if (t2>0.00001 && zHit >= 0.0 && zHit <= 1.0)
			hList.push([t2,0]);	// hit on the wall
	}

	// test the base is at z=0
	var tb = -cOri[2]/cDir[2];	// hit time at z = 0 plane
	if (tb>0.00001 && Math.pow((cOri[0] + cDir[0] * tb), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tb), 2) < 1) {	// within disc of base
		hList.push([tb,1]);	// hit on the base
	}

	// test the cap is at z=1
	var tc = (1 - cOri[2])/cDir[2];	// hit time at z = 1 plane
	if (tc>0.00001 && Math.pow((cOri[0] + cDir[0] * tc), 2) + 
	                  Math.pow((cOri[1] + cDir[1] * tc), 2) < Math.pow(smallRad, 2)) {	// within disc of base
		hList.push([tc,2]);	// hit on the cap
	}

	if(hList.length==0)
		return;

	if(hList.length==1) {	// eye inside cylinder - only have existing hit
		hList[0].push(false);
	} else {	// have two hits - first must be entering - sort the two hits
		if (hList[0][0] > hList[1][0]) {	// have larger hitTime - must reverse them
			var tmp = hList[0];
			hList[0] = hList[1];
			hList[1] = tmp;
		}
		hList[0].push(true);
		hList[1].push(false);
	}

	for (var i = 0; i<hList.length; i++) {
		pHit = new CHit();
		pHit.t = hList[i][0];

		vec4.scaleAndAdd(pHit.modelHitPt, cOri, cDir, pHit.t);	// cOri + (cDir*hit.t)
		pHit.isEntering = hList[i][2];
		vec4.negate(pHit.viewN, pRay.dir);
		pHit.hitItem = iThis;

		if(hList[i][1] == 0) // wall
			pHit.surfNorm = vec4.fromValues(pHit.modelHitPt[0], pHit.modelHitPt[1], -sm*(1+sm*pHit.modelHitPt[2]), 0.0);
		else if(hList[i][1] == 1) // base
			pHit.surfNorm = vec4.fromValues(0.0, 0.0, -1.0, 0.0);
		else // cap
			pHit.surfNorm = vec4.fromValues(0.0, 0.0,  1.0, 0.0);

		pList.pierce.push(pHit);
	}
};

//==============================================================================
// find the world-space surface normal for the ray/object intersection 
// described in the CHit object at pHitObj.
CGeom.prototype.findNormal = function(pHitObj) {
	switch(this.shapeType)
	{
			case GEOM_GNDPLANE: 	// An endless 'ground plane' at z=0 with xy lines.
														// gridplane is in model-space xy plane with
				pHitObj.surfNorm = vec4.fromValues(0.0, 0.0, 1.0, 0.0); // model-space normal: +z
														// transform normal vector to world-space coords:
				vec4.transformMat4(pHitObj.surfNorm, pHitObj.surfNorm, this.worldRay2model);
				vec4.normalize(pHitObj.surfNorm,pHitObj.surfNorm);      // make it unit-length
				break;
			case GEOM_SPHERE:     // A sphere centered at origin; 'radius' sets size
														// model-space surface normal = sphereCenter -hitPt:
				// pHitObj.surfNorm = vec4.sub(vec4.create(),[0,0,0,1], pHitObj.hitPt);	// = (0,0,0,1)-hitPt
				// vec4.transformMat4(pHitObj.surfNorm, pHitObj.surfNorm, this.w2mTranspose);
				pHitObj.surfNorm = vec4.copy(vec4.create(), pHitObj.hitPt);
				vec4.transformMat4(pHitObj.surfNorm, pHitObj.surfNorm, this.worldRay2model);
				pHitObj.surfNorm[3] = 0.0;
				vec4.normalize(pHitObj.surfNorm,pHitObj.surfNorm);      // make it unit-length
				break;
			case GEOM_CYLINDER:   // A cylinder centered on x axis with user-settable
														// radius at each end and user-settable length.
			case GEOM_BOX:        // Axis-aligned cube at origin; 'radius' half-width
			case GEOM_CONE:
			case GEOM_HALFSPH:
				break;
			case GEOM_TRIANGLE:   // a triangle with 3 vertices.
			case GEOM_BLOBBIES:   // Implicit surface:Blinn-style Gaussian 'blobbies'.
			default:
				console.log("CGeom::findNormal(): unknown shape type");
				break;
	}
};


//========================== TRANSFORMATIONS ==========================
// Mimic the openGL API for transforming this object;
// CAREFUL! these calls modify our worldRay2model matrix (not GL_MODELVIEW)
//  for use in transforming rays from world coords to model coords.
//  Accordingly, the construct the INVERSE of the matrix made by their
//  openGL counterparts, and apply them by POST-multiplying the current
//  contents of worldRay2model, rather than pre-multiplying as openGL does.

// clear current contents; set to I matrix
CGeom.prototype.rayLoadIdentity = function() {
	this.worldRay2model = new mat4.create();     // clear out the matrix
	this.w2mTranspose = new mat4.create();       // and its transpose.
};


// translate the object's coord sys by tx,ty,tz
CGeom.prototype.rayTranslate3d = function(tx, ty, tz) {

	var mtran = mat4.create();
	mtran[12] = -tx;    // build translation matrix,
	mtran[13] = -ty;
	mtran[14] = -tz;    // post-multiply current contents

	//worldRay2model.prnt();
	//cout << "rayTranslate3d: tx,ty,tz= " << tx << "," << ty << "," << tz << "\n" << endl;

	mat4.mul(this.worldRay2model, mtran, this.worldRay2model);	// POST-multiply.
	mat4.copy(this.w2mTranspose, this.worldRay2model);				// update our transpose matrix.
	mat4.transpose(this.w2mTranspose, this.w2mTranspose);
};

// Rotate the object's coord system by deg around the vector axis (x,y,z)
// Not working.........
CGeom.prototype.rayRotate3d = function(deg, x, y, z) {
	var c,s;       // cosine, sine of -deg;
	var len2;       // squared length of x,y,z vector.

	// is (x,y,z) a unit-length vector?
	len2 = x*x + y*y + z*z;
	if(len2 != 1.0) {
		if(len2 < RAY_EPSILON)
			return;     // do nothing!
		len2 = Math.sqrt(len2);      // find actual vector length, then
		x = x/len2;             // normalize the vector.
		y = y/len2;
		z = z/len2;
	}

	c = Math.cos(-deg*Math.PI / 180.0);    // find cosine(-deg) in degrees
	s = Math.sin(-deg*Math.PI / 180.0);    // find sine (-deg) in degrees
	// using -deg instead of deg will create an inverse-rotation matrix, so
	// the rest is the same matrix transform used in openGL
	//  http://www.talisman.org/opengl-1.1/Reference/glRotate.html
	var mrot = mat4.create();       // start clean
	mrot[0] = x*x*(1.0 - c) + c;
	mrot[4] = y*x*(1.0 - c) + z*s;
	mrot[8] = z*x*(1.0 - c) - y*s;

	mrot[1] = x*y*(1.0 - c) - z*s;
	mrot[5] = y*y*(1.0 - c) + c;
	mrot[9] = z*y*(1.0 - c) + x*s;

	mrot[2] = x*z*(1.0 - c) + y*s;
	mrot[6] = y*z*(1.0 - c) - x*s;
	mrot[10] = z*z*(1.0 - c) + c;

	// mrot[ 0] = x*x*(1.0 - c) + c;
	// mrot[ 1] = y*x*(1.0 - c) + z*s;
	// mrot[ 2] = z*x*(1.0 - c) - y*s;
	// // mrot[ 3] = 0;

	// mrot[ 4] = x*y*(1.0 - c) - z*s;
	// mrot[ 5] = y*y*(1.0 - c) + c;
	// mrot[ 6] = z*y*(1.0 - c) + x*s;
	// // mrot[ 7] = 0;

	// mrot[ 8] = x*z*(1.0 - c) + y*s;
	// mrot[ 9] = y*z*(1.0 - c) - x*s;
	// mrot[10] = z*z*(1.0 - c) + c;
	// // mrot[11] = 0;

	// mrot[12] = 0;
	// mrot[13] = 0;
	// mrot[14] = 0;
	// mrot[15] = 1;


	console.log("=========================rotate============================")
	console.log("rayRotate3d: " + deg + "degrees, " + x + "," + y + "," + z + " axis");
	console.log(mat4.str(this.worldRay2model));

	// mat4.rotateY(this.worldRay2model, this.worldRay2model, -deg*Math.PI / 180.0);

	mat4.mul(this.worldRay2model, mrot, this.worldRay2model);	// POST-multiply.
	mat4.copy(this.w2mTranspose, this.worldRay2model);				// update our transpose matrix.
	mat4.transpose(this.w2mTranspose, this.w2mTranspose);
	
	console.log(mat4.str(this.worldRay2model));
};

// Scale the object's coord sx,sy,sz.
CGeom.prototype.rayScale3d = function(sx, sy, sz) {

	var mscl = mat4.create();     // construct inverse scaling matrix
	mscl[0]  = 1.0 / sx;
	mscl[5]  = 1.0 / sy;
	mscl[10] = 1.0 / sz;

	mat4.mul(this.worldRay2model, mscl, this.worldRay2model);	// POST-multiply.
	mat4.copy(this.w2mTranspose, this.worldRay2model);				// update our transpose matrix.
	mat4.transpose(this.w2mTranspose, this.w2mTranspose);

};

//	bool exists(void){return isAlive;}; // report the value of isAlive.
//	void create(void){isAlive=true;};   // shape exists/doesn't exist.
//	void destroy(void){isAlive=false;};
// You do the rest...


