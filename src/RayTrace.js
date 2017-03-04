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

//-----------Ray Tracer Objects:
var myScene;											// containing CScene object
var myPic = new ImageBuffer(256,256);	// create RGB image buffer object, and

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
// copy current contents of ImageBuffer object 'myPic'  (see initTextures() above)
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
	myScene.lamp[i].pos = vec4.fromValues(LAMP0.pos.x,LAMP0.pos.y,LAMP0.pos.z,LAMP0.pos.w);
	myScene.lamp[i].I_a = vec4.fromValues(LAMP0.amb.r,LAMP0.amb.g,LAMP0.amb.b, 0.0);
	myScene.lamp[i].I_d = vec4.fromValues(LAMP0.dif.r,LAMP0.dif.g,LAMP0.dif.b, 0.0);
	myScene.lamp[i].I_s = vec4.fromValues(LAMP0.spc.r,LAMP0.spc.g,LAMP0.spc.b, 0.0);
	myScene.lampCount++;
	i++;
	// Make light 1 - point light:
	myScene.lamp.push(new CLight());
	myScene.lamp[i].lightType = LAMP_POINT;
	myScene.lamp[i].pos = vec4.fromValues(LAMP1.pos.x,LAMP1.pos.y,LAMP1.pos.z,LAMP1.pos.w);
	myScene.lamp[i].I_a = vec4.fromValues(LAMP1.amb.r,LAMP1.amb.g,LAMP1.amb.b, 1.0);
	myScene.lamp[i].I_d = vec4.fromValues(LAMP1.dif.r,LAMP1.dif.g,LAMP1.dif.b, 1.0);
	myScene.lamp[i].I_s = vec4.fromValues(LAMP1.spc.r,LAMP1.spc.g,LAMP1.spc.b, 1.0);
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

