var VSHADER_SOURCE = 
  //-------------ATTRIBUTES: of each vertex, read from our Vertex Buffer Object
  'attribute vec4 a_Position; \n' +   // vertex position (model coord sys)
  'attribute vec4 a_Normal; \n' +     // vertex normal vector (model coord sys)
  //'attribute vec4 a_Color;\n' +     // Per-vertex colors? they usually 
                                      // set the Phong diffuse reflectance
  //-------------UNIFORMS: values set from JavaScript before a drawing command.
  'uniform vec3 u_Kd; \n' +
  'uniform mat4 u_MvpMatrix; \n' +
  'uniform mat4 u_ModelMatrix; \n' +
  'uniform mat4 u_NormalMatrix; \n' + 
  
  //-------------VARYING: Vertex Shader values sent per-pixel to Fragment shader.
  'varying vec3 v_Kd; \n' +
  'varying vec4 v_Position; \n' +       
  'varying vec3 v_Normal; \n' +

  'varying vec4 v_Color;\n' +

  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Position = u_ModelMatrix * a_Position; \n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Kd = u_Kd; \n' + 
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  
  // first light source: (YOU write a second one...)
  'uniform vec4 u_Lamp0Pos;\n' +      // Phong Illum: position
  'uniform vec3 u_Lamp0Amb;\n' +      // Phong Illum: ambient
  'uniform vec3 u_Lamp0Diff;\n' +     // Phong Illum: diffuse
  'uniform vec3 u_Lamp0Spec;\n' +     // Phong Illum: specular
  
  // second light source: user adjustable
  'uniform vec4 u_Lamp1Pos;\n' +      // Phong Illum: position
  'uniform vec3 u_Lamp1Amb;\n' +      // Phong Illum: ambient
  'uniform vec3 u_Lamp1Diff;\n' +     // Phong Illum: diffuse
  'uniform vec3 u_Lamp1Spec;\n' +     // Phong Illum: specular

  // first material definition: you write 2nd, 3rd, etc.
  'uniform vec3 u_Ke;\n' +              // Phong Reflectance: emissive
  'uniform vec3 u_Ka;\n' +              // Phong Reflectance: ambient
  'uniform vec3 u_Ks;\n' +              // Phong Reflectance: specular

  'uniform vec4 u_eyePosWorld; \n' +    // Camera/eye location in world coords.
  
  'varying vec3 v_Normal;\n' +        // Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +      // pixel's 3D pos too -- in 'world' coords
  'varying vec3 v_Kd; \n' +           // Find diffuse reflectance K_d per pixel

  'void main() { \n' +
  '  vec3 normal = normalize(v_Normal); \n' +
  '  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
  '  vec3 light0Direction = normalize(u_Lamp0Pos.xyz - v_Position.xyz);\n' +
  '  float nDotL0 = max(dot(light0Direction, normal), 0.0); \n' +
  '  vec3 H0 = normalize(light0Direction + eyeDirection); \n' +
  '  float nDotH0 = max(dot(H0, normal), 0.0); \n' +

  '  vec3 light1Direction = normalize(u_Lamp1Pos.xyz - v_Position.xyz);\n' +
  '  float nDotL1 = max(dot(light1Direction, normal), 0.0); \n' +
  '  vec3 H1 = normalize(light1Direction + eyeDirection); \n' +
  '  float nDotH1 = max(dot(H1, normal), 0.0); \n' +

  '  float e020 = nDotH0*nDotH0; \n' +
  '  float e040 = e020*e020; \n' +
  '  float e080 = e040*e040; \n' +
  '  float e160 = e080*e080; \n' +
  '  float e320 = e160*e160; \n' +
  '  float e640 = e320*e320; \n' +

  '  float e021 = nDotH1*nDotH1; \n' +
  '  float e041 = e021*e021; \n' +
  '  float e081 = e041*e041; \n' +
  '  float e161 = e081*e081; \n' +
  '  float e321 = e161*e161; \n' +
  '  float e641 = e321*e321; \n' +

  '  vec3 emissive = u_Ke;' +
  '  vec3 ambient = (u_Lamp0Amb + u_Lamp1Amb) * u_Ka;\n' +
  '  vec3 diffuse = (u_Lamp0Diff * nDotL0 + u_Lamp1Diff * nDotL1) * v_Kd;\n' +
  '  vec3 speculr = (u_Lamp0Spec * e640 * e640 + u_Lamp1Spec * e641 * e641) * u_Ks;\n' +
  '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '}\n';

var TRACER_VSHADER =
	// 'uniform   mat4 u_VpMatrix; \n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec2 a_TexCoord;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'  gl_Position = a_Position;\n' +
	'  v_TexCoord = a_TexCoord;\n' +
	'}\n';

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
