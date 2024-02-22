<script setup lang="ts">
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { ref, watch, watchEffect } from 'vue';

const ratioToHex16 = (f: number) => {
    if (f < 0) return '00';
    if (f > 1) return 'ff';
    const hex = Math.floor(f * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
}

const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
        runtime: 'tfjs',
        enableSmoothing: true,

    });
let captureStream = ref<MediaStream | false>(false);
let videoElement = ref<HTMLVideoElement | false>(false);
let poseDetectionIsRunning = ref(false);
let canvasElement = ref<HTMLCanvasElement | false>(false);
let context: CanvasRenderingContext2D | null = null;
let drawnPoints = ref(0);

const resizeCanvas = () => {
    if (!canvasElement.value) return;
    const video = videoElement.value;
    if (!video) return;
    canvasElement.value.width = video.videoWidth;
    canvasElement.value.height = video.videoHeight;
}

const startCapture = async () => {
    try {
        captureStream.value =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: 480,
                    height: 480,

                },
                audio: false,
            });


    } catch (err) {
        console.error(`Error: ${err}`);
    }
}


watchEffect(async () => {
    if (!captureStream.value) return;
    if (!videoElement.value) return;
    videoElement.value.srcObject = captureStream.value;
    await videoElement.value.load();
    await videoElement.value.play();
    poseDetectionIsRunning.value = true;
});

let requestedAnimationFrame: number | null = null;
let requestedVideoFrame: number | null = null;
watch(poseDetectionIsRunning, async (isRunning) => {
    if (isRunning) {
        drawFrame();
        detectorFrame();
    } else {
        cancelAnimationFrame(requestedAnimationFrame!);
        requestedAnimationFrame = null;
        if (videoElement.value) {
            videoElement.value?.cancelVideoFrameCallback(requestedVideoFrame!);
        }
    }
});


const linesMan = (() => {
    let points: { [key: string]: [number, number] } = {};
    const keypoint = (name: string, x: number, y: number) => {
        points[name] = [x, y];
    }
    const tryPoint = (from: string, to: string): [number, number, number, number] | false => {
        if (points[from] && points[to]) {
            return [points[from][0], points[from][1], points[to][0], points[to][1]];
        }
        return false;
    }
    const reset = () => {
        points = {};
    }
    const getLines = () => {
        const lines: [number, number, number, number][] = [];
        for (const [from, to] of [
            ['left_ear', 'right_ear'],
            ['left_eye', 'right_eye'],
            ['left_shoulder', 'right_shoulder'],
            ['right_shoulder', 'right_hip'],
            ['left_shoulder', 'left_hip'],
            ['left_elbow', 'left_shoulder'],
            ['left_elbow', 'left_wrist'],
            ['right_elbow', 'right_shoulder'],
            ['right_elbow', 'right_wrist'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle'],
        ]) {
            const tp = tryPoint(from, to);
            if (tp) {
                lines.push(tp);
            }
        }
        return lines;
    }
    return { keypoint, getLines, reset };
})()

let videoFrameCallbackSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
if(!videoFrameCallbackSupported){
    console.log('requestVideoFrameCallback not supported, using requestAnimationFrame instead.');
}
const detectorFrame = async () => {
    if (!videoElement.value) return;
    if (!captureStream.value) return;
    const video = videoElement.value;
    if (!video) return;
    const estimationConfig = {
        flipHorizontal: false,
        maxPoses: 1,
        scoreThreshold: 0.9,

    }

    if (video.readyState < 2) {
        await new Promise((resolve) => {
            console.log('waiting for video to load');
            video.onloadeddata = () => {
                resolve(video);
            };
        });
    }
    const poses = await detector.estimatePoses(video, estimationConfig);

    linesMan.reset();


    for (const pose of poses) {
        drawnPoints.value = pose.keypoints.length;
        const keypoints = pose.keypoints;
        for (const keypoint of keypoints) {
            if (!keypoint.score) continue;
            // context.fillStyle = `#FF0000${ratioToHex16(keypoint.score)}`;
            if (!isNaN(keypoint.x) && !isNaN(keypoint.y) && keypoint.name) {
                // skip kp outside screen
                if (keypoint.x < 0 || keypoint.x > video.videoWidth) continue;
                if (keypoint.y < 0 || keypoint.y > video.videoHeight) continue;
                if (keypoint.score < 0.3) continue;

                // context.fillText(`${keypoint.name}`, keypoint.x + 10, keypoint.y + 5);
                // context.beginPath();
                // context.arc(keypoint.x, keypoint.y, 5, 0, Math.PI * 2);
                // context.fill();
                linesMan.keypoint(keypoint.name, keypoint.x, keypoint.y);
            }

        }
    }
    if (poseDetectionIsRunning.value) {
        if (videoFrameCallbackSupported) {
            requestedVideoFrame = video.requestVideoFrameCallback(detectorFrame);
        } else {
            // requestedVideoFrame = requestAnimationFrame(detectorFrame);
        }
    }else{
        console.log('stopped running');
    }

}
const drawFrame = async () => {
    if (!captureStream.value) return;
    if (!canvasElement.value) return;

    if (!context) {
        context = canvasElement.value.getContext('2d');
    }
    if (!context) return;

    if(!videoFrameCallbackSupported){
        detectorFrame();
    }

    context.strokeStyle = '#00FF00';
    context.lineWidth = 2;
    context.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
    const segments = linesMan.getLines();
    for (const segment of segments) {
        context.beginPath();
        context.moveTo(segment[0], segment[1]);
        context.lineTo(segment[2], segment[3]);
        context.stroke();
    }
    if (poseDetectionIsRunning.value) {
        requestedAnimationFrame = requestAnimationFrame(drawFrame);
    }
}

watchEffect(() => {
    if (videoElement.value) {
        videoElement.value.addEventListener('loadedmetadata', resizeCanvas);
    }
});

watchEffect(() => {
    if (canvasElement.value) {
        resizeCanvas();
    }
});

</script>
<template>
    <div>
        <template v-if="captureStream">
            <div class="viewport">
                <video ref="videoElement" autoplay></video>
                <canvas ref="canvasElement"></canvas>
                <!-- {{ poseDetectionIsRunning }}, {{ drawnPoints }} -->
            </div>
        </template>
        <template v-else>
            <button @click="startCapture">Start Capture</button>
        </template>
    </div>
</template>

<style scoped>
.viewport {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
}

.viewport * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>
