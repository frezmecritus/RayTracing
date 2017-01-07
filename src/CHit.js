//==============================================================================
// Describes one ray/object intersection point that was found by 'tracing' one
// ray through one shape (through a single CGeom object, held in the
// CScene.item[] array).
// CAREFUL! We don't use isolated CHit objects, but instead gather all the CHit
// objects for one ray in one list held inside a CHitList object.
// (CHit, CHitList classes are consistent with the 'HitInfo' and 'Intersection'
// classes described in FS Hill, pg 746).
function CHit() {

	this.hitItem = -1;							// Index# of the CGeom object we pierced;
																	//  (use this in the CScene item[] array).
																	// Set to -1 if 'empty' or 'invalid'. 
																	// NOTE: CGeom objects describe their materials
																	// and coloring (e.g. CMatl) by an index into
																	// the CScene.matter[] array.
	this.t;													// 'hit time' parameter for the ray; defines one
																	// 'hit-point' along ray:  orig + t*dir = hitPt.
	this.hitPt = vec4.create();			// World-space location where the ray pierced
																	// the surface of a CGeom item.
	this.surfNorm = vec4.create();	// World-space surface-normal vector at the hit
																	// point: perpendicular to surface.
	this.viewN = vec4.create();			// Unit-length vector from hitPt back towards
																	// the origin of the ray we traced.
	this.isEntering;								// true iff ray origin was OUTSIDE the hitItem.
																	// (example; transparency rays begin INSIDE).
	this.modelHitPt = vec4.create();// the 'hit point' expressed in model coords.
	// *WHY* have modelHitPt? to evaluate procedural textures & materials.
	//      Remember, we define each CGeom objects as simply as possible in its
	// own 'model' coordinate system (e.g. fixed, unit size, axis-aligned, and
	// centered at origin) and each one uses its own worldRay2Model matrix
	// to customize them in world space.  We use that matrix to translate,
	// rotate, scale or otherwise transform the object in world space.
	// This means we must TRANSFORM rays from the camera's 'world' coord. sys.
	// to 'model' coord sys. before we trace the ray.  We find the ray's
	// collision length 't' in model space, but we can use it on the world-
	// space rays to find world-space hit-point as well.
	//      However, some materials and shading methods work best in model
	// coordinates too; for example, if we evaluate procedural textures
	// (grid-planes, checkerboards, 3D woodgrain textures) in the 'model'
	// instead of the 'world' coord system, they'll stay 'glued' to the CGeom
	// object as we move it around in world-space (by changing worldRay2Model
	//  matrix), and will not change if we 'squeeze' a model by scaling it.
	this.colr;                  // The final RGB color computed for this point,
								// (note-- not used for shadow rays).
								// (uses RGBA. A==opacity, default A=1=opaque.
//   this.depth;                  // recursion depth.
}

//==============================================================================
// Holds all the ray/object intersection results from tracing a single ray(CRay)
// through all objects (CGeom) in our scene (CScene).  ALWAYS holds at least
// one valid CHit 'hit-point', as we initialize pierce[0] to the CScene's
// background color.  Otherwise, each CHit element in the 'pierce[]' array
// describes one point on the ray where it enters or leaves a CGeom object.
// (each point is in front of the ray, not behind it; t>0).
//  -- 'iEnd' index selects the next available CHit object at the end of
//      our current list in the pierce[] array. if iEnd=0, the list is empty.
//      CAREFUL! *YOU* must prevent buffer overflow! Keep iEnd<= JT_HITLIST_MAX!
//  -- 'iNearest' index selects the CHit object nearest the ray's origin point.
function CHitList() {

	this.pierce = new Array();           	// array of ray/object intersection pts.
	//this.seq = new Array()...;         	// sorted array of indices for pierce[]
																				// for nearest-to-farthest ordering.

	this.iNearest;              // index of the CHit object in pierce[] array that
															// describes the ray's closest hit-point.
	this.isShadowRay = false;   // true? the ray whose hits we record was used 
															// ONLY to test for occlusion; no need to gather
															// color info.

	//void sortHits(void);			// fill the 'seq[]' array with indices for the
															// 'pierce[]' array that put them in nearest-
															// to-farthest order (e.g. seq[0]==iNearest).
}

CHitList.prototype.initList = function(bkColr) {
	this.iNearest = 0;
	this.pierce = new Array();
	this.pierce.push(new CHit());
	this.pierce[0].colr = bkColr;
	this.pierce[0].hitPt = vec4.fromValues(ZFAR, ZFAR, ZFAR, 1.0);// openGL's farthest pt.
	this.pierce[0].isEntering = true;
	this.pierce[0].t = ZFAR;
};

CHitList.prototype.findNearestHit = function() {

	switch(this.pierce.length) {
		case 0: // empty CHitList -- ?!?! ERROR!
			console.log("!?!? -- CHitList::findNearest() for zero-length hit list!");
			break;
		case 1:
			this.iNearest = 0;   // Only one hitpoint? it must be the nearest one!
			break;
		case 2:
			this.iNearest = 1;   // Two hitpoints? pierce[0] is the backgnd, so...
			break;
		case 3:             // Only 2 non-background hitpoints; choose!
			if(this.pierce[1].t < this.pierce[2].t)
				this.iNearest = 1; 
			else this.iNearest = 2;
			break;
		default:
			this.iNearest = 1;   // start with first non-background hitpoint, and
			for(var i=2; i<this.pierce.length; i++)  { // compare with all the rest:
				if(this.pierce[i].t < this.pierce[this.iNearest].t) this.iNearest = i;
			}
			break;
		}
};

//------------------------------------------------------------------------------
// Initialize this hit-list to find shadow rays: we test only for light-source
// occlusion, so we don't care WHAT or WHERE the ray hit something, only
// whether any object at all blocked our path to this particular light source.
// in 'trace()', we'll stop on the first item we hit...
CHitList.prototype.initShadow = function() {
		// this.iNearest = 0;
		// this.pierce = new Array();
		// this.pierce.push(new CHit());
		// this.pierce[0].hitItem = -1; // no hit item at all.
		this.isShadowRay = true;
		// this.pierce[0].t = -1.0;
};




