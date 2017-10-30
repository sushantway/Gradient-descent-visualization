window.onload = function() {
    var gl;
    var mouseHist = {
        dragging: false,
        lastPosition: null,
        movement: [0, 0]
    };
    var zCenter = 50.0;
    var rotationalParam = [0, 0, 0];
    var PI2 = 2 * Math.PI,
        PIBY2 = Math.PI/2,
        PI3BY4 = 3 * Math.PI/4,
        PIBY4 = Math.PI/4;

    var sceneUpdate = true;
    var tickCounter = 0;
    var mlRunItems = 0;

    function initGL(canvas) {
        try {
            minimum = Math.min(innerWidth, innerHeight);
            canvas.setAttribute("width", minimum);
            canvas.setAttribute("height", minimum);
            gl = canvas.getContext("webgl");
            gl.viewportWidth = minimum;
            gl.viewportHeight = minimum;
        } catch (e) {
        }
        if (!gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    }


    function getShader(gl, id) {
        var shaderScript = shaders[id];
        if (!shaderScript) {
            return null;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, shaderScript.source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }


    var shaderProgram;

    function initShaders() {
        if (Object.keys(shaders).length > 0){
            shaderProgram = gl.createProgram();
            for(var id in shaders) {
                gl.attachShader(shaderProgram, getShader(gl, id));
            }
        }

        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    }


    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();

    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }

    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }

    function setMatrixUniforms() {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    }

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    var gridVertexPositionBuffer;
    var gridVertexColorBuffer;
    var axisLinesBuffer;
    var axisColorBuffer;
    var mlLineBuffer;
    var mlColorBuffer;

    function initBuffers() {
        var dataset = createVertices();
        var axis = getAxisSetup(dataset);

        gridVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gridVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataset.vertices), gl.STATIC_DRAW);
        gridVertexPositionBuffer.itemSize = 3;
        gridVertexPositionBuffer.numItems = dataset.vertices.length / gridVertexPositionBuffer.itemSize;

        gridVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gridVertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataset.colors), gl.STATIC_DRAW);
        gridVertexColorBuffer.itemSize = 4;
        gridVertexColorBuffer.numItems = dataset.colors.length / gridVertexColorBuffer.itemSize;

        axisLinesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, axisLinesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis.axisLines), gl.STATIC_DRAW);
        axisLinesBuffer.itemSize = 3;
        axisLinesBuffer.numItems = axis.axisLines.length / axisLinesBuffer.itemSize;

        axisColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis.lineColor), gl.STATIC_DRAW);
        axisColorBuffer.itemSize = 4;
        axisColorBuffer.numItems = axis.lineColor.length / axisColorBuffer.itemSize;

        mlLineBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mlLineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataset.mlRun), gl.STATIC_DRAW);
        mlLineBuffer.itemSize = 3;
        mlLineBuffer.numItems = dataset.mlRun.length / mlLineBuffer.itemSize;
        mlLineBuffer.runLength = 2;

        mlColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mlColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataset.mlColor), gl.STATIC_DRAW);
        mlColorBuffer.itemSize = 4;
        mlColorBuffer.numItems = dataset.mlColor.length / mlColorBuffer.itemSize;
    }

    function getAxisSetup(dataset){
        var lineVertices = [];

        lineVertices = lineVertices.concat([Math.min(dataset.domains.x[0], 0), 0.0, 0.0]);
        lineVertices = lineVertices.concat([Math.max(dataset.domains.x[1]+(dataset.domains.x[1]-dataset.domains.x[0])/8, 0), 0.0, 0.0]);
        lineVertices = lineVertices.concat([0.0, Math.min(dataset.domains.y[0], 0), 0.0]);
        lineVertices = lineVertices.concat([0.0, Math.max(dataset.domains.y[1]+(dataset.domains.y[1]-dataset.domains.y[0])/8, 0), 0.0]);
        lineVertices = lineVertices.concat([0.0, 0.0, Math.min(dataset.domains.z[0], 0)]);
        lineVertices = lineVertices.concat([0.0, 0.0, Math.max(dataset.domains.z[1]+(dataset.domains.z[1]-dataset.domains.z[0])/8, 0)]);

        var color = [
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0
        ];
        return {
            axisLines: lineVertices,
            lineColor: color
        };
    }

    function drawScene() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.lineWidth(1);
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [-10.0, 0.0, -1.5 * zCenter]);
        mat4.rotate(mvMatrix, rotationalParam[0] - PIBY4, [1, 0, 0]);   //Rotate on X
        mat4.rotate(mvMatrix, rotationalParam[1], [0, 1, 0]);           //Rotate on Y
        mat4.rotate(mvMatrix, rotationalParam[2] - PIBY4, [0, 0, 1]);   //Rotate on Z
        setMatrixUniforms();

        gl.bindBuffer(gl.ARRAY_BUFFER, gridVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, gridVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, gridVertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, gridVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, gridVertexPositionBuffer.numItems);


        gl.bindBuffer(gl.ARRAY_BUFFER, axisLinesBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, axisLinesBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, axisColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, axisLinesBuffer.numItems);
    }

    function drawMLRun(){
        gl.lineWidth(2);
        gl.bindBuffer(gl.ARRAY_BUFFER, mlLineBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mlLineBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, mlColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, mlColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, mlLineBuffer.runLength);
    }

    var lastTime = new Date().getTime();

    function tick() {

        if (mlLineBuffer.runLength < mlLineBuffer.numItems){
            var timeNow = new Date().getTime();
            if((timeNow - lastTime) > (2 * Math.pow(mlLineBuffer.runLength, 1.5))) {
                lastTime = timeNow;
                mlLineBuffer.runLength ++;
                sceneUpdate = true;
            }
        }

        if (sceneUpdate) {
            drawScene();
            drawMLRun();
            sceneUpdate = false;
        }
        rotateView();
        requestAnimationFrame(tick);
    }

    function bindMouseAction(){
        $("#graphCanvas").on("mousemove", function(evt){
            if (evt.buttons === 1 || mouseHist.dragging) {
                var position = [
                    evt.pageX - evt.target.offsetLeft,
                    gl.drawingBufferHeight - (evt.pageY - evt.target.offsetTop),
                ];

                if (!mouseHist.dragging) {
                    mouseHist.dragging = true;
                    mouseHist.lastPosition = position;
                    mouseHist.movement = [0, 0];
                } else {
                    mouseHist.movement = [mouseHist.movement[0] + position[0] - mouseHist.lastPosition[0],
                                            mouseHist.movement[1] + position[1] - mouseHist.lastPosition[1]];
                    mouseHist.lastPosition = position;
                }
            }

            if (evt.buttons === 0 && mouseHist.dragging) {
                mouseHist.dragging = false;
            }
        });
    }

    function rotateView(){
        if (mouseHist.movement[0]) {
            rotationalParam[2] = (rotationalParam[2] + Math.atan(mouseHist.movement[0]/zCenter)/8) % PI2;
            sceneUpdate = true;
            mouseHist.movement[0] = 0;
        }

        if (mouseHist.movement[1]) {
            rotationalParam[0] = (rotationalParam[0] - Math.atan(mouseHist.movement[1]/zCenter)/8) % PI2;
            sceneUpdate = true;
            mouseHist.movement[1] = 0;
        }
    }

    function webGLStart() {
        var canvas = document.getElementById("graphCanvas");
        initGL(canvas);
        initShaders()
        initBuffers();
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
        bindMouseAction();
        tick();
    }

    webGLStart();
};
