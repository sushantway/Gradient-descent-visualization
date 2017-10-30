window.shaders= {};

shaders["shader-fs"] = {
    type: "x-shader/x-fragment",
    source: "\
    precision mediump float;\
    \
    varying vec4 vColor;\
    \
    void main(void) {\
        gl_FragColor = vColor;\
    }"
};

shaders["shader-vs"] = {
    type: "x-shader/x-vertex",
    source: "\
    attribute vec3 aVertexPosition;\
    attribute vec4 aVertexColor;\
    \
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    \
    varying vec4 vColor;\
    \
    void main(void) {\
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
        vColor = aVertexColor;\
    }"
};