var floatsPerVertex = 3;

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);  // 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();       // rotation matrix, made from latest qTot

// String for custom ArrayBuffer's GET and SET action.
var BRICK = 'brick';
var SPHERE = 'sphere';
var CYLINDER = 'cylinder';
var HELICOPTERBODY = 'Helicopter_body';
var TORUS = 'torus';
var GROUNDGRID = 'ground_grid';

var ANGLE_STEP = 45.0;

var currentScene = 0;							// 0: 3 spheres, 1: sph, cyl, box, (cone)

var g_EyeX = 6, g_EyeY = -2, g_EyeZ = 3;
var g_centerX = 0, g_centerY = 0, g_centerZ = 0;
var g_upX = 0, g_upY = 0, g_upZ = 1;
var g_near = 1, g_far = 50;

var LOOK_AT = [
	vec4.fromValues( 0.0, 3.0,  1.0, 1.0),		// eye
	vec4.fromValues( 0.0, 0.0, -1.0, 1.0), 		// center
	vec4.fromValues( 0.0, 0.0, -1.0, 0.0),		// up
	{theta: 270.0, phi: 0.0, tilt: 0.0}
];

var LAMP0 = {
  pos: {x: LOOK_AT[0][0], y: LOOK_AT[0][1], z: LOOK_AT[0][2], w: 1.0},
  amb: {r: 0.4, g: 0.4, b: 0.4},
  dif: {r: 0.7, g: 0.7, b: 0.7},
  spc: {r: 0.7, g: 0.7, b: 0.7}
};

var LAMP1 = {
  pos: {x: 0.0, y: 3.0, z: 2.0, w: 1.0},
  amb: {r: 0.1, g: 0.2, b: 0.2},
  dif: {r: 0.4, g: 0.5, b: 0.6},
  spc: {r: 0.4, g: 0.3, b: 0.5}
};

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function main() {
    var canvas = document.getElementById('webgl');

    // winResize();
    // GLstart(canvas);
    var sceneManager = new SceneManager(canvas);
    sceneManager.start();

    main2();
    
    // Register the Mouse & Keyboard Event-handlers-------------------------------
    //canvas.onmousedown = function(ev){myMouseDown( ev, gl, canvas) };
    //canvas.onmousemove = function(ev){myMouseMove( ev, gl, canvas) };
    //canvas.onmouseup   = function(ev){myMouseUp(   ev, gl, canvas) };
    window.addEventListener("keypress", myKeyPress);
}

// web initialization
$( function() {
  // $('#lighting_panel').hide();
  lampPosUpdate();
  $( "input" )
    .keyup(function() {
      var value = $( this ).val();
      var name  = $( this ).attr('id');

      if(!isNaN(value)) {
        arr = name.split("_");
        LAMP1[ arr[1] ][ arr[2] ] = value;
      }
      lampPosUpdate();
    })
    .keyup();
});

function lampPosUpdate(lampNumber) {
    $('#lamp0_pos_x').val(LAMP0.pos.x);
    $('#lamp0_pos_y').val(LAMP0.pos.y);
    $('#lamp0_pos_z').val(LAMP0.pos.z);
    $('#lamp1_pos_x').val(LAMP1.pos.x);
    $('#lamp1_pos_y').val(LAMP1.pos.y);
    $('#lamp1_pos_z').val(LAMP1.pos.z);
}

function myKeyDown(ev) {
}

function myKeyUp(ev) {
}

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

	LOOK_AT[1][0] = LOOK_AT[0][0] + 10 * Math.cos(thetaD);
	LOOK_AT[1][1] = LOOK_AT[0][1] + 10 * Math.sin(thetaD);
}

function winResize() {

  var nuCanvas = document.getElementById('raytracing');
  var nuGL = getWebGLContext(nuCanvas);

  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight;
}

function browserResize() {

	var myCanvas = document.getElementById('raytracing');	// get current canvas
	var myGL = getWebGLContext(myCanvas);							// and context:

	console.log('myCanvas width,height=', myCanvas.width, myCanvas.height);
	console.log('Browser window: innerWidth,innerHeight=', innerWidth, innerHeight);

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

function switchLamp0 () {
	if (LAMP0.pos.w==0.0) {// light is off
		LAMP0.pos.w = 1.0;
		LAMP0.amb = {r: 0.4, g: 0.4, b: 0.4};
		LAMP0.dif = {r: 1.0, g: 1.0, b: 1.0};
		LAMP0.spc = {r: 1.0, g: 1.0, b: 1.0};
	}
	else {
		LAMP0.pos.w = 0.0;
		LAMP0.amb.r = LAMP0.amb.g = LAMP0.amb.b = 0.0;
		LAMP0.dif.r = LAMP0.dif.g = LAMP0.dif.b = 0.0;
		LAMP0.spc.r = LAMP0.spc.g = LAMP0.spc.b = 0.0;
	}
}

function switchLamp1 () {
	if (LAMP1.pos.w==0.0) {// light is off
		LAMP1.pos.w = 1.0;
		LAMP1.amb = {r: 0.1, g: 0.2, b: 0.2};
		LAMP1.dif = {r: 0.4, g: 0.5, b: 0.6};
		LAMP1.spc = {r: 0.4, g: 0.3, b: 0.5};
	}
	else {
		LAMP1.pos.w = 0.0;
		LAMP1.amb.r = LAMP1.amb.g = LAMP1.amb.b = 0.0;
		LAMP1.dif.r = LAMP1.dif.g = LAMP1.dif.b = 0.0;
		LAMP1.spc.r = LAMP1.spc.g = LAMP1.spc.b = 0.0;
	}
}
