//stub
function stub(x, y){
    x = x - 10;
    y = y - 10;
    return x*x + y*y + 50;
}

//Stub
function getErrorDataSet(){
    var out = [];
    var i,j;
    var min, max;
    var error;

    for(i=0; i<20; i++){
        for(j=0; j<20; j++){
            error = stub(i,j);
            error = error/20.0;
            max = Math.max(max || error, error);
            min = Math.min(min || error, error);
            out.push([i, j, error]);
        }
    }

    out.xDomain = [0, 20];
    out.xStepSize = 1;
    out.yDomain = [0, 20];
    out.yStepSize = 1;
    out.zColorDomain = [[0.6, 1.0, 0.3, 1.0], [1.0, 0.0, 0.3, 1.0]];
    out.zDomain = [min, max];
    return out;
}

function createVertices() {
    var dataSet = getErrorDataSet();
    var vertices = [];
    var color = [];
    var startX = 2, startY = 4;
    var mlRun = [];

    var xSize = (dataSet.xDomain[1] - dataSet.xDomain[0])/dataSet.xStepSize,
        ySize = (dataSet.yDomain[1] - dataSet.yDomain[0])/dataSet.yStepSize,
        zSize = dataSet.zDomain[1] - dataSet.zDomain[0],
        zStepSize = 1 / zSize,
        colorRange = [
            (dataSet.zColorDomain[1][0] - dataSet.zColorDomain[0][0]),
            (dataSet.zColorDomain[1][1] - dataSet.zColorDomain[0][1]),
            (dataSet.zColorDomain[1][2] - dataSet.zColorDomain[0][2]),
            (dataSet.zColorDomain[1][3] - dataSet.zColorDomain[0][3])
        ];

    var i, j, z, index, colorSteps;

    mlRun = mlRun.concat(dataSet[startX * ySize + startY]);
    mlColor = [1.0, 1.0, 1.0, 1.0];

    for(i = 0; i < xSize; i++){
        vertices = vertices.concat(dataSet[i * ySize]);
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
        for(j = 0; j < ySize; j++){
            index = i * ySize + j;
            z = dataSet[index][2];
            singularSteps = (z - dataSet.zDomain[0]) * zStepSize;
            vertices = vertices.concat(dataSet[index]);
            color = color.concat([
                dataSet.zColorDomain[0][0] + colorRange[0] * singularSteps,
                dataSet.zColorDomain[0][1] + colorRange[1] * singularSteps,
                dataSet.zColorDomain[0][2] + colorRange[2] * singularSteps,
                dataSet.zColorDomain[0][3] + colorRange[3] * singularSteps
            ]);
            if (Math.abs(startX - i) < 5 && Math.abs(startY - j) < 5 && z < mlRun[mlRun.length - 1]) {
                startX = i;
                startY = j;
                mlRun = mlRun.concat([startX, startY, dataSet[startX * ySize + startY][2]+0.1]);
                mlColor = mlColor.concat([1.0, 1.0, 1.0, 1.0]);
            }
        }
        vertices = vertices.concat(dataSet[i * ySize + ySize - 1]);
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
    }
    for(j = ySize; j > 0; j--){
        index = (xSize - 1) * (ySize + 2) + j;
        vIndex = index * 3;
        cIndex = index * 4;
        for(var k = 0; k < 3; k++){
            vertices.push(vertices[vIndex + k]);
        }
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
        //Transpose
        for(i = xSize - 1; i >= 0; i--){
            index = i * (ySize + 2) + j;
            vIndex = index * 3;
            cIndex = index * 4;
            for(var k = 0; k < 3; k++){
                vertices.push(vertices[vIndex + k]);
            }
            for(var k = 0; k < 4; k++){
                color.push(color[cIndex + k]);
            }
        }

        index = j;
        vIndex = index * 3;
        cIndex = index * 4;
        for(var k = 0; k < 3; k++){
            vertices.push(vertices[vIndex + k]);
        }
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
    }
    return {
        vertices: vertices,
        colors: color,
        domains: {
            x: dataSet.xDomain,
            y: dataSet.yDomain,
            z: dataSet.zDomain
        },
        mlRun: mlRun,
        mlColor: mlColor
    };
}