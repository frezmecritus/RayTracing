
const LAMP_POINT      = 0;	// point-source light, (Phong lighting)
const LAMP_SPOT       = 1;	// spot-light with exponential falloff.
const LAMP_ENVIR_MAP  = 2;	// Environment Map; any ray that hits no surface
														// will get color that depends on direction,
														// taken from a 'box-cube' image. Good for
														// chrome and glass.  As a start on global
														// illumination, consider how you might replace
														// 'ambient' illumination with an average of the
														// visible parts of the environment map...
const LAMP_TEXTURE    = 3;	// emits light whose color varies with direction
														// according to a texture map image.

//==============================================================================
// A generic class for a light source. Each instance describes just one light
// source, but you can select from several different kinds by setting the value
// of 'lightType'.  CLight can describe ANY light, including point-light,
// spot-light, area light, shaped-light (e.g. sphere light), etc. and holds
// all/any variables needed for each type.
function CLight() {

	var isAlive;              // true/false to enable/disable this light src.

	var lightType;             // light source type selector;JT_LAMP_POINT, etc.
	var pos;                  // Light position (specifies x,y,z,w; set w=1 for
														 // local lighting, w=0 for light source @ infinity.
	// Phong Lighting:
	var I_a;                  // Ambient illumination color (Phong shading)
	var I_d;                  // Diffuse illumination color
	var I_s;                  // Specular illumination color

	//	bool exists(void){return isAlive;};   // report the value of isAlive.
	//	void create(void){isAlive=true;};     // material exists/doesn't exist.
	//	void destroy(void){isAlive=false;};
};