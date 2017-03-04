function SceneManager(canvas) {
    if (!canvas || !getWebGLContext(canvas)) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    var gl = getWebGLContext(canvas);

    var u_eyePosWorld;
    var uniformMatrices;
    var uniformLamp0, uniformLamp1;
    var phongReflactance;
    var currentRotationAngle = 0.0;

    var models = {};
    var verticesArrayBuffer, normalVectorsArrayBuffer, indiceArrayBuffer;

    console.log('view port size:' + gl.drawingBufferWidth + ' ' + gl.drawingBufferHeight);
    var onScreenAspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;

    this.start = function () {

        if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
            console.log('Failed to intialize shaders.');
            return;
        }

        if (initVertexBuffer(gl) < 0) {
            console.log('Failed to set the vertex information');
            return;
        }

        // Set the clear color and enable the depth test
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        getShaderVariableLocation();
        if (failGetShaderVariableLocation([u_eyePosWorld, uniformMatrices, uniformLamp0, uniformLamp1, phongReflactance])) {
            return;
        }

        var modelMatrix = new Matrix4();  // Model matrix
        var mvpMatrix = new Matrix4();    // Model view projection matrix
        var normalMatrix = new Matrix4(); // Transformation matrix for normals

        // Start drawing: create 'tick' variable whose value is this function:
        var tick = function () {

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Create viewport
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

            // For this viewport, set camera's eye point and the viewing volume:
            mvpMatrix.setFrustum(-0.6, 0.6, -0.9, 0.3, 1.0, 100);
            mvpMatrix.lookAt( LOOK_AT[0][0], LOOK_AT[0][1], LOOK_AT[0][2],
                              LOOK_AT[1][0], LOOK_AT[1][1], LOOK_AT[0][2],
                              0.0, 0.0, 1.0);

            // Pass the eye position to u_eyePosWorld
            gl.uniform4f(u_eyePosWorld, LOOK_AT[0][0], LOOK_AT[0][1], LOOK_AT[0][2], 1);

            uniformLamp0.setAttributes(LAMP0);
            uniformLamp1.setAttributes(LAMP1);

            currentRotationAngle = animate(currentRotationAngle);
            draw(mvpMatrix, modelMatrix, normalMatrix);

            requestAnimationFrame(tick, canvas);
        };
        tick();
    }

    // Create one vertex buffer object (VBO) that holds all vertices for all shapes.
    function initVertexBuffer() {
        models[SPHERE] = new Sphere();
        models[HELICOPTERBODY] = new HelicopterBody();
        models[BRICK] = new Brick();
        models[CYLINDER] = new Cylinder();
        models[TORUS] = new Torus();
        models[GROUNDGRID] = new GroundGrid();

        var vSiz = Object.keys(models).reduce((result, key) => result + models[key].getVertices().length, 0);

        console.log('Number of vertices is', vSiz / floatsPerVertex, ', point per vertex is', floatsPerVertex);

        verticesArrayBuffer = new ArrayBufferFloat32Array(vSiz);
        Object.keys(models).map(key => verticesArrayBuffer.appendObject(key, models[key].getVertices()));

        var nSiz = vSiz;
        normalVectorsArrayBuffer = new ArrayBufferFloat32Array(nSiz);
        Object.keys(models).map(key => normalVectorsArrayBuffer.appendObject(key, models[key].getNormalVectors()));

        var modelIndices = [models[SPHERE], models[HELICOPTERBODY], models[BRICK]]
            .reduce((array, m) => {
                array.push(m.getVerticesIndices());
                return array;
            }, []);
        var iSiz = modelIndices.reduce((result, mi) => result + mi.length, 0);
        console.log('iSiz is', iSiz);

        indiceArrayBuffer = new ArrayBufferUint8Array(iSiz);
        var hlcIndexIncr = verticesArrayBuffer.getObjectStartPosition(HELICOPTERBODY) / floatsPerVertex;
        var brkIndexIncr = verticesArrayBuffer.getObjectStartPosition(BRICK) / floatsPerVertex;
        indiceArrayBuffer.appendObject(SPHERE, modelIndices[0]);
        indiceArrayBuffer.appendObject(HELICOPTERBODY,
            modelIndices[1].map(idx => idx + hlcIndexIncr));
        indiceArrayBuffer.appendObject(BRICK,
            modelIndices[2].map(idx => idx + brkIndexIncr));

        // We create two separate buffers so that you can modify normals if you wish.
        if (!initGLArrayBuffer('a_Position', verticesArrayBuffer.getArray(), gl.FLOAT, floatsPerVertex)) return -1;
        if (!initGLArrayBuffer('a_Normal', normalVectorsArrayBuffer.getArray(), gl.FLOAT, floatsPerVertex)) return -1;

        // Unbind the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Write the indices to the buffer object
        var indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indiceArrayBuffer.getArray(), gl.STATIC_DRAW);

        return indiceArrayBuffer.getArray().length;
    }

    function initGLArrayBuffer(attribute, data, type, num) {
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

    function getShaderVariableLocation() {
        u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
        uniformMatrices = {
            model: gl.getUniformLocation(gl.program, 'u_ModelMatrix'),
            mvp: gl.getUniformLocation(gl.program, 'u_MvpMatrix'),
            normal: gl.getUniformLocation(gl.program, 'u_NormalMatrix'),

            drawSetting: function (mvpMatrix, modelMatrix, normalMatrix) {
                mvpMatrix.multiply(modelMatrix);
                normalMatrix.setInverseOf(modelMatrix);
                normalMatrix.transpose();
                gl.uniformMatrix4fv(this.model, false, modelMatrix.elements);
                gl.uniformMatrix4fv(this.mvp, false, mvpMatrix.elements);
                gl.uniformMatrix4fv(this.normal, false, normalMatrix.elements);
            }
        }

        uniformLamp0 = {
            pos: gl.getUniformLocation(gl.program, 'u_Lamp0Pos'),
            amb: gl.getUniformLocation(gl.program, 'u_Lamp0Amb'),
            dif: gl.getUniformLocation(gl.program, 'u_Lamp0Diff'),
            spc: gl.getUniformLocation(gl.program, 'u_Lamp0Spec'),

            setAttributes: function (attributes) {
                gl.uniform4f(this.pos, attributes.pos.x, attributes.pos.y, attributes.pos.z, attributes.pos.w);
                gl.uniform3f(this.amb, attributes.amb.r, attributes.amb.g, attributes.amb.b);
                gl.uniform3f(this.dif, attributes.dif.r, attributes.dif.g, attributes.dif.b);
                gl.uniform3f(this.spc, attributes.spc.r, attributes.spc.g, attributes.spc.b);
            }
        };

        uniformLamp1 = {
            pos: gl.getUniformLocation(gl.program, 'u_Lamp1Pos'),
            amb: gl.getUniformLocation(gl.program, 'u_Lamp1Amb'),
            dif: gl.getUniformLocation(gl.program, 'u_Lamp1Diff'),
            spc: gl.getUniformLocation(gl.program, 'u_Lamp1Spec'),

            setAttributes: function (attributes) {
                gl.uniform4f(this.pos, attributes.pos.x, attributes.pos.y, attributes.pos.z, attributes.pos.w);
                gl.uniform3f(this.amb, attributes.amb.r, attributes.amb.g, attributes.amb.b);
                gl.uniform3f(this.dif, attributes.dif.r, attributes.dif.g, attributes.dif.b);
                gl.uniform3f(this.spc, attributes.spc.r, attributes.spc.g, attributes.spc.b);
            }
        };

        phongReflactance = {
            Ke: gl.getUniformLocation(gl.program, 'u_Ke'),
            Ka: gl.getUniformLocation(gl.program, 'u_Ka'),
            Kd: gl.getUniformLocation(gl.program, 'u_Kd'),
            Ks: gl.getUniformLocation(gl.program, 'u_Ks'),

            setDrawMaterial: function (material) {
                gl.uniform3f(this.Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
                gl.uniform3f(this.Ka, material.ambient[0], material.ambient[1], material.ambient[2]);
                gl.uniform3f(this.Kd, material.diffuse[0], material.diffuse[1], material.diffuse[2]);
                gl.uniform3f(this.Ks, material.specular[0], material.specular[1], material.specular[2]);
            }
        };
    }

    function failGetShaderVariableLocation(shaderVariables) {
        return shaderVariables.some(variable =>
            Object.keys(variable).some(e => {
                if (!variable[e]) {
                    console.log('Failed to get ' + e + ' locations');
                    return true;
                }
            }));
    }

    function draw(mvpMatrix, modelMatrix, normalMatrix) {
        switch(currentScene) {
            case 0:
                draw0(mvpMatrix, modelMatrix, normalMatrix);
            break;
            case 1:
                draw1(mvpMatrix, modelMatrix, normalMatrix);
            break;
            default:
                console.log("canvas.js::draw() unknown currentScene #" + currentScene);
            break;
        }
    }

    function draw0(mvpMatrix, modelMatrix, normalMatrix) {

        modelMatrix = new Matrix4();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_SILVER_SHINY));
        modelMatrix.setTranslate(0.0, -2.0, 0.0); 
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_GOLD_SHINY));
        modelMatrix.setTranslate(2.0,-2.0,0.0);
        modelMatrix.scale(0.5,0.5,0.5);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_COPPER_SHINY));
        modelMatrix.setTranslate(-1.0, 1.0, 0.0);
        modelMatrix.scale(0.4,0.4,0.1);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();
 
        modelMatrix.setScale(0.4, 0.4, 0.4);
        phongReflactance.setDrawMaterial(new Material(MATL_GRN_PLASTIC));
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawGroundGrid();
    }

    function draw1(mvpMatrix, modelMatrix, normalMatrix) {

        modelMatrix = new Matrix4();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_RUBY));
        modelMatrix.setTranslate(0.0, -3.0, 0.0); 
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_EMERALD));
        modelMatrix.setTranslate(2.5,-1.5,0.0);
        modelMatrix.scale(0.5,0.5,0.5);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_COPPER_SHINY));
        modelMatrix.setTranslate(-1.2, 1.0, 0.0);
        modelMatrix.scale(0.5,0.5,0.5);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawBrick(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        pushMatrix(mvpMatrix);
        phongReflactance.setDrawMaterial(new Material(MATL_OBSIDIAN));
        modelMatrix.setTranslate(1.0, -0.5, 0.0);
        modelMatrix.scale(0.3,0.3,-0.3);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder(mvpMatrix, modelMatrix, normalMatrix);
        mvpMatrix = popMatrix();

        modelMatrix.setScale(0.4, 0.4, 0.4);
        phongReflactance.setDrawMaterial(new Material(MATL_GRN_PLASTIC));
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawGroundGrid();
    }

    function drawHelicopter(mvpMatrix, modelMatrix, normalMatrix) {

        pushMatrix(mvpMatrix);

        //Draw body
        modelMatrix.setTranslate(1.0, 0.5, 1.3);
        modelMatrix.scale(1, 1, -1);
        modelMatrix.scale(0.4, 0.4, 0.4);
        modelMatrix.rotate(currentRotationAngle, 0, 0.7, 1);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawHelicopterBody();

        mvpMatrix = popMatrix();
        pushMatrix(modelMatrix);
        pushMatrix(modelMatrix);
        pushMatrix(mvpMatrix);

        // draw back bone
        modelMatrix.translate(0, 0.3, -1.2);
        modelMatrix.scale(0.1, 0.1, 0.6);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder();

        mvpMatrix = popMatrix();
        modelMatrix = popMatrix();
        pushMatrix(mvpMatrix);

        // draw spinning torus
        modelMatrix.rotate(90.0, 0, 1, 0);
        modelMatrix.translate(1.7, 0.3, 0.15);
        modelMatrix.scale(0.1, 0.1, 0.1);
        modelMatrix.rotate(currentRotationAngle * 2, 0, 0, 1);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawTorus();

        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);
        pushMatrix(modelMatrix);

        // draw two paddle
        modelMatrix.translate(2.3, 0, 0);
        modelMatrix.scale(1.8, 0.4, 0.4);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawBrick();

        modelMatrix = popMatrix();
        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);

        modelMatrix.translate(-2.3, 0, 0);
        modelMatrix.scale(1.8, 0.4, 0.4);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawBrick();

        mvpMatrix = popMatrix();
        modelMatrix = popMatrix();    // pop the matrix stored after drawing body
        pushMatrix(mvpMatrix);

        // draw upper bone
        modelMatrix.rotate(90.0, 1, 0, 0);
        modelMatrix.scale(0.1, 0.1, 0.1);
        modelMatrix.translate(0, -2, -7);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder();

        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);

        // draw spinning torus
        modelMatrix.translate(0, 0, -1);
        modelMatrix.rotate(currentRotationAngle * 2, 0, 0, 1);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawTorus();

        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);
        pushMatrix(modelMatrix);

        // draw two paddle
        modelMatrix.translate(5.5, 0, 0);
        modelMatrix.scale(5, 0.4, 0.4);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawBrick();

        modelMatrix = popMatrix();
        mvpMatrix = popMatrix();

        modelMatrix.translate(-5.5, 0, 0);
        modelMatrix.scale(5, 0.4, 0.4);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawBrick();
    }

    function drawSphereCone(mvpMatrix, modelMatrix, normalMatrix) {

        pushMatrix(mvpMatrix);

        // draw a sphere
        modelMatrix.setTranslate(1.9, 1.9, 1.0);
        modelMatrix.scale(1, 1, -1); // convert to left-handed coord sys to match WebGL display canvas.
        modelMatrix.scale(0.2, 0.2, 0.2);
        modelMatrix.rotate(currentRotationAngle, 1, 0.7, 0);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere();

        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);

        // draw cylinder3 on cylinder2
        modelMatrix.translate(0, 0, 2 + 2 * Math.abs(Math.cos(Math.PI * currentRotationAngle / 180)));
        modelMatrix.scale(0.8, 0.8, 0.8);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder();

        mvpMatrix = popMatrix();

        // draw rod from cylinder
        modelMatrix.rotate(90.0, -90.0, 0, 1);
        modelMatrix.translate(0, 0, 2);
        modelMatrix.scale(0.3, 0.3, 2);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawCylinder();
    }

    function drawSnowMan(mvpMatrix, modelMatrix, normalMatrix) {

        pushMatrix(mvpMatrix);

        // draw a sphere
        modelMatrix.setTranslate(2.0, 0.2, 0.3);
        modelMatrix.scale(1, 1, -1); // convert to left-handed coord sys to match WebGL display canvas.
        modelMatrix.scale(0.3, 0.3, 0.3);
        modelMatrix.rotate(180, 0, 1, 0);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere();

        mvpMatrix = popMatrix();
        pushMatrix(mvpMatrix);

        // draw a sphere
        modelMatrix.translate(0, 0, 1.3);
        modelMatrix.scale(0.6, 0.6, 0.6);
        modelMatrix.translate(0.5 * Math.sin(Math.PI * currentRotationAngle / 180), 0, 0);
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere();

        mvpMatrix = popMatrix();

        // draw a sphere
        modelMatrix.translate(0, 0, 1.3);
        modelMatrix.scale(0.8, 0.8, 0.6 + 0.2 * Math.cos(Math.PI * currentRotationAngle / 180));
        uniformMatrices.drawSetting(mvpMatrix, modelMatrix, normalMatrix);
        drawSphere();
    }

    function drawHelicopterBody() {
        glDrawTriangles(HELICOPTERBODY);
    }

    function drawBrick() {
        glDrawTriangles(BRICK);
    }

    function drawCylinder() {
        glDrawTriangleStrip(CYLINDER);
    }

    function drawSphere() {
        glDrawTriangles(SPHERE);
    }

    function drawTorus() {
        glDrawTriangleStrip(TORUS);
    }

    function drawGroundGrid() {
        var indicesStart = verticesArrayBuffer.getObjectStartPosition(GROUNDGRID) / floatsPerVertex;
        var indicesLength = verticesArrayBuffer.getObjectLength(GROUNDGRID) / floatsPerVertex;
        gl.drawArrays(gl.LINES, indicesStart , indicesLength);
    }

    function glDrawTriangles(modelName) {
        var indicesStart = indiceArrayBuffer.getObjectStartPosition(modelName);
        var indicesLength = indiceArrayBuffer.getObjectLength(modelName);
        gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_BYTE, indicesStart);
    }

    function glDrawTriangleStrip(modelName) {
        var indicesStart = verticesArrayBuffer.getObjectStartPosition(modelName) / floatsPerVertex;
        var indicesLength = verticesArrayBuffer.getObjectLength(modelName) / floatsPerVertex;
        gl.drawArrays(gl.TRIANGLE_STRIP, indicesStart , indicesLength);
    }
}
