function ObjectDetect() {
  const video = document.querySelector("video");

  let model;
  const cameraMode = "environment";

  const startVideoStreamPromise = navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        facingMode: cameraMode,
      },
    })
    .then(function (stream) {
      return new Promise(function (resolve) {
        video.srcObject = stream;
        video.onloadeddata = function () {
          video.play();
          resolve();
        };
      });
    });

  const publishableKey = "rf_tVBVnsjmjZd5Xec8PP81rMRadDN2";
  const toLoad = {
    model: "detect-hfwhm",
    version: 2,
  };

  const loadModelPromise = new Promise(function (resolve, reject) {
    roboflow
      .auth({
        publishable_key: publishableKey,
      })
      .load(toLoad)
      .then(function (m) {
        model = m;
        resolve();
      });
  });

  Promise.all([startVideoStreamPromise, loadModelPromise]).then(function () {
    document.body.classList.remove("loading");
    resizeCanvas();
    detectFrame();
  });

  let canvas, ctx;
  const font = "16px sans-serif";

  function videoDimensions(video) {
    const videoRatio = video.videoWidth / video.videoHeight;
    let width = video.offsetWidth,
      height = video.offsetHeight;

    const elementRatio = width / height;

    if (elementRatio > videoRatio) {
      width = height * videoRatio;
    } else {
      height = width / videoRatio;
    }

    return {
      width: width,
      height: height,
    };
  }

  window.addEventListener("resize", function () {
    resizeCanvas();
  });

  const resizeCanvas = function () {
    const existingCanvas = document.querySelector("canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }

    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");

    const dimensions = videoDimensions(video);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.style.width = dimensions.width + "px";
    canvas.style.height = dimensions.height + "px";
    canvas.style.left = (window.innerWidth - dimensions.width) / 2 + "px";
    canvas.style.top = (window.innerHeight - dimensions.height) / 2 + "px";

    document.body.appendChild(canvas);
  };

  const renderPredictions = function (predictions) {
    const dimensions = videoDimensions(video);
    const scale = 1;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x;
      const y = prediction.bbox.y;
      const width = prediction.bbox.width;
      const height = prediction.bbox.height;

      ctx.strokeStyle = prediction.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        width / scale,
        height / scale
      );

      ctx.fillStyle = prediction.color;
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        textWidth + 8,
        textHeight + 4
      );
    });

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x;
      const y = prediction.bbox.y;
      const width = prediction.bbox.width;
      const height = prediction.bbox.height;

      ctx.font = font;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#000000";
      const object = prediction.class;

      if (object == 1) {
        prediction.class = "Knife";
      }
      console.log(prediction.class, "Was Detected");

      var frameNumber = 0;

      if (prediction.class === "Knife") {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        const dataURL = tempCanvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = dataURL;
        a.download = `knife_detection_frame_${frameNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Increment the frame number
        frameNumber++;
      }

      ctx.fillText(
        prediction.class,
        (x - width / 2) / scale + 4,
        (y - height / 2) / scale + 1
      );
    });
  };

  let prevTime;
  let pastFrameTimes = [];
  const detectFrame = function () {
    if (!model) return requestAnimationFrame(detectFrame);

    model
      .detect(video)
      .then(function (predictions) {
        requestAnimationFrame(detectFrame);
        renderPredictions(predictions);

        if (prevTime) {
          pastFrameTimes.push(Date.now() - prevTime);
          if (pastFrameTimes.length > 30) pastFrameTimes.shift();

          var total = 0;
          pastFrameTimes.forEach(function (t) {
            total += t / 1000;
          });

          var fps = pastFrameTimes.length / total;
          // Assuming you have an element with id 'fps'
          document.getElementById("fps").innerText = Math.round(fps);
        }
        prevTime = Date.now();
      })
      .catch(function (e) {
        console.log("CAUGHT", e);
        requestAnimationFrame(detectFrame);
      });
  };
}
