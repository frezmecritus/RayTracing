//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chap 5: TexturedQuad.js (c) 2012 matsuda and kanda
//					"WebGL Programming Guide" pg. 163
// became:
//
//	traceWeek01_LineGrid.js 	MODIFIED for EECS 351-1, 
//																	Northwestern Univ. Jack Tumblin
//	--add comments
//	--two side-by-side viewports: 
//			LEFT:	--3D line-drawing preview
//			RIGHT:--texture-map from a Uint8Array object.  
//							(NOTE: Not all versions of WebGL can read the Float32Array
//							(made by our ray-tracer; convert it to 8-bit integer
//							(by rounding: intRGB = floatRGB*255.5
//	--include re-sizing to fit browser-window width
//							(see 351-1 starter code: 7.11.JT_HelloCube_Resize.js, .html)
//

//==============================================================================
// HOW DO WE CONSTRUCT A CAMERA?
//==============================================================================
// A perspective camera for ray-tracing, specified in 'world' coordinate system
// by 'intrinsic' or 'internal' parameters:
//				iLeft,iRight,iTop,iBot; // for view frustum;
//				xmax,ymax; xSampMax,ySampMax// for camera image size & antialiasing
// and by 'extrinsic' or world-space 'camera-positioning' parameters:
//				vrp,lookAtPt,vup 		// View Reference Point(3D center-of-projection)
//										// look-at point, point at center of cam image,
//										// View Up Vector, in +y direction on on-screen
//
//     Users position and aim the camera by specifying two points and one vector
// in world-space.  The 'view reference point' (vrp) sets camera position; the
// 'lootAt' point sets the cameras' direction-of-gaze, and the 'view up' vector
// (vup) specifies a world-space direction that will appear vertical in the
// camera image.
//     From (vrp,lookAtPt,vup) we compute a (right-handed) camera coord. system
// consisting of an origin point, and 3 computed orthonormal vectors U,V,N
// (just a world-space renaming of the eye-space x,y,z vector directions).
// The coord. system's origin point is == 'vrp', and we describe the coordinate
// axes by the unit-length world-space vectors U,V,N. To compute these vectors,
// use N = ||vrp-lookAtPt||, U= vup cross N; V= N cross U.  We can easily
// convert a 3D point from camera coords (u,v,n) to world-space coords (x,y,z):
// we start at the camera's origin (vrp), add U,V,N axis vectors weighted by
// the point's u,v,n coords: by the coords (x,y,z) = vrp + U*u + V*v + N*n.
//     Users set the camera's internal parameters by choosing 6 numbers in the
// the camera coordinate system. Here, the 'eye point' or 'center of projection'
// is the origin: (u,v,n)=0,0,0; the camera viewing direction is the -N axis,
// and the U,V axes set the camera image's vertical and horizontal directions
// (x,y). We specify the image in the camera's n=-1 plane; it is the view from
// the origin through the 'image rectangle' with these 4 user-specified corners:
//  	            (iLeft, iTop, -1) (iRight, iTop, -1)
//	                (iLeft, iBot, -1) (iRight, iBot, -1) in  (u,v,n) coords.
// (EXAMPLE: If the user set iLeft=-1, iRight=+1, iTop=+1, iBot = -1, then our
// image rectangle is a square, centered on the -N axis, and our camera's
// field-of-view spans +/- 45 degrees horizontally, +/- 45 degrees vertically.)
//
// Users specify resolution of this image rectangle in pixels (xmax,ymax), and
// the pixels divide the image rectangle into xsize,ysize 'little squares'. Each
// little square has the same width (ufrac) and height (vfrac), where:
//     ufrac = (iRight - iLeft)/xmax;  vfrac = (iTop - iBot)/ymax.
// (note: keep ufrac/vfrac =1, so the image won't appear stretched or squashed).
// The little square at the lower-left corner of the image rectangle holds the
// pixel (0,0), but recall that the pixel is NOT that little square! it is the
// POINT AT THE SQUARE'S CENTER; thus pixel (0,0) location in u,v,n coords is:
//               (iLeft +    0.5*ufrac,  iBot +    0.5*vfrac, -1).
// Similarly, pixel(x,y) location in u,v,n is:
//      uvnPix = (iLeft + (x+0.5)*ufrac, iBot + (y+0.5)*vfrac, -1).
//
// With uvnPix, we can easily make the 'eye' ray in (u,v,n) coords for the (x,y)
// pixel; the ray origin is (0,0,0), and the ray direction vector is
// uvnPix - (0,0,0) = uvnPix. However, we need an eyeRay in world-space coords;
// To convert, replace the ray origin with vrp (already in world-space coords),
// and compure ray direction as a coordinate-weighted sum of the unit-length
// U,V,N axis vectors; eye.dir = uvnPix.u * U + uvnPix.v * V + uvnPix.n * N.
// This 'weighted sum' is just a matrix multiply; cam2world * uvnPix,
// where U,V,N unit-length vectors are the columns of cam2world matrix.
//
// Finally, to move the CCamera in world space, just translate its VRP;
// to rotate CCamera around its VRP, just rotate the u,v,n axes (pre-multiply
// cam2world matrix with a rotation matrix).
//=============================================================================

// Vertex shader program----------------------------------
var TRACER_VSHADER =
	// 'uniform   mat4 u_VpMatrix; \n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec2 a_TexCoord;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'  gl_Position = a_Position;\n' +
	'  v_TexCoord = a_TexCoord;\n' +
	'}\n';

// Fragment shader program--------------------------------
var TRACER_FSHADER =
	'#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	'#endif\n' +
	'uniform int u_isTexture; \n' +							// texture/not-texture flag
	'uniform sampler2D u_Sampler;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'  if(u_isTexture > 0) {  \n' +
	'  	 gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
	'  } \n' +
	'  else { \n' +
	'	 	 gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0); \n' +
	'  } \n' +
	'}\n';

//Global Vars:---------------------------------------------------------------

// 'Uniform' values (sent to the GPU)
var u_isTexture = 0;					// ==0 false--use fixed colors in frag shader
										// ==1 true --use texture-mapping in frag shader
var u_isTextureID = 0;			  // GPU location of this uniform var

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;

var reflDepth = 3;


// LookAt parameters
var LOOK_AT = [
	vec4.fromValues( 0.0, 3.0,  1.0, 1.0),		// eye
	vec4.fromValues( 0.0, 0.0, -1.0, 1.0), 		// center
	vec4.fromValues( 0.0, 0.0, -1.0, 0.0),		// up
	{theta: 270.0, phi: 0.0, tilt: 0.0}
];

var lamp0Attr = {
  pos: {x: LOOK_AT[0][0], y: LOOK_AT[0][1], z: LOOK_AT[0][2], w: 1.0},
  amb: {r: 0.4, g: 0.4, b: 0.4},
  dif: {r: 0.7, g: 0.7, b: 0.7},
  spc: {r: 0.7, g: 0.7, b: 0.7}
};

var lamp1Attr = {
  pos: {x: 0.0, y: 3.0, z: 2.0, w: 1.0},
  amb: {r: 0.1, g: 0.2, b: 0.2},
  dif: {r: 0.4, g: 0.5, b: 0.6},
  spc: {r: 0.4, g: 0.3, b: 0.5}
};

//-----------Ray Tracer Objects:
var myScene;											// containing CScene object
var myPic = new CImgBuf(256,256);	// create RGB image buffer object, and
var currentScene = 0;							// 0: 3 spheres, 1: sph, cyl, box, (cone)

//==============================================================================
function main2() {
	test_glMatrix();		// make sure that the fast vector/matrix library we use
												// is available and working properly.


	// Retrieve <canvas> element
	var canvas = document.getElementById('raytracing');

	// browserResize();			// Re-size this canvas before we use it. 
	// (ignore the size settings from our HTML file; fill all but a 20-pixel 
	// border with a canvas whose width is twice its height.)
	// Get the rendering context for WebGL

	var gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	if (!initShaders(gl, TRACER_VSHADER, TRACER_FSHADER)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// Create,enable vertex buffer objects (VBO) in graphics hardware
	var n = initVertexBuffers(gl);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Create, set uniform var to select fixed color vs texture map drawing:
	u_isTextureID = gl.getUniformLocation(gl.program, 'u_isTexture');
	if (!u_isTextureID) {
		console.log('Failed to get the GPU storage location of u_isTexture');
		return false;
	}

	// Register the Mouse & Keyboard Event-handlers-------------------------------
	canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
	canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
	canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};
						
	// Next, register all keyboard events found within our HTML webpage window:
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
	window.addEventListener("keypress", myKeyPress, false);

	// Specify how we will clear the WebGL context in <canvas>
	gl.clearColor(0.0, 0.0, 0.0, 1.0);				
	// gl.enable(gl.DEPTH_TEST); // CAREFUL! don't do depth tests for 2D!

	// Create, load, enable texture buffer object (TBO) in graphics hardware
	if (!initTextures(gl, n)) {
		console.log('Failed to intialize the texture.');
		return;
	}

	drawAll(gl, n);
}

//=============================================================================
// make sure that the fast vector/matrix library we use is available and works 
// properly. My search for 'webGL vector matrix library' found the GitHub 
// project glMatrix is intended for WebGL use, and is very fast, open source 
// and well respected.		 	SEE:       http://glmatrix.net/
// 			NOTE: cuon-matrix.js library (supplied with our textbook: "WebGL 
// Programming Guide") duplicates some of the glMatrix.js functions. For 
// example, the glMatrix.js function 		mat4.lookAt() 		is a work-alike 
//	 for the cuon-matrix.js function 		Matrix4.setLookAt().
function test_glMatrix() {

	myV4 = vec4.fromValues(1,8,4,7);				// create a 4-vector
	console.log(' myV4 = '+myV4+'\n myV4[0] = '+myV4[0]+'\n myV4[1] = '+myV4[1]+'\n myV4[2] = '+myV4[2]+'\n myV4[3] = '+myV4[3]+'\n\n');
	
	myM4 = mat4.create();							// create a 4x4 matrix
	console.log('mat4.str(myM4) = '+mat4.str(myM4)+'\n' );
	// Which is it? print out row[0], row[1], row[2], row[3],
	// or print out column[0], column[1], column[2], column[3]?
	// Create a 'translate' matrix to find out:
	transV3 = vec3.fromValues(6,7,8);			// translation vector
	transM4 = vec4.create();							// an indentity matrix, then
	mat4.translate(transM4, myM4,transV3);	// make into translation matrix
	console.log('mat4.str(transM4) = '+mat4.str(transM4)+'\n');
	// THUS 'mat4.str()' function is
	console.log(
	' myM4 row0=[ '+myM4[0]+', '+myM4[1]+', '+myM4[2]+', '+myM4[3]+' ]\n');
	console.log(
	' myM4 row1=[ '+myM4[0]+', '+myM4[1]+', '+myM4[2]+', '+myM4[3]+' ]\n');
	console.log(
	' myM4 row2=[ '+myM4[0]+', '+myM4[1]+', '+myM4[2]+', '+myM4[3]+' ]\n');
		console.log(
	' myM4 row3=[ '+myM4[0]+', '+myM4[1]+', '+myM4[2]+', '+myM4[3]+' ]\n');				
}

//==============================================================================
// 4 vertices for a texture-mapped 'quad' (square) to fill almost all of the CVV
function initVertexBuffers(gl) {
	var verticesTexCoords = new Float32Array([
		// Quad vertex coordinates(x,y in CVV); texture coordinates tx,ty
		-0.95,  0.95,   	0.0, 1.0,				// upper left corner,
		-0.95, -0.95,   	0.0, 0.0,				// lower left corner,
		 0.95,  0.95,   	1.0, 1.0,				// upper right corner,
		 0.95, -0.95,   	1.0, 0.0,				// lower left corner.
	]);
	var n = 4; // The number of vertices

	// Create the vertex buffer object in the GPU
	var vertexTexCoordBufferID = gl.createBuffer();
	if (!vertexTexCoordBufferID) {
		console.log('Failed to create the buffer object');
		return -1;
	}

	// Bind the this vertex buffer object to target (ARRAY_BUFFER).  
	// (Why 'ARRAY_BUFFER'? Because our array holds vertex attribute values.
	//	Our only other target choice: 'ELEMENT_ARRAY_BUFFER' for an array that 
	// holds indices into another array that holds vertex attribute values.)
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBufferID);
	gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

	var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
	//Get the storage location of a_Position, assign and enable buffer
	var a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_PositionID < 0) {
		console.log('Failed to get the GPU storage location of a_Position');
		return -1;
	}
	gl.vertexAttribPointer(a_PositionID, 2, gl.FLOAT, false, FSIZE*4, 0);
	gl.enableVertexAttribArray(a_PositionID);  // Enable the assignment of the buffer object

	// Get the storage location of a_TexCoord
	var a_TexCoordID = gl.getAttribLocation(gl.program, 'a_TexCoord');
	if (a_TexCoordID < 0) {
		console.log('Failed to get the GPU storage location of a_TexCoord');
		return -1;
	}
	// Assign the buffer object to a_TexCoord variable
	gl.vertexAttribPointer(a_TexCoordID, 2, gl.FLOAT, false, FSIZE*4, FSIZE*2);
	// Enable the assignment of the buffer object
	gl.enableVertexAttribArray(a_TexCoordID);  
	return n;
}

//==============================================================================
// set up the GPU to supply a texture image and pixel-by-pixel texture addresses
// for our Fragment Shader.
function initTextures(gl, n) {

	var textureID = gl.createTexture();   // Get GPU location for new texture map 
	if (!textureID) {
		console.log('Failed to create the texture object on the GPU');
		return false;
	}

		// Get GPU location of a new uniform u_Sampler
	var u_SamplerID = gl.getUniformLocation(gl.program, 'u_Sampler');
	if (!u_SamplerID) {
		console.log('Failed to get the GPU location of u_Sampler');
		return false;
	}
	
	myPic.setTestPattern(0);				// fill it with an initial test-pattern.
	// 																// 0 == colorful L-shaped pattern
	// 																// 1 == uniform orange screen
	
	// Enable texture unit0 for our use
	gl.activeTexture(gl.TEXTURE0);
	// Bind our texture object (made at start of this fcn) to GPU's texture hdwe.
	gl.bindTexture(gl.TEXTURE_2D, textureID);
	// allocate memory and load the texture image into our texture object on GPU:
	gl.texImage2D(gl.TEXTURE_2D, 		//  'target'--the use of this texture
								0, 								//  MIP-map level (default: 0)
								gl.RGB, 					// GPU's data format (RGB? RGBA? etc)
								myPic.xSiz,				// image width in pixels,
								myPic.ySiz,				// image height in pixels,
								0,								// byte offset to start of data
								gl.RGB, 					// source/input data format (RGB? RGBA?)
								gl.UNSIGNED_BYTE, // data type for each color channel				
								myPic.iBuf);			// data source.
								
	// Set the WebGL texture-filtering parameters
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	// Set the texture unit 0 to be driven by the sampler
	gl.uniform1i(u_SamplerID, 0);
	return true;
}

//==============================================================================
// Modify/update the contents of the texture map(s) stored in the GPU;
// copy current contents of CImgBuf object 'myPic'  (see initTextures() above)
// into the existing texture-map object stored in the GPU:
function refreshTextures(gl) {

	gl.texSubImage2D(gl.TEXTURE_2D, 		// 'target'--the use of this texture
									 0, 								// MIP-map level (default: 0)
									 0,0,								// xoffset, yoffset (shifts the image)
									 myPic.xSiz,				// image width in pixels,
									 myPic.ySiz,				// image height in pixels,
									 gl.RGB, 						// source/input data format (RGB? RGBA?)
									 gl.UNSIGNED_BYTE, 	// data type for each color channel				
									 myPic.iBuf);				// data source.
}

//------------------------------------------------------------------------------
// any/all RayTracing initialization; create our shapes, materials, lights, etc.
function my_init_raytrace(option) {

	var i=0, material;
	myScene.depthMax = 1;
	myScene.itemCount = 0;  // start with nothing.

	// Now add a grid-plane
	myScene.items.push(new CGeom());
	myScene.items[i].shapeType = GEOM_GNDPLANE;
	myScene.items[i].matlNum = 0;        // use the first material;
																			// (which uses matlNum 2 as its
																			// secondary material)
	myScene.itemCount++;
	i++;

	if(option==0) {
		// now add a sphere. (center)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_SPHERE;
		myScene.items[i].matlNum = 7;        // use the 2nd material.
		myScene.itemCount++;
		i++;
		// and another sphere. (left side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_SPHERE;
		myScene.items[i].rayTranslate3d(2, 0, 0);
		myScene.items[i].rayScale3d(0.5,0.5,0.5);
		myScene.items[i].matlNum = 8;
		myScene.itemCount++;
		i++;
		// and another sphere. (right side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_SPHERE;
		myScene.items[i].rayTranslate3d(-1, 1.8, 0);
		myScene.items[i].rayScale3d(0.5, 0.5, 0.1);
		myScene.items[i].matlNum = 4;        // use the 3rd material.
		myScene.itemCount++;
		i++;
	} else {
		// now add a sphere.
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_SPHERE;
		myScene.items[i].rayTranslate3d(0, -1, 0);
		myScene.items[i].matlNum = 2;        // use the 2nd material.
		myScene.itemCount++;
		i++;
		// and a cylinder. (left side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_CYLINDER;
		myScene.items[i].rayTranslate3d(2, 1, 0);
		myScene.items[i].rayScale3d(0.3,0.3,0.7);
		myScene.items[i].matlNum = 3;
		myScene.itemCount++;
		i++;
		// and a box. (right side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_BOX;
		myScene.items[i].rayTranslate3d(-1.2, 2.0, 0);
		myScene.items[i].rayScale3d(0.5, 0.5, 0.5);
		myScene.items[i].matlNum = 4;
		myScene.itemCount++;
		i++;

		// and a cone. (upper side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_CONE;
		myScene.items[i].rayTranslate3d(1.0, 1.5, 0);
		myScene.items[i].rayScale3d(0.3, 0.3, 0.7);
		myScene.items[i].matlNum = 5;
		myScene.itemCount++;
		i++;

		// and a half sphere. (upper side)
		myScene.items.push(new CGeom());
		myScene.items[i].shapeType = GEOM_HALFSPH;
		myScene.items[i].rayTranslate3d(0.5, 0.5, 0);
		myScene.items[i].rayScale3d(0.4, 0.4, 0.4);
		myScene.items[i].matlNum = 6;
		myScene.itemCount++;
		i++;
	}

	// Now make all our materials
	myScene.matterCount = 0;
	i = 0;
	// Make a 2-color material for gridplane object:
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_SOLIDTEX;
	// myScene.matter[i].solidID = SOLID_2DGRID;    // grid-plane
	myScene.matter[i].solidID = SOLID_CHECKERBOARD;    // grid-plane
	myScene.matter[i].matlB_ID = 1; // secondary material; matter[1]
	myScene.matter[i].xgap = 1.0;
	myScene.matter[i].ygap = 1.0;
	myScene.matter[i].zgap = 1.0;
	myScene.matter[i].penwidth = 0.4;
	myScene.matter[i].K_emi = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
	myScene.matter[i].K_amb = vec4.fromValues(0.0, 0.0, 0.0, 0.0);	// no ambient
	myScene.matter[i].K_dif = vec4.fromValues(0.1, 0.1, 0.1, 1.0);	// dark green lines
	myScene.matter[i].K_spec= vec4.fromValues(0.5,0.5,0.5,1.0);			// dull white specular
	myScene.matter[i].K_shiny = 10.0;																// specular exponent
	myScene.matterCount++;
	i++;
	// matter[1]: secondary material for matter[0];
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	myScene.matter[i].K_emi = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
	myScene.matter[i].K_amb = vec4.fromValues(0.0, 0.0, 0.0, 0.0);	// no ambient.
	myScene.matter[i].K_dif = vec4.fromValues(0.9,0.9,0.9,1.0);     // bright gray gap-fill
	myScene.matter[i].K_spec= vec4.fromValues(0.5,0.5,0.5,1.0);     // dull white specular
	myScene.matter[i].K_shiny = 30.0;																// specular exponent
	myScene.matterCount++;
	i++;
	// matter[2]: a red shiny material for sphere A
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_RUBY);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;
	// matter[3]: a green shiny material for sphere B
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_EMERALD);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;
	// matter[4]: a blue shiny material for sphere C
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_COPPER_SHINY);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;
	// matter[5]: a blue shiny material for cone
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_OBSIDIAN);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;

	// matter[6]: a blue shiny material for half sphere
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_BRASS);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;

	// matter[7]: a blue shiny material for sphere A
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_SILVER_SHINY);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;

	// matter[8]: a blue shiny material for sphere B
	myScene.matter.push(new CMatl());
	myScene.matter[i].matlFlags = BIT_PHONG;
	material = new Material(MATL_GOLD_SHINY);
	myScene.matter[i].K_emi = vec4.fromValues(material.emissive[0], material.emissive[1], material.emissive[2], material.emissive[3]);
	myScene.matter[i].K_amb = vec4.fromValues(material.ambient[0],  material.ambient[1],  material.ambient[2],  material.ambient[3]);
	myScene.matter[i].K_dif = vec4.fromValues(material.diffuse[0],  material.diffuse[1],  material.diffuse[2],  material.diffuse[3]);
	myScene.matter[i].K_spec= vec4.fromValues(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
	myScene.matter[i].K_shiny = material.shiny;// specular exponent
	myScene.matterCount++;
	i++;

	// Now make all our lights
	myScene.lampCount = 0;
	i = 0;
	// Make light 0 - point light attahced to camera:
	myScene.lamp.push(new CLight());
	myScene.lamp[i].lightType = LAMP_POINT;
	myScene.lamp[i].pos = vec4.fromValues(lamp0Attr.pos.x,lamp0Attr.pos.y,lamp0Attr.pos.z,lamp0Attr.pos.w);
	myScene.lamp[i].I_a = vec4.fromValues(lamp0Attr.amb.r,lamp0Attr.amb.g,lamp0Attr.amb.b, 0.0);
	myScene.lamp[i].I_d = vec4.fromValues(lamp0Attr.dif.r,lamp0Attr.dif.g,lamp0Attr.dif.b, 0.0);
	myScene.lamp[i].I_s = vec4.fromValues(lamp0Attr.spc.r,lamp0Attr.spc.g,lamp0Attr.spc.b, 0.0);
	myScene.lampCount++;
	i++;
	// Make light 1 - point light:
	myScene.lamp.push(new CLight());
	myScene.lamp[i].lightType = LAMP_POINT;
	myScene.lamp[i].pos = vec4.fromValues(lamp1Attr.pos.x,lamp1Attr.pos.y,lamp1Attr.pos.z,lamp1Attr.pos.w);
	myScene.lamp[i].I_a = vec4.fromValues(lamp1Attr.amb.r,lamp1Attr.amb.g,lamp1Attr.amb.b, 1.0);
	myScene.lamp[i].I_d = vec4.fromValues(lamp1Attr.dif.r,lamp1Attr.dif.g,lamp1Attr.dif.b, 1.0);
	myScene.lamp[i].I_s = vec4.fromValues(lamp1Attr.spc.r,lamp1Attr.spc.g,lamp1Attr.spc.b, 1.0);
	myScene.lampCount++;
	i++;
}

//==============================================================================
// Clear <canvas> color AND DEPTH buffer
function drawAll(gl, nV) {

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Use OpenGL/ WebGL 'viewports' to map the CVV to the 'drawing context',
	// (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
	// Details? see
	//  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
	//------------------------------------------
	// Draw in the viewport
	//------------------------------------------
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	gl.uniform1i(u_isTextureID, 1);						// DO use texture,
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, nV); 	// Draw the textured rectangle
}

//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="browserResize()">
function browserResize() {
	/* SOLUTION to a pesky problem: 
	The main() function retrieves our WebGL drawing context as the variable 'gl', 
	then shares it as an argument to other functions.  
	That's not enough!
	How can we access the 'gl' canvas within functions that main() will NEVER call, 
	such as the mouse and keyboard-handling functions, or winResize()? \
	Easy! make our own local references to the current canvas and WebGL drawing
	context, like this: */

	var myCanvas = document.getElementById('raytracing');	// get current canvas
	var myGL = getWebGLContext(myCanvas);							// and context:
	//Report our current browser-window contents:

	console.log('myCanvas width,height=', myCanvas.width, myCanvas.height);
	console.log('Browser window: innerWidth,innerHeight=',
																innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp
	
	//Make a square canvas/CVV fill the SMALLER of the width/2 or height:
	if(innerWidth > 2*innerHeight) {  // fit to brower-window height
		myCanvas.width = 2*innerHeight-20;
		myCanvas.height = innerHeight-20;
	} else {	// fit canvas to browser-window width
		myCanvas.width = innerWidth-20;
		myCanvas.height = 0.5*innerWidth-20;
	}	 
	console.log('NEW myCanvas width,height=', myCanvas.width, myCanvas.height);		
}



//=================================//
//                                 //
//   Mouse and Keyboard            //
//   event-handling Callbacks      //
//                                 //
//=================================//


//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
function myMouseDown(ev, gl, canvas) {

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	// console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
	var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport,
							 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	// console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};


//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
function myMouseMove(ev, gl, canvas) {

	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	// console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
	var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport, 
							 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	// console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	xMclik = x;													// Make next drag-measurement from here.
	yMclik = y;
};

//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
function myMouseUp(ev, gl, canvas) {
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
	var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport,
							 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
};

//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).
//  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
// need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
// Del, etc), then just use the 'keypress' event instead.
//	 The 'keypress' event captures the combined effects of alphanumeric keys and
// the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
// UniCode or ASCII codes; you'll get the ASCII code for uppercase 'S' if you 
// hold shift and press the 's' key.
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of the messy way JavaScript handles keyboard events
// see:    http://javascript.info/tutorial/keyboard-events
function myKeyDown(ev) {

	// switch(ev.keyCode) {			// keycodes !=ASCII, but are very consistent for 
	// //	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
	// 	case 37:		// left-arrow key
	// 		// print in console:
	// 		console.log(' left-arrow.');
	// 		// and print on webpage in the <div> element with id='Result':
	// 		document.getElementById('Result').innerHTML =
	// 			' Left Arrow:charCode=' + ev.charCode +', keyCode='+ev.keyCode;
	// 		break;
	// 	case 38:		// up-arrow key
	// 		console.log('   up-arrow.');
	// 		document.getElementById('Result').innerHTML =
	// 			'   Up Arrow:charCode=' + ev.charCode +', keyCode='+ev.keyCode;
	// 		break;
	// 	case 39:		// right-arrow key
	// 		console.log('right-arrow.');
	// 		document.getElementById('Result').innerHTML =
	// 			'Right Arrow:charCode=' + ev.charCode +', keyCode='+ev.keyCode;
	// 		break;
	// 	case 40:		// down-arrow key
	// 		console.log(' down-arrow.');
	// 		document.getElementById('Result').innerHTML =
	// 			' Down Arrow:charCode=' + ev.charCode +', keyCode='+ev.keyCode;
	// 		break;
	// 	default:
	// 		console.log('myKeyDown()--charCode=', ev.charCode, ', keyCode=', ev.keyCode)

	// 		document.getElementById('Result').innerHTML =
	// 			'myKeyDown()--charCode=' + ev.charCode +', keyCode='+ev.keyCode;
	// 		break;
	// }
}

//===============================================================================
// Called when user releases ANY key on the keyboard; senses ALL key changes.
//  Rarely needed.
function myKeyUp(ev) {

	// console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
}

//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
//===============================================================================
// keyboard input event-listener callbacks
function myKeyPress(ev) {

	switch(ev.keyCode) {
		// viewpoint changes
		case 101:   // The e key was pressed
			LOOK_AT[0][0] += 0.1;
			LOOK_AT[1][0] += 0.1;
			break;
		case 113:   // The q key was pressed
			LOOK_AT[0][0] -= 0.1;
			LOOK_AT[1][0] -= 0.1;
			break;
		case 100:   // The d key was pressed
			LOOK_AT[0][1] += 0.1;
			LOOK_AT[1][1] += 0.1;
			break;
		case 97:    // The a key was pressed
			LOOK_AT[0][1] -= 0.1;
			LOOK_AT[1][1] -= 0.1;
			break;
		case 119:   // The w key was pressed
			LOOK_AT[0][2] += 0.1;
			LOOK_AT[1][2] += 0.1;
			break;
		case 115:   // The s key was pressed
			LOOK_AT[0][2] -= 0.1;
			LOOK_AT[1][2] -= 0.1;
			break;

		// perspective box size changes
		case 99:    // The c key was pressed
			LOOK_AT[3].theta -= 1;
			updateLookAt();
			break;
		case 122:   // The z key was pressed
			LOOK_AT[3].theta += 1;
			updateLookAt();
			break;
		case 120:   // The x key was pressed
			LOOK_AT[1][2] += 0.03;
			// LOOK_AT.rotate.tilt += 1;
			break;
		case 88:    // The X key was pressed
			LOOK_AT[1][2] -= 0.03;
			// LOOK_AT.rotate.tilt -= 1;
			break;

		case 72:    // h, H for help
		case 104:
			alert("Hotkeys:\n\n"+
						"Adjustable Camera:\n" +
						"'e' 'q' 'd' 'a' 'w' 's' for position move\n" +
						"'c' 'z' for horizontal rotation\n\n");
			break;
		default:
			console.log('press:' + ev.keyCode);
			break;
	}
}

function updateLookAt () {

	var thetaD = LOOK_AT[3].theta * Math.PI / 180;
	//var phiD = viewSet.rotate.phi * Math.PI / 180;

	// var newX = Math.cos(thetaD) * Math.cos(phiD);
	// var newY = Math.sin(thetaD) * Math.cos(phiD);
	// var newZ = Math.sin(phiD);

	LOOK_AT[1][0] = LOOK_AT[0][0] + 10 * Math.cos(thetaD);
	LOOK_AT[1][1] = LOOK_AT[0][1] + 10 * Math.sin(thetaD);
}

//==============================================================================
// web initialization
$( function() {
  // $('#lighting_panel').hide();
  lampUpdate();
  $( "input" )
    .keyup(function() {
      var value = $( this ).val();
      var name  = $( this ).attr('id');

      if(!isNaN(value)) {
        arr = name.split("_");
        //console.log( arr[0] + ' ' + arr[1] + ' ' + arr[2]);
        if(arr[0]=="lamp0")
        	lamp0Attr[ arr[1] ][ arr[2] ] = value;
        else
        	lamp1Attr[ arr[1] ][ arr[2] ] = value;
      }
      lampUpdate();
    })
    .keyup();
});

function lampUpdate() {
  $('#lamp0_pos_x').val(lamp0Attr.pos.x);
  $('#lamp0_pos_y').val(lamp0Attr.pos.y);
  $('#lamp0_pos_z').val(lamp0Attr.pos.z);
  $('#lamp1_pos_x').val(lamp1Attr.pos.x);
  $('#lamp1_pos_y').val(lamp1Attr.pos.y);
  $('#lamp1_pos_z').val(lamp1Attr.pos.z);
}

function switchLamp0 () {
	if (lamp0Attr.pos.w==0.0) {// light is off
		lamp0Attr.pos.w = 1.0;
		lamp0Attr.amb = {r: 0.4, g: 0.4, b: 0.4};
		lamp0Attr.dif = {r: 1.0, g: 1.0, b: 1.0};
		lamp0Attr.spc = {r: 1.0, g: 1.0, b: 1.0};
	}
	else {
		lamp0Attr.pos.w = 0.0;
		lamp0Attr.amb.r = lamp0Attr.amb.g = lamp0Attr.amb.b = 0.0;
		lamp0Attr.dif.r = lamp0Attr.dif.g = lamp0Attr.dif.b = 0.0;
		lamp0Attr.spc.r = lamp0Attr.spc.g = lamp0Attr.spc.b = 0.0;
	}
}

function switchLamp1 () {
	if (lamp1Attr.pos.w==0.0) {// light is off
		lamp1Attr.pos.w = 1.0;
		lamp1Attr.amb = {r: 0.1, g: 0.2, b: 0.2};
		lamp1Attr.dif = {r: 0.4, g: 0.5, b: 0.6};
		lamp1Attr.spc = {r: 0.4, g: 0.3, b: 0.5};
	}
	else {
		lamp1Attr.pos.w = 0.0;
		lamp1Attr.amb.r = lamp1Attr.amb.g = lamp1Attr.amb.b = 0.0;
		lamp1Attr.dif.r = lamp1Attr.dif.g = lamp1Attr.dif.b = 0.0;
		lamp1Attr.spc.r = lamp1Attr.spc.g = lamp1Attr.spc.b = 0.0;
	}
}

function isAAenable() {
	myScene.isAA = true;
}

function isAAdisable() {
	myScene.isAA = false;
}

function changeScene () {
	if (currentScene == 0)
		currentScene = 1;
	else
		currentScene = 0;
}

function startRT() {
	console.log("Start ray-tracing")
	var myCanvas = document.getElementById('raytracing');  // get current canvas
	var myGL = getWebGLContext(myCanvas);       // and its current context:
	myScene = new CScene();
	my_init_raytrace(currentScene);
	myScene.rayCam = new CCamera(LOOK_AT[0],LOOK_AT[1],LOOK_AT[2],90);
	myScene.makeRayTracedImage(myPic, 0);
	refreshTextures(myGL);
	drawAll(myGL,4);
}

function decreaseDepth() {
	if(reflDepth>0)
		reflDepth--;
}

function increaseDepth() {
	if(reflDepth<3)
		reflDepth++;
}



