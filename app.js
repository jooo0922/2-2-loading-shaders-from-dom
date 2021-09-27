"use strict";

let gl, canvas, shaderProgram, vertexBuffer;

function createGLContext(canvas) {
  const names = ["webgl", "experimental-webgl"];
  let context = null;

  for (let i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch (error) {}

    if (context) {
      break;
    }
  }

  if (context) {
  } else {
    alert("Failed to create WebGL context!");
  }

  return context;
}

function loadShaderFromDOM(id) {
  const shaderScript = document.getElementById(id); // 셰이더 코드가 담긴 script 태그를 가져옴.

  if (!shaderScript) {
    return null; // 해당 id로 셰이더 코드 script를 찾을 수 없으면 shader 객체 대신 null을 리턴하고 함수를 끝냄.
  }

  let shaderSource = ""; // 이 변수에 반복문으로 script 태그안에 있는 셰이더 코드를(즉, TEXT_NODE) 계속 결합해서 넣어줄거임.
  let currentChild = shaderScript.firstChild; // 해당 script 태그에 작성된 셰이더 코드 전체, 즉 TEXT_NODE가 리턴될거임.
  while (currentChild) {
    if (currentChild.nodeType === 3) {
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  } // script 태그의 자식 노드들을 순회하면서 셰이더 코드를 문자열로 만듦. -> 근데 자식노드가 TEXT_NODE 하나라서 반복문이 한번만 돌게 됨...

  // 여기서부터는 예제 2-1의 loadShader 함수에서 해줬던 셰이더 객체 생성, 셰이더 소스코드 로드, 컴파일, 객체 리턴 등의 작업을 똑같이 해준다고 보면 됨.
  let shader;
  if (shaderScript.type === "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else if (shaderScript.type === "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else {
    return null; // 해당하는 타입이 없다면 shader 객체 대신 null을 리턴하고 함수를 끝냄.
  } // script 태그의 type 속성값에 따라 vertexShader 또는 fragmentShader 객체를 생성함.

  gl.shaderSource(shader, shaderSource); // 셰이더 소스코드를 셰이더 객체로 로드
  gl.compileShader(shader); // 셰이더 컴파일

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("Error compiling shader" + gl.getShaderInfoLog(shader)); // 컴파일링이 실패했다는 메시지를 던짐
    gl.deleteShader(shader); // 컴파일이 실패한 셰이더의 객체는 지워버림
    return null; // 셰이더 대신 null을 리턴해주고 함수를 끝냄
  }

  return shader; // 컴파일까지 성공한 셰이더일 경우 최종적으로 리턴해 줌.
}

function setupShaders() {
  const vertexShader = loadShaderFromDOM("shader-vs");
  const fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram(); // WebGLProgram 객체 생성(하단의 관련 정리 참고)
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader); // 컴파일된 각각의 셰이더 객체를 프로그램 객체에 붙임
  gl.linkProgram(shaderProgram); // attach한 각각의 vertexShader와 fragmentShader를 link(연결)해서 GPU가 사용할 코드를 준비함.

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram); // GPU가 link에 성공한 WebGLProgram을 사용하여 렌더링 작업을 실행하도록 함.

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );
}

function setupBuffers() {
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  const triangleVertices = [0.0, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0];
  // const triangleVertices = [0.0, 0.5, 1.1, -0.5, -0.5, 1.1, 0.5, -0.5, 1.1];
  /**
   * 삼각형의 각 버텍스들의 z좌표값에 변화를 줘서 삼각형을 없애는 방법
   *
   * 지금 clip space의 z좌표값의 최대값 ~ 최소값은 1 ~ -1 이겠지?
   * 그렇다면, 그것이 하나의 절두체라고 가정을 하면,
   * 세 좌표값이 모두 z축을 기준으로 절두체를 벗어나려면 z좌표값의 절댓값을 모두 1이 넘는 값으로 지정해주면 됨.
   *
   * 셋 중에 하나라도 1보다 작으면 마치
   * 그 버텍스는 절두체 내에 들어와있는 상태이기 때문에
   * 나머지 절두체를 벗어난 버텍스들이 절두체 내부의 버텍스들과 연결되기 때문에
   * 삼각형이 z축을 따라 기울어진 형태로 일부분만 보이는 것이
   * 2d 평면 상에서는 왜곡된 삼각형이 보이게 되는 것임.
   *
   * 그러나 실제로는 두 버텍스는 절두체를 벗어나서 보이지가 않고,
   * 절두체를 벗어나지 못한 버텍스에 연결된 일부분만 보이는 것이지!
   *
   * 그래서 삼각형이 아예 안보이게 하려면 세 버텍스의 z좌표값의 절대값이 모두 1이 넘기만 하면 됨!
   */
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(triangleVertices),
    gl.STATIC_DRAW
  );

  vertexBuffer.itemSize = 3;
  vertexBuffer.numberOfItems = 3;
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width / 2, gl.canvas.height / 2);
  gl.clear(gl.COLOR_BUFFER_BIT); // gl.clearColor()로 지정한 색상값으로 색상 버퍼를 채워줌. 즉, 싹 한번 해당 색으로 덮어준다는 것.

  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    vertexBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numberOfItems);
}

function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = WebGLDebugUtils.makeDebugContext(createGLContext(canvas));
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 1.0, 0.0, 1.0); // draw 함수에서 캔버스 전체를 clear할 때 사용할 색상값을 지정한 것.
  draw();
}

/**
 * 참고로 예제 2-1에서 부정확하게 정리한 부분을 수정하자면,
 *
 * createGLContext에서 try...catch 문법을 사용하는 이유는
 * 'webgl'과 'experimental-webgl'을 둘 다 지원하지 않는 경우만을 위한 것이 아니라,
 * 애초에 'webgl'에서부터 지원하지 않으면 getContext() 메서드에서 에러가 발생하기 때문에
 * 다음 반복문으로 넘어가지 못하고 스크립트가 죽어버림.
 *
 * 둘 다 지원하건, 아니면 'experimental-webgl'만 지원하건
 * 어쨋든 getContext() 메서드에서 에러가 나서
 * 다음 반복문 또는 다음 라인으로 스크립트가 넘어가지 못하는 것을 방지하기 위해
 * try...catch를 써줬다고 이해하는 것이 더 정확함!
 */

/**
 * loadShaderFromDOM() 함수에서 script 태그에 작성된 셰이더 코드를 가져오는 방법.
 *
 * 일단 document.getElementById() 를 이용해서 script 태그를 가쟈온 뒤,
 * Node.nodeType 라는 해당 DOM 노드의 유형을 정수값으로 할당한 property를 가져와서
 * 반복문을 돌려 각각의 자식노드들이 텍스트인지 구별하도록 해줌.
 * (참고로 Node.TEXT_NODE 라면 3을 할당받게 되어있음.)
 *
 * 그래서 텍스트가 맞다면 Node.textContent(문자열이겠지!)를 shaderSource 라는 빈 문자열만 담긴 변수에
 * 계속 += 해줌으로써 문자열로 변환된 셰이더 코드들을 계속 이어서 만들어 줌.
 *
 * 근데 여기서는 각각의 script 태그들의 자식노드가 셰이더 코드 1개 밖에 없기 때문에
 * 반복문이 한 번만 돌게 되고, 마지막에 호출된 currentChild.nextSibling;
 * 즉, 두 번째 자식노드(형제노드)부터는 값이 존재하지 않으므로(자식노드가 1개니까!)
 * 다음 반복문은 while의 조건문에 맞지 않기 때문에 실행되지 않겠지!
 *
 * 어쨌거나 저 함수를 이용해서 script 태그 안에 셰이더 코드들을 문자열로 변환하여
 * shaderSource라는 변수 안에 넣어놓을 수 있게 된 것!
 */

/**
 * 셰이더 컴파일
 *
 * gl.compileShader(shader); 를 이용해서 셰이더를 컴파일한다는 것은,
 * 정확히 말하면 shader 객체에 로드된 GLSL shader 언어를
 * WebGLProgram 객체를 만드는 데 필요한 binary data로 변환한다는 뜻!
 *
 * 여기서 WebGLProgram 객체란,
 * 바이너리 데이터로 컴파일된 VertexShader와 FragmentShader가 결합된 WebGLShader 를 의미함.
 * GPU는 이 컴파일된 WebGLProgram을 받아서 사용(즉, 렌더링)한다고 보면 됨.
 * WebGL의 실행단위라고도 볼 수 있음.
 */

/**
 * gl.getShaderInfoLog(shader)
 *
 * 인자로 전달한 셰이더 객체의 정보 로그를 DOMString 형태의 메시지로 리턴해 줌.
 * 경고, 디버깅, 컴파일 정보 관련된 내용들이 들어있음.
 *
 * 그니까 이 예제에서는 해당 셰이더 객체가 컴파일에 실패했을때
 * getShaderInfoLog 메서드를 호출되는 거니까 '컴파일이 실패했다' 뭐 이런 메시지를 던지겠지
 */

/**
 * gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) 는
 * gl.getShaderParameter(shader, gl.COMPILE_STATUS) 와 마찬가지로
 * 전달해 준 WebGLProgram 객체에 대한 정보를 리턴해 줌.
 *
 * GLenum을 통해 요청받은 정보의 결과값을 리턴해주며,
 * gl.LINK_STATUS는 당연히 해당 WebGLProgram의 마지막 link operation이 제대로 작동됬는지 여부에 따라
 * GLboolean 값을 리턴해준다고 함.
 */

/**
 * gl.getAttribLocation(WebGLProgram, 'attribute 변수의 이름')
 *
 * vertexShader의 attribute 변수가 버퍼의 데이터를 읽어오는 방법을 알려주기 위해,
 * 주어진 WebGLProgram 객체 내에 연결된 vertexShader 안의 attribute 변수의 위치를 얻어온 다음
 * shaderProgram에 임의의 프로퍼티를 만들어서 거기에 저장해놓은 것!
 */

/**
 * 버퍼란 무엇인가?
 *
 * 버퍼는 vertex 관련 데이터들을 GPU에 전달하는 방식이라고 볼 수 있음.
 * 이것은 WebGP API로 수행할 수 있음.
 *
 * 1. gl.createBuffer()는 새로운 버퍼 객체를 생성하는 것이고,
 *
 * 2. gl.bindBuffer()는 생성된 버퍼를 gl.ARRAY_BUFFER 처럼 버텍스 좌표, 텍스트 좌표, 컬러 등의
 * vertex attribute를 포함하는 버퍼 객체를 이용해서 작업할 버퍼로 지정하는 메서드임.
 * -> '작업할 버퍼'로 지정이 되었다는 뜻은,
 * "지금부터 vertexShader의 attribute가 참조할 버퍼는 이겁니다" 라고 알려주는 것.
 * 그러니 attribute는 해당 버퍼에 기록된 데이터들(여기서는 triangleVertices)도 사용할 수 있게 되는 거겠지!
 *
 * 3. gl.bufferData()는 작업할 버퍼로 지정된 버퍼에 버텍스 데이터,
 * 즉, 여기서는 Float32Array()로 변환된 형식화 배열안에 담긴 triangleVertices 의 데이터를 기록해주는 것.
 */

/**
 * gl.vertexAttribPointer()
 *
 * 이거는 뭐냐면 vertexShader의 attribute가 바인딩된 버퍼의 데이터를 어떻게 가져올 지 지시하는 역할을 수행함!
 * 총 6개의 인자를 받고 있으며 각각은 아래와 같음.
 *
 * 1. attribute의 위치
 * 2. vertex 하나당 몇 개를 가져올건지 개수(여기서는 3개로 저장해놨었지?)
 * 3. 버퍼의 데이터를 어떤 타입으로 해석하고 계산할건지? 즉 float(부동소수점 실수)로 해석한다는 거겠지
 * 4. 정규화 플래그. true면 버퍼의 데이터가 float이 아니면 float으로 변환하도록 함.
 * 이미 float이면 변환할 필요가 없으니 false로 전달해도 되겠지.
 * 5. strideToNextPieceOfData. 즉, 하나의 데이터 조각에서 다음 데이터 조각을 가져오기 위해 건너 뛰어야 하는 바이트 수
 * 6. 버퍼의 데이터를 어디서부터 읽기 시작할 지 설정함.
 *
 * 보통 5, 6은 0이 들어가며 0이 아닌 값이 들어가면 복잡하고 성능 면에서 별다른 이득이 없기 때문에
 * 되도록 둘 다 0으로 지정해주는 게 맞음.
 */

/**
 * gl.enableVertexAttribArray()
 *
 * 해당 attribute의 위치(?)를 사용할 수 있도록 해줌. 활성화한다고 보면 됨.
 */
