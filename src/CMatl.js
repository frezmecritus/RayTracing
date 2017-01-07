// Shading attributes held in CMatl::matlFlags variable; we can enable/disable
// any desired combination of these bits by bitwise-OR of desired attributes.
// For example, for a phong-lit material with transparency and Perlin noise:
//          matlFlags = 0; // clear all bits
//          matlFlags = BIT_PHONG | BIT_GLASS | BIT_SOLIDTEX
//  Add some of your own!
// (Assumes 'signed int' has 15 easy-to-set bits; don't mess with the sign bit).

const BIT_PHONG     = 1;    // Simple Phong-lit material, like openGL.
const BIT_MIRROR    = 2;   // mirror-like; recursive ray-tracing lets us
								// see reflections of other objects in scene.
const BIT_GLASS     = 4;    // transparency: recursive ray-tracing lets us
								// see refracted versions of other CGeom shapes
								// THROUGH this CGeom's shape;
								// (spheres act as lenses!)
const BIT_SOLIDTEX  = 8;   // Use surface hit-point in a 3D solid-texture
								// 'blend' factor 'b': f(x,y,z)= b; 0 <= b <=1;
								// use 'b' to find a weighted sum between 2
								// materials specified for this object.
const BIT_PERLIN    = 16;    // Use Perlin Noise to randomly perturn various
								// materials properties.
const BIT_IMGTEXMAP = 32;    // Texture map(s) sets each reflectance value
								// as a function of two params (t_x, t_y).
const BIT_IMGBUMP   = 64;    // Texture map(s) modify CGeom's surface
								// normal directions as function of (t_x,t_y)

const BIT_NDEF8     = 128;           // Not yet defined.
// const BIT_NDEF9     256
// const BIT_NDEF10    512
// const BIT_NDEF11   1024
// const BIT_NDEF12   2048
// const BIT_NDEF13   4096
// const BIT_NDEF14   8192
// const BIT_NDEF15  16384

// Solid Texture function selection held in CMatl::solidID variable.
const SOLID_NONE            = 0;   // **NO** solid texture -- !error!
const SOLID_2DGRID          = 1;   // 2D grid-plane; xy axis-aligned lines spaced
								// by xgap,ygap in x,y directions, & linesize
								// given by penwidth*(xgap,ygap)
const SOLID_3DGRID 			= 2;   // 3D grid-plane: xyz axis-aligned lines spaced
								// xgap,ygap,zgap in x,y,z directions: linesize
								// given by penwidth*(xgap,ygap,zgap).
const SOLID_CHECKERBOARD	= 3;   // 3D checkerboard
const SOLID_SPHERE_SINE		= 4;   // spherical sine-wave between 0,1
const SOLID_CYLINDER_SINE	= 5;   // cylindrical sine-wave between 0,1.

//==============================================================================
// Generic class for a material. Each instance describes just one material, but
// you can select any combination of properties for that material by setting the
// or clearing individual bits in the 'matlFlags' member.  These enable/disable
// Phong reflectance properties (ambient, diffuse, specular), mirror-like
// reflection, transparency, 3D color functions such as checkerboards that mix
// or select between two or more sets of reflectances according to model-space
// position, etc.
//
// I used just one CMatl class that holds all the variables needed for every
// possible kind of material: we'll often have unused variables. You may wish to
// take a more elegant approach using the C++ inheritance mechanisms; make a
// materials 'base' class and then make derived classes that contain only the
// variables you need for each specialized kind of material.
//
//  BASIC:
// Begin with simple Phong-lit materials, defined by  ambient, diffuse, and
// specular reflectance (just like openGL).
//
// ADVANCED VERSIONS:
// Once you have the basic materials working, you can implement exotic materials
// far more easily with ray tracing than you can with openGL.  In particular,
// chrome & glass (clear, colored, frosted) texture maps, environment maps,
// 3D texture functions such as wood, Perlin Noise functions that give you
// nice-looking marble,stucco and even skin-like functions...
function CMatl () {
	// this.isAlive;           // true/false to enable/disable this material.

	this.matlFlags;           // material type selector; const PHONG, etc.

	//--------------------------------
	// Primary Phong Descriptors:
	this.K_emi;
	this.K_amb;
	this.K_dif;
	this.K_spec;
	this.K_mir;
								// 4-color (rgba) reflectance values for:
								// ambient, diffuse, specular, mirror
	this.K_shiny;             // and the Phong specular exponent.

	this.K_glass;               // 4-color (rgba) transparent material color;
								// IMPORTANT! all values between 0.0 and 1.0;
								// K_glass=(1.0,1.0,1.0)==perfect transparency
	this.K_eta;               // Material's index of refraction; used to bend
								// rays as they enter/leave transparent mat'ls
								// according to Snell's law.
	this.K_dense;             // transparent material's absorption exponent:
								// Rays that travel distance (1/K_dense) through
								// the material get multiplied by K_glass.
								// A ray traveling distance d gets multiplied
								// by k_glass^(d * K_dense).  K_dense=0 means
								// NO attenuation--perfect transparency!

	// Solid Textures: (checkerboard, etc)
	this.solidID;                // ID# for a solid-texture function; see const
								// statementsEach
								// defined solidID selects one solid-texture
								// fcn that accepts model-space x,y,z coords, &
								// returns the 'blend' scalar; 0 <= blend <= 1.
								// The material at location x,y,z is a linear
								// mix TWO materials, matlA and matlB;
								// matl = matlA*(1-blend) + matlB*(blend),
								// where matlA == this CMatl object's attribs, &
	this.matlB_ID;              // and matlB == CMatl at CScene::matter[matlB_ID]
	
	// Parameters for all our various solid textures:
	this.xgap, this.ygap, this.zgap;      // spacing between lines, or 'block-size'
	this.penwidth;            // fraction of xgap,ygap, used for drawing lines
														// (typ. value: penwidth = 0.1 )
};


//------------------------------------------------------------------------------
// make a new material by linearly interpolating between each attribute of two
// existing materials:       [this] = (1.0 - blend) * src0[0] +
//                                    (      blend) * src1[0];
// OK for in-place calcs: you can use [this] as src0 or src1, or both.
CMatl.prototype.lerp = function(blend, src0, src1) {
	var tmp;       // for de-bugging in-place calcs; value BEFORE replacement

	this.K_emi   = vec4.lerp(vec4.create(), src0.K_emi,   src1.K_emi,   blend);    // Vec4 quantities
	// this.K_emi   = src0.K_emi;
	this.K_amb   = vec4.lerp(vec4.create(), src0.K_amb,   src1.K_amb,   blend);
	this.K_dif   = vec4.lerp(vec4.create(), src0.K_dif,   src1.K_dif,   blend);
	// this.K_glass = vec4.lerp(vec4.create(), src0.K_glass, src1.K_glass, blend);
	// this.K_mir   = vec4.lerp(vec4.create(), src0.K_mir,   src1.K_mir,   blend);
	this.K_spec  = vec4.lerp(vec4.create(), src0.K_spec,  src1.K_spec,  blend);
																									// GLdouble quantities
	tmp = (1.0 - blend) * src0.K_dense + (blend) * src1.K_dense;
	this.K_dense = tmp;
	tmp = (1.0 - blend) * src0.K_eta   + (blend) * src1.K_eta;
	this.K_eta = tmp;
	tmp = (1.0 - blend) * src0.K_shiny + (blend) * src1.K_shiny;
	this.K_shiny = tmp;
}

								
//	bool exists(void){return isAlive;};    // report the value of isAlive.
//	void create(void){isAlive=true;};      // material exists/doesn't exist.
//	void destroy(void){isAlive=false;};


