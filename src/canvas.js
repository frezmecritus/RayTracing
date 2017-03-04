function maina() {

  main2();
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // winResize();

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Register the Mouse & Keyboard Event-handlers-------------------------------
  //canvas.onmousedown = function(ev){myMouseDown( ev, gl, canvas) };
  //canvas.onmousemove = function(ev){myMouseMove( ev, gl, canvas) };    
  //canvas.onmouseup   = function(ev){myMouseUp(   ev, gl, canvas) };
  window.addEventListener("keypress", myKeyPress);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of uniform variables: the scene
  var u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_MvpMatrix = gl.getUniformLocation(gl.program,   'u_MvpMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program,'u_NormalMatrix');
  if (!u_ModelMatrix  || !u_MvpMatrix || !u_NormalMatrix) {
    console.log('Failed to get matrix storage locations');
    return;
  }
  //  ... for Phong light source0:
  var u_Lamp0Pos  = gl.getUniformLocation(gl.program,   'u_Lamp0Pos');
  var u_Lamp0Amb  = gl.getUniformLocation(gl.program,   'u_Lamp0Amb');
  var u_Lamp0Diff = gl.getUniformLocation(gl.program,   'u_Lamp0Diff');
  var u_Lamp0Spec = gl.getUniformLocation(gl.program,   'u_Lamp0Spec');
  if( !u_Lamp0Pos || !u_Lamp0Amb || !u_Lamp0Diff || !u_Lamp0Spec ) {
    console.log('Failed to get the Lamp0 storage locations');
    return;
  }
  //  ... for Phong light source1:
  var u_Lamp1Pos  = gl.getUniformLocation(gl.program,   'u_Lamp1Pos');
  var u_Lamp1Amb  = gl.getUniformLocation(gl.program,   'u_Lamp1Amb');
  var u_Lamp1Diff = gl.getUniformLocation(gl.program,   'u_Lamp1Diff');
  var u_Lamp1Spec = gl.getUniformLocation(gl.program,   'u_Lamp1Spec')
  if( !u_Lamp1Pos || !u_Lamp1Amb || !u_Lamp1Diff || !u_Lamp1Spec ) {
    console.log('Failed to get the Lamp1 storage locations');
    return;
  }

  // ... for Phong material/reflectance:
  var u_Ke = gl.getUniformLocation(gl.program, 'u_Ke');
  var u_Ka = gl.getUniformLocation(gl.program, 'u_Ka');
  var u_Kd = gl.getUniformLocation(gl.program, 'u_Kd');
  var u_Ks = gl.getUniformLocation(gl.program, 'u_Ks');
  
  if(!u_Ke || !u_Ka || !u_Kd || !u_Ks) {
    console.log('Failed to get the Phong Reflectance storage locations');
    return;
  }

  var modelMatrix = new Matrix4();  // Model matrix
  var mvpMatrix = new Matrix4();    // Model view projection matrix
  var normalMatrix = new Matrix4(); // Transformation matrix for normals
  
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;
  // On-screen aspect ratio for this camera: width/height.
  vpAspect = gl.drawingBufferWidth / gl.drawingBufferHeight;

  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    currentAngle = animate(currentAngle);

    //----------------------Create viewport------------------------
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // For this viewport, set camera's eye point and the viewing volume:
    mvpMatrix.setFrustum(-0.6, 0.6, -0.9, 0.3, 1.0, 100);
    mvpMatrix.lookAt( LOOK_AT[0][0], LOOK_AT[0][1], LOOK_AT[0][2],
                      LOOK_AT[1][0], LOOK_AT[1][1], LOOK_AT[0][2],
                      0.0, 0.0, 1.0);

    // Pass the eye position to u_eyePosWorld
    gl.uniform4f(u_eyePosWorld, LOOK_AT[0][0], LOOK_AT[0][1], LOOK_AT[0][2], 1);

    // Position the first light source in World coords: 
    gl.uniform4f(u_Lamp0Pos,  LOOK_AT[0][0], LOOK_AT[0][1], LOOK_AT[0][2], 1.0);
    gl.uniform3f(u_Lamp0Amb,  lamp0Attr.amb.r, lamp0Attr.amb.g, lamp0Attr.amb.b);   // ambient
    gl.uniform3f(u_Lamp0Diff, lamp0Attr.dif.r, lamp0Attr.dif.g, lamp0Attr.dif.b);   // diffuse
    gl.uniform3f(u_Lamp0Spec, lamp0Attr.spc.r, lamp0Attr.spc.g, lamp0Attr.spc.b);   // Specular
    
    // Position the second light source in World coords: 
    gl.uniform4f(u_Lamp1Pos,  lamp1Attr.pos.x, lamp1Attr.pos.y, lamp1Attr.pos.z, lamp1Attr.pos.w);
    gl.uniform3f(u_Lamp1Amb,  lamp1Attr.amb.r, lamp1Attr.amb.g, lamp1Attr.amb.b);
    gl.uniform3f(u_Lamp1Diff, lamp1Attr.dif.r, lamp1Attr.dif.g, lamp1Attr.dif.b);
    gl.uniform3f(u_Lamp1Spec, lamp1Attr.spc.r, lamp1Attr.spc.g, lamp1Attr.spc.b);

    draw(gl, currentAngle, mvpMatrix, u_MvpMatrix,
                           modelMatrix, u_ModelMatrix,
                           normalMatrix, u_NormalMatrix,
                           u_Ke, u_Ka, u_Kd, u_Ks);

    requestAnimationFrame(tick, canvas);
  };
  tick();
}

//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
function initVertexBuffer(gl) {

  // Make each 3D shape in its own array of vertices:
  makeSphere();
  makeHeliBody();
  makeBrick();
  makeCylinder();
  makeTorus();
  makeCone();
  makeGroundGrid();

  var vSiz = (sphVerts.length + hlcVerts.length + brkVerts.length + cylVerts.length +
              conVerts.length + torVerts.length + gndVerts.length);            

  var vn = vSiz / floatsPerVertex;
  console.log('vn is', vn, 'vSiz is', vSiz, 'floatsPerVertex is', floatsPerVertex);
  var vertexArray = new Float32Array(vSiz);

  sphStart = 0;
  for(i=0, j=0; j< sphVerts.length; i++, j++) {
    vertexArray[i] = sphVerts[j];
  }
  hlcStart = i;
  for(j=0; j< hlcVerts.length; i++, j++) {
    vertexArray[i] = hlcVerts[j];
  }
  brkStart = i;
  for(j=0; j< brkVerts.length; i++,j++) {
    vertexArray[i] = brkVerts[j];
  }
  cylStart = i;
  for(j=0; j< cylVerts.length; i++,j++) {
    vertexArray[i] = cylVerts[j];
  }
  conStart = i;
  for(j=0; j< conVerts.length; i++,j++) {
    vertexArray[i] = conVerts[j];
  }
  torStart = i;
  for(j=0; j< torVerts.length; i++,j++) {
    vertexArray[i] = torVerts[j];
  }
  gndStart = i;
  for(j=0; j< gndVerts.length; i++, j++) {
    vertexArray[i] = gndVerts[j];
  }

  var nSiz = vSiz;
  var normalArray = new Float32Array(nSiz);
  for(i=0, j=0; j< sphNorms.length; i++, j++) {
    normalArray[i] = sphNorms[j];
  }
  for(j=0; j< hlcNorms.length; i++, j++) {
    normalArray[i] = hlcNorms[j];
  }
  for(j=0; j< brkNorms.length; i++,j++) {
    normalArray[i] = brkNorms[j];
  }
  for(j=0; j< cylNorms.length; i++,j++) {
    normalArray[i] = cylNorms[j];
  }
  for(j=0; j< conNorms.length; i++,j++) {
    normalArray[i] = conNorms[j];
  }
  for(j=0; j< torNorms.length; i++,j++) {
    normalArray[i] = torNorms[j];
  }
  for(j=0; j< gndNorms.length; i++,j++) {
    normalArray[i] = gndNorms[j];
  }

  var iSiz = (sphIndex.length + hlcIndex.length + brkIndex.length);
  console.log('iSiz is', iSiz);
  var indiceArray = new Uint8Array(iSiz);

  sphIStart = 0;
  for(i=0, j=0; j<sphIndex.length; i++, j++) {
    indiceArray[i] = sphIndex[j];
  }
  hlcIStart = i;
  var indexIncr = hlcStart/floatsPerVertex;
  for(j=0; j<hlcIndex.length; i++, j++) {
    indiceArray[i] = hlcIndex[j] + indexIncr;
  }
  brkIStart = i;
  indexIncr = brkStart/floatsPerVertex;
  for(j=0; j<brkIndex.length; i++,j++) {
    indiceArray[i] = brkIndex[j] + indexIncr;
  }

  // We create two separate buffers so that you can modify normals if you wish.
  if (!initArrayBuffer(gl, 'a_Position', vertexArray, gl.FLOAT, 3)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normalArray, gl.FLOAT, 3))  return -1;
  
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indiceArray, gl.STATIC_DRAW);

  return indiceArray.length;
}

function initArrayBuffer(gl, attribute, data, type, num) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

//==============================================================================
// Make the body of helicopter.
function makeHeliBody() {

  hlcVerts = new Float32Array([
    -0.4, 0.6,-0.6,   0.4, 0.6,-0.6,   0.4, 0.0,-0.6,  -0.4, 0.0,-0.6, // v0-v1-v2-v3 back
    -0.4, 0.6,-0.6,  -0.4, 0.6, 0.1,   0.4, 0.6, 0.1,   0.4, 0.6,-0.6, // v0-v8-v7-v1 up
     0.4,-0.3, 0.5,   0.4, 0.0, 0.6,  -0.4, 0.0, 0.6,  -0.4,-0.3, 0.5, // v4-v6-v9-v5 front
     0.4, 0.0, 0.6,   0.4, 0.6, 0.1,  -0.4, 0.6, 0.1,  -0.4, 0.0, 0.6, // v6-v7-v8-v9 front-top
     0.4, 0.0,-0.6,   0.4,-0.3, 0.5,  -0.4,-0.3, 0.5,  -0.4, 0.0,-0.6, // v2-v4-v5-v3 down
     0.4, 0.6,-0.6,   0.4, 0.6, 0.1,   0.4, 0.0, 0.6,   0.4,-0.3, 0.5,   0.4, 0.0,-0.6, // v1-v7-v6-v4-v2 right
    -0.4, 0.6,-0.6,  -0.4, 0.0,-0.6,  -0.4,-0.3, 0.5,  -0.4, 0.0, 0.6,  -0.4, 0.6, 0.1, // v0-v3-v5-v9-v8 left
  ]);

  // Normal
  hlcNorms = new Float32Array([
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,  // v0-v1-v2-v3 back
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v8-v7-v1 up
    0.0,-1.0, 3.0,   0.0,-1.0, 3.0,   0.0,-1.0, 3.0,   0.0,-1.0, 3.0,  // front
    0.0, 5.0, 6.0,   0.0, 5.0, 6.0,   0.0, 5.0, 6.0,   0.0, 5.0, 6.0,  // front-top
    0.0,-1.1, 0.3,   0.0,-1.1, 0.3,   0.0,-1.1, 0.3,   0.0,-1.1, 0.3,  // down
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // v1-v7-v6-v4-v2 right
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v0-v3-v5-v9-v8 left
  ]);

  hlcIndex = new Uint8Array([
    0, 1, 2,   0, 2, 3,               // back
    4, 5, 6,   4, 6, 7,               // top
    8, 9,10,   8,10,11,               // front
   12,13,14,  12,14,15,               // front-top
   16,17,18,  16,18,19,               // bottom
   20,21,22,  20,22,23,  20,23,24,    // right
   25,26,27,  25,27,28,  25,28,29,    // left
  ]);
}

//==============================================================================
// Make a brick from , aligned with Z axis.
function makeBrick() {

  brkVerts = new Float32Array([
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
  ]);

  // Normal
  brkNorms = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);

  // Indices of the vertices
  brkIndex = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);
}

//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
function makeCylinder() {

  var capVerts = 32;    // # of vertices around the topmost 'cap' of the shape
  var botRadius = 1.0;  // radius of bottom of cylinder (top always 1.0)
  
  cylVerts = new Float32Array(((capVerts*6) -2) * floatsPerVertex);
  cylNorms = new Float32Array(((capVerts*6) -2) * floatsPerVertex);

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] = 1.0;
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      cylVerts[j+2] = 1.0;  // z   
    }    
    // Assign norm (0, 0, 1)
    cylNorms[j  ] = 0.0;
    cylNorms[j+1] = 0.0;
    cylNorms[j+2] = 1.0;
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        cylVerts[j+2] = 1.0;  // z

        // Assign norm (cos, sin, 0)
        cylNorms[j  ] = Math.cos(Math.PI*(v)/capVerts);
        cylNorms[j+1] = Math.sin(Math.PI*(v)/capVerts);
        cylNorms[j+2] = 0.0;
    }
    else    // position all odd# vertices along the bottom cap:
    {
        cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        cylVerts[j+2] =-1.0;  // z   

        // Assign norm (cos, sin, 0)
        cylNorms[j  ] = Math.cos(Math.PI*(v-1)/capVerts);
        cylNorms[j+1] = Math.sin(Math.PI*(v-1)/capVerts);
        cylNorms[j+2] = 0.0;
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      cylVerts[j+2] = -1.0;  // z  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      cylVerts[j  ] =  0.0;      // x,y,z,w == 0,0,-1,1
      cylVerts[j+1] =  0.0;  
      cylVerts[j+2] = -1.0;
    }

    // Assign norm (0, 0, -1)
    cylNorms[j  ] =  0.0;
    cylNorms[j+1] =  0.0;
    cylNorms[j+2] = -1.0;
  }
}

function makeCone() {

  var capVerts = 32;    // # of vertices around the topmost 'cap' of the shape
  var botRadius = 0.0;  // radius of bottom of cylinder (top always 1.0)
  
  conVerts = new Float32Array(((capVerts*6) -2) * floatsPerVertex);
  conNorms = new Float32Array(((capVerts*6) -2) * floatsPerVertex);

  // Create circle-shaped top cap of coninder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of coninder's top cap:
      conVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      conVerts[j+1] = 0.0;  
      conVerts[j+2] = 1.0;
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      conVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      conVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      conVerts[j+2] = 1.0;  // z   
    }    
    // Assign norm (0, 0, 1)
    conNorms[j  ] = 0.0;
    conNorms[j+1] = 0.0;
    conNorms[j+2] = 1.0;
  }
  // Create the coninder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        conVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        conVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        conVerts[j+2] = 1.0;  // z

        // Assign norm (cos, sin, 0)
        conNorms[j  ] = Math.cos(Math.PI*(v)/capVerts);
        conNorms[j+1] = Math.sin(Math.PI*(v)/capVerts);
        conNorms[j+2] = 0.0;
    }
    else    // position all odd# vertices along the bottom cap:
    {
        conVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        conVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        conVerts[j+2] =-1.0;  // z   

        // Assign norm (cos, sin, 0)
        conNorms[j  ] = Math.cos(Math.PI*(v-1)/capVerts);
        conNorms[j+1] = Math.sin(Math.PI*(v-1)/capVerts);
        conNorms[j+2] = 0.0;
    }
  }
  // Create the coninder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      conVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      conVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      conVerts[j+2] = -1.0;  // z  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      conVerts[j  ] =  0.0;      // x,y,z,w == 0,0,-1,1
      conVerts[j+1] =  0.0;  
      conVerts[j+2] = -1.0;
    }

    // Assign norm (0, 0, -1)
    conNorms[j  ] =  0.0;
    conNorms[j+1] =  0.0;
    conNorms[j+2] = -1.0;
  }
}


//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.
function makeSphere () {
  var SPHERE_DIV = 13;

  var i, ai, si, ci;
  var j, aj, sj, cj;
  var p1, p2;

  var positions = [];
  var indices = [];

  // Generate coordinates
  for (j = 0; j <= SPHERE_DIV; j++) {
    aj = j * Math.PI / SPHERE_DIV;
    sj = Math.sin(aj);
    cj = Math.cos(aj);
    for (i = 0; i <= SPHERE_DIV; i++) {
      ai = i * 2 * Math.PI / SPHERE_DIV;
      si = Math.sin(ai);
      ci = Math.cos(ai);

      positions.push(si * sj);  // X
      positions.push(cj);       // Y
      positions.push(ci * sj);  // Z
    }
  }

  // Generate indices
  for (j = 0; j < SPHERE_DIV; j++) {
    for (i = 0; i < SPHERE_DIV; i++) {
      p1 = j * (SPHERE_DIV+1) + i;
      p2 = p1 + (SPHERE_DIV+1);

      indices.push(p1);
      indices.push(p2);
      indices.push(p1 + 1);

      indices.push(p1 + 1);
      indices.push(p2);
      indices.push(p2 + 1);
    }
  }

  sphVerts = new Float32Array(positions);
  sphNorms = new Float32Array(positions);
  sphIndex = new Uint16Array(indices);
}

//==============================================================================
//    Create a torus centered at the origin that circles the z axis.  
function makeTorus() {
  var rbend = 1.0;    // Radius of circle formed by torus' bent bar
  var rbar = 0.5;     // radius of the bar we bent to form torus
  var barSlices = 23; // # of bar-segments in the torus: >=3 req'd;
                      // more segments for more-circular torus
  var barSides = 13;  // # of sides of the bar (and thus the 
                      // number of vertices in its cross-section)
                      // >=3 req'd;
                      // more sides for more-circular cross-section

  torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
  torNorms = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));


  var phi=0, theta=0;                   // begin torus at angles 0,0
  var thetaStep = 2*Math.PI/barSlices;  // theta angle between each bar segment
  var phiHalfStep = Math.PI/barSides;   // half-phi angle between each side of bar
                                        // (WHY HALF? 2 vertices per step in phi)
  // s counts slices of the bar; v counts vertices within one slice; j counts
  // array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
  for(s=0,j=0; s<barSlices; s++) {    // for each 'slice' or 'ring' of the torus:
    for(v=0; v< 2*barSides; v++, j+=floatsPerVertex) {    // for each vertex in this slice:
      if(v%2==0)  { // even #'d vertices at bottom of slice,
        torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
                                             Math.cos((s)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
                                             Math.sin((s)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
                //  z = -rbar  *   sin(phi)

        //N_torus = (cos(phi)*cos(theta),  cos(phi)*sin(theta), -sin(phi)
        torNorms[j  ] = Math.cos((v)*phiHalfStep) * Math.cos((s)*thetaStep);
        torNorms[j+1] = Math.cos((v)*phiHalfStep) * Math.sin((s)*thetaStep);
        torNorms[j+2] = Math.sin((v)*phiHalfStep);
      }
      else {        // odd #'d vertices at top of slice (s+1);
                    // at same phi used at bottom of slice (v-1)
        torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
                                             Math.cos((s+1)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
                                             Math.sin((s+1)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
                //  z = -rbar  *   sin(phi)

        torNorms[j  ] = Math.cos((v-1)*phiHalfStep) * Math.cos((s+1)*thetaStep);
        torNorms[j+1] = Math.cos((v-1)*phiHalfStep) * Math.sin((s+1)*thetaStep);
        torNorms[j+2] = Math.sin((v-1)*phiHalfStep);
      }
    }
  }

  // Repeat the 1st 2 vertices of the triangle strip to complete the torus:
  torVerts[j  ] = rbend + rbar; // copy vertex zero;
          //  x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
  torVerts[j+1] = 0.0;
          //  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
  torVerts[j+2] = 0.0;
          //  z = -rbar  *   sin(phi==0)
  torNorms[j  ] = 1.0;
  torNorms[j+1] = 0.0;
  torNorms[j+2] = 0.0;

  j+=floatsPerVertex; // go to next vertex:
  torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
          //  x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
  torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
          //  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
  torVerts[j+2] = 0.0;
          //  z = -rbar  *   sin(phi==0)
  torNorms[j  ] = Math.cos(thetaStep);
  torNorms[j+1] = Math.sin(thetaStep);
  torNorms[j+2] = 0.0;
}

//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
function makeGroundGrid() {

  var xcount = 100;     // # of lines to draw in x,y to make the grid.
  var ycount = 100;   
  var xymax = 50.0;     // grid size; extends to cover +/-xymax in x and y.\
  
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j+2] = -5.0;                  // z
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j+2] = -5.0;                  // z
    }
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j+2] = -5.0;                  // z
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j+2] = -5.0;                  // z
    }
  }
  // Set norm of gnd (0, 0, 1)
  gndNorms = new Float32Array(gndVerts.length);
  for(i=0; i<gndVerts.length; i+=floatsPerVertex) {
    gndNorms[i  ] = 0;
    gndNorms[i+1] = 0;
    gndNorms[i+2] = 1;
  }
}

//==============================================================================
function draw(gl, currentAngle, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix, u_Ke, u_Ka, u_Kd, u_Ks) {
  switch(currentScene) {
    case 0:
      draw0(gl, currentAngle, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix, u_Ke, u_Ka, u_Kd, u_Ks);
      break;
    case 1:
      draw1(gl, currentAngle, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix, u_Ke, u_Ka, u_Kd, u_Ks);
      break;
    default:
      console.log("canvas.js::draw() unknown currentScene #" + currentScene);
      break;
  }
}

//==============================================================================
function draw0(gl, currentAngle, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix, u_Ke, u_Ka, u_Kd, u_Ks) {

  modelMatrix = new Matrix4();

  //--------Draw Sphere
  // Set the Phong materials' reflectance:
  material = new Material(MATL_SILVER_SHINY);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(0.0, -2.0, 0.0); 
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawElements(gl.TRIANGLES, sphIndex.length, gl.UNSIGNED_BYTE, sphIStart);

  mvpMatrix = popMatrix();

  //--------Draw Sphere
  // Set the Phong materials' reflectance:
  var material = new Material(MATL_GOLD_SHINY);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(2.0,-2.0,0.0);
  modelMatrix.scale(0.5,0.5,0.5);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawElements(gl.TRIANGLES, sphIndex.length, gl.UNSIGNED_BYTE, sphIStart);
  mvpMatrix = popMatrix();

  //--------Draw Sphere
  // Set the Phong materials' reflectance:
  material = new Material(MATL_COPPER_SHINY);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(-1.0, 1.0, 0.0);
  modelMatrix.scale(0.4,0.4,0.1);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawElements(gl.TRIANGLES, sphIndex.length, gl.UNSIGNED_BYTE, sphIStart);
  mvpMatrix = popMatrix();
  

  //---------Draw Ground Plane
  // Set the Phong materials' reflectance:
  material = new Material(MATL_GRN_PLASTIC);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  modelMatrix.setScale(0.4, 0.4, 0.4);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawArrays(gl.LINES, gndStart/floatsPerVertex, gndVerts.length/floatsPerVertex);
}

//==============================================================================
function draw1(gl, currentAngle, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix, u_Ke, u_Ka, u_Kd, u_Ks) {

  modelMatrix = new Matrix4();

  //--------Draw Sphere
  // Set the Phong materials' reflectance:
  material = new Material(MATL_RUBY);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(0.0, -3.0, 0.0); 
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawElements(gl.TRIANGLES, sphIndex.length, gl.UNSIGNED_BYTE, sphIStart);

  mvpMatrix = popMatrix();

  //--------Draw Cylinder
  // Set the Phong materials' reflectance:
  var material = new Material(MATL_EMERALD);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(2.5,-1.5,0.0);
  modelMatrix.scale(0.5,0.5,0.5);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);
  mvpMatrix = popMatrix();

  //--------Draw box
  // Set the Phong materials' reflectance:
  material = new Material(MATL_COPPER_SHINY);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(-1.2, 1.0, 0.0);
  modelMatrix.scale(0.5,0.5,0.5);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawElements(gl.TRIANGLES, brkIndex.length, gl.UNSIGNED_BYTE, brkIStart);
  mvpMatrix = popMatrix();

  //--------Draw cone
  // Set the Phong materials' reflectance:
  material = new Material(MATL_OBSIDIAN);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  pushMatrix(mvpMatrix);
  modelMatrix.setTranslate(1.0, -0.5, 0.0);
  modelMatrix.scale(0.3,0.3,-0.3);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawArrays(gl.TRIANGLE_STRIP, conStart/floatsPerVertex, conVerts.length/floatsPerVertex);
  mvpMatrix = popMatrix();

  //---------Draw Ground Plane
  // Set the Phong materials' reflectance:
  material = new Material(MATL_GRN_PLASTIC);
  gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
  gl.uniform3f(u_Ka, material.ambient[0],  material.ambient[1],  material.ambient[2]);
  gl.uniform3f(u_Kd, material.diffuse[0],  material.diffuse[1],  material.diffuse[2]);
  gl.uniform3f(u_Ks, material.specular[0], material.specular[1], material.specular[2]);

  modelMatrix.setScale(0.4, 0.4, 0.4);
  drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  gl.drawArrays(gl.LINES, gndStart/floatsPerVertex, gndVerts.length/floatsPerVertex);
}

function drawSetting(gl, mvpMatrix, u_MvpMatrix, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
  mvpMatrix.multiply(modelMatrix);
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

//==============================================================================
function animate(angle) {
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">
function winResize() {

  var nuCanvas = document.getElementById('webgl');
  var nuGL = getWebGLContext(nuCanvas);

  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight;
}
