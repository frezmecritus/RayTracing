function BasicShape() {}

BasicShape.prototype.getVertices = function() {
    return this.vertices;
}

BasicShape.prototype.getNormalVectors = function() {
    return this.normalVectors;
}

BasicShape.prototype.getVerticesIndices = function() {
    return this.verticesIndices;
}

/**
 * A brick shape aligned with Z axis.
 */
Brick.prototype = Object.create(BasicShape.prototype);
Brick.prototype.constructor = Brick;
function Brick() {
    this.vertices = new Float32Array([
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
    ]);

    this.normalVectors = new Float32Array([
     0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
    ]);

    this.verticesIndices = new Uint8Array([
      0, 1, 2,   0, 2, 3,    // front
      4, 5, 6,   4, 6, 7,    // right
      8, 9,10,   8,10,11,    // up
     12,13,14,  12,14,15,    // left
     16,17,18,  16,18,19,    // down
     20,21,22,  20,22,23     // back
    ]);
}

/**
 * The body of a helicoptor, aligned with Z axis.
 */
HelicopterBody.prototype = Object.create(BasicShape.prototype);
HelicopterBody.prototype.constructor = HelicopterBody;
function HelicopterBody() {
    this.vertices = new Float32Array([
     -0.4, 0.6,-0.6,   0.4, 0.6,-0.6,   0.4, 0.0,-0.6,  -0.4, 0.0,-0.6, // v0-v1-v2-v3 back
     -0.4, 0.6,-0.6,  -0.4, 0.6, 0.1,   0.4, 0.6, 0.1,   0.4, 0.6,-0.6, // v0-v8-v7-v1 up
      0.4,-0.3, 0.5,   0.4, 0.0, 0.6,  -0.4, 0.0, 0.6,  -0.4,-0.3, 0.5, // v4-v6-v9-v5 front
      0.4, 0.0, 0.6,   0.4, 0.6, 0.1,  -0.4, 0.6, 0.1,  -0.4, 0.0, 0.6, // v6-v7-v8-v9 front-top
      0.4, 0.0,-0.6,   0.4,-0.3, 0.5,  -0.4,-0.3, 0.5,  -0.4, 0.0,-0.6, // v2-v4-v5-v3 down
      0.4, 0.6,-0.6,   0.4, 0.6, 0.1,   0.4, 0.0, 0.6,   0.4,-0.3, 0.5,   0.4, 0.0,-0.6, // v1-v7-v6-v4-v2 right
     -0.4, 0.6,-0.6,  -0.4, 0.0,-0.6,  -0.4,-0.3, 0.5,  -0.4, 0.0, 0.6,  -0.4, 0.6, 0.1, // v0-v3-v5-v9-v8 left
    ]);

    this.normalVectors = new Float32Array([
     0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,  // v0-v1-v2-v3 back
     0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v8-v7-v1 up
     0.0,-1.0, 3.0,   0.0,-1.0, 3.0,   0.0,-1.0, 3.0,   0.0,-1.0, 3.0,  // front
     0.0, 5.0, 6.0,   0.0, 5.0, 6.0,   0.0, 5.0, 6.0,   0.0, 5.0, 6.0,  // front-top
     0.0,-1.1, 0.3,   0.0,-1.1, 0.3,   0.0,-1.1, 0.3,   0.0,-1.1, 0.3,  // down
     1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // v1-v7-v6-v4-v2 right
    -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v0-v3-v5-v9-v8 left
    ]);

    this.verticesIndices = new Uint8Array([
     0, 1, 2,   0, 2, 3,               // back
     4, 5, 6,   4, 6, 7,               // top
     8, 9,10,   8,10,11,               // front
    12,13,14,  12,14,15,               // front-top
    16,17,18,  16,18,19,               // bottom
    20,21,22,  20,22,23,  20,23,24,    // right
    25,26,27,  25,27,28,  25,28,29,    // left
    ]);
}

/**
 *  Make a sphere from one OpenGL TRIANGLE_STRIP primitive.
 */
Sphere.prototype = Object.create(BasicShape.prototype);
Sphere.prototype.constructor = Sphere;
function Sphere() {
    var numberOfDivision = 13;
    var anglePerDivision = Math.PI / numberOfDivision;

    var positions = [];
    var theta = [], phi = [];

    [...Array(numberOfDivision+1).keys()].map(function(i){
        phi.push( i * anglePerDivision );
        theta.push( 2 * i * anglePerDivision );
    });

    phi.map(function(p){
        theta.map(function(t){
            var cosTheta = Math.cos(t);
            var sinTheta = Math.sin(t);
            var cosPhi = Math.cos(p);
            var sinPhi = Math.sin(p);
            positions.push( sinPhi * sinTheta); // X
            positions.push( cosPhi );           // Y
            positions.push( sinPhi * cosTheta); // Z
        });
    });

    var indices = [];
    for (j = 0; j < numberOfDivision; j++) {
        for (i = 0; i < numberOfDivision; i++) {
        var p1 = j * (numberOfDivision+1) + i;
        var p2 = p1 + (numberOfDivision+1);

        indices.push(p1);
        indices.push(p2);
        indices.push(p1 + 1);

        indices.push(p1 + 1);
        indices.push(p2);
        indices.push(p2 + 1);
        }
    }

  this.vertices = new Float32Array(positions);
  this.normalVectors = new Float32Array(positions);
  this.verticesIndices = new Uint8Array(indices);
}

/**
 * Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
 *  'stepped spiral' design described in notes.
 * Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
 */
Cylinder.prototype = Object.create(BasicShape.prototype);
Cylinder.prototype.constructor = Cylinder;
function Cylinder() {
    var capVerts = 32;    // # of vertices around the topmost 'cap' of the shape
    var botRadius = 1.0;  // radius of bottom of cylinder (top always 1.0)

    var cylVerts = [];
    var cylNorms = [];

    // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
    // v counts vertices: j counts array elements (vertices * elements per vertex)
    for(var v=1; v<=2*capVerts+1; v++) {
        // skip the first vertex--not needed.
        if(v%2==0) {       
            // position even# vertices at center of cylinder's top cap:
            cylVerts.push(0.0, 0.0, 1.0);
        } else {  
            // position odd# vertices around the top cap's outer edge;
            // theta = 2*PI*(v-1)/(2*capVerts) = PI*(v-1)/capVerts
            var theta = Math.PI*(v-1)/capVerts;
            cylVerts.push(Math.cos(theta), Math.sin(theta), 1.0);
        }
        cylNorms.push(0.0, 0.0, 1.0);
    }
    // Create the cylinder side walls, made of 2*capVerts vertices.
    // v counts vertices within the wall; j continues to count array elements
    for(var v=0; v<=2*capVerts+1; v++) {
        if(v%2==0) { 
            // position all even# vertices along top cap:
            var theta = Math.PI*(v)/capVerts;
            cylVerts.push(Math.cos(theta), Math.sin(theta), 1.0);
            cylNorms.push(Math.cos(theta), Math.sin(theta), 0.0);
        } else {   
            // position all odd# vertices along the bottom cap:
            var theta = Math.PI*(v-1)/capVerts;
            cylVerts.push(botRadius*Math.cos(theta), botRadius*Math.sin(theta), -1.0);
            cylNorms.push(Math.cos(theta), Math.sin(theta), 0.0);
        }
    }
    // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
    // v counts the vertices in the cap; j continues to count array elements
    for(var v=0; v<=2*capVerts; v++) {
        if(v%2==0) {  
            // position even# vertices around bot cap's outer edge
            var theta = Math.PI*(v)/capVerts;
            cylVerts.push(botRadius*Math.cos(theta), botRadius*Math.sin(theta), -1.0);
        } else {        
            // position odd# vertices at center of the bottom cap:
            cylVerts.push(0.0, 0.0, -1.0);
        }
        cylNorms.push(0.0, 0.0, -1.0);
    }

    this.vertices = new Float32Array(cylVerts);
    this.normalVectors = new Float32Array(cylNorms);
}
Cylinder.prototype.getVerticesIndices = function(){};

/**
 * Create a torus, formed by bars, centered at the origin that circles the z axis.
 */
Torus.prototype = Object.create(BasicShape.prototype);
Torus.prototype.constructor = Torus;
function Torus() {
    var rbend = 1.0;       // Radius of circle formed by torus' bent bar
    var rbar = 0.5;        // radius of the bar we bent to form torus
    var numberOfBars = 23; // >=3 req'd; more segments for more-circular torus
    var sidesOfBars = 13;  // the number of vertices in its cross-section
                           // >=3 req'd; more sides for more-circular cross-section
    var torVerts = [];
    var torNorms = [];

    var thetaStep = 2*Math.PI/numberOfBars;  // theta angle between each bar segment
    var phiHalfStep = Math.PI/sidesOfBars;   // half-phi angle between each side of bar
                                             // (WHY HALF? 2 vertices per step in phi)

    for(var s=0; s<numberOfBars; s++) {
        for(var v=0; v< 2*sidesOfBars; v++) {
            // even# vertices at bottom of slice;
            // odd# vertices at top of slice (s+1),
            //   at same phi used at bottom of slice (v-1)
            var phi = (v%2==0) ? v*phiHalfStep : (v-1)*phiHalfStep;
            var theta = (v%2==0) ? s*thetaStep : (s+1)*thetaStep;

            torVerts.push((rbend + rbar*Math.cos(phi)) * Math.cos(theta),
                          (rbend + rbar*Math.cos(phi)) * Math.sin(theta),
                          -rbar*Math.sin(phi));

            torNorms.push(Math.cos(phi) * Math.cos(theta),
                          Math.cos(phi) * Math.sin(theta),
                          Math.sin(phi));
        }
    }

    // Repeat the 1st 2 vertices of the triangle strip to complete the torus: 
    // (phi, theta) == (0, 0)
    torVerts.push(rbend + rbar, 0.0, 0.0);
    torNorms.push(1.0, 0.0, 0.0);

    //  (phi, theta) == (0, thetaStep)
    torVerts.push((rbend + rbar) * Math.cos(thetaStep),
                  (rbend + rbar) * Math.sin(thetaStep),
                  0.0);
    torNorms.push(Math.cos(thetaStep), Math.sin(thetaStep), 0.0);

    this.vertices = new Float32Array(torVerts);
    this.normalVectors = new Float32Array(torNorms);
}
Torus.prototype.getVerticesIndices = function(){};

/**
 * Create a list of vertices that create a large grid of lines in the x,y plane
 * centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
 * Draw a grid made of lines, 2 vertices per line.
 */
GroundGrid.prototype = Object.create(BasicShape.prototype);
GroundGrid.prototype.constructor = GroundGrid;
function GroundGrid() {
    var numberOfLinesAlongYAxis = 100;
    var numberOfLinesAlongXAxis = 100;
    var maxDistanceFromOrigin = 50.0;  // grid size; extends to cover +/-xymax in x and y.

    var gndVerts = [];

    // HALF-spacing between lines in x,y; (why half? because v==(line number*2)
    var xgap = maxDistanceFromOrigin/(numberOfLinesAlongYAxis-1);
    var ygap = maxDistanceFromOrigin/(numberOfLinesAlongXAxis-1);

    [...Array(2*(numberOfLinesAlongYAxis)).keys()].map(function(v){
        var xnow = (v%2==0) ? -maxDistanceFromOrigin+(v)*xgap : -maxDistanceFromOrigin+(v-1)*xgap;
        var ynow = (v%2==0) ? -maxDistanceFromOrigin : maxDistanceFromOrigin;
        gndVerts.push(xnow, ynow, 0.0);
    });

    [...Array(2*(numberOfLinesAlongXAxis)).keys()].map(function(v){
        var xnow = (v%2==0) ? -maxDistanceFromOrigin : maxDistanceFromOrigin;
        var ynow = (v%2==0) ? -maxDistanceFromOrigin+(v)*ygap : -maxDistanceFromOrigin+(v-1)*ygap;
        gndVerts.push(xnow, ynow, 0.0);
    });

    var gndNorms = [];
    [...Array(2*(numberOfLinesAlongYAxis+numberOfLinesAlongXAxis))].map(function(){
        gndNorms.push(0.0, 0.0, 1.0);
    });

    this.vertices = new Float32Array(gndVerts);
    this.normalVectors = new Float32Array(gndNorms);
}
GroundGrid.prototype.getVerticesIndices = function(){};

if(typeof exports !== 'undefined') {
    module.exports = {Brick, HelicopterBody, Sphere, Cylinder, Torus, GroundGrid};
}
